import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiRequest } from '../api';

export const STAGES = [
  { key: 'verifying', label: 'Verifying Access', icon: '🔐' },
  { key: 'parsing', label: 'Parsing Scan Data', icon: '🔍' },
  { key: 'ai_analysis', label: 'AI Analysis', icon: '🤖' },
  { key: 'version_resolution', label: 'Resolving Versions', icon: '📦' },
  { key: 'dry_run', label: 'Generating Preview', icon: '👁️' },
  { key: 'branch_creation', label: 'Creating Branch', icon: '🌿' },
  { key: 'patching', label: 'Applying Patches', icon: '🔧' },
  { key: 'committing', label: 'Committing Changes', icon: '💾' },
  { key: 'pr_creation', label: 'Opening Pull Request', icon: '🚀' },
  { key: 'complete', label: 'Complete', icon: '✅' },
];

const initialState = {
  status: 'idle',
  stage: null,
  progress: 0,
  message: '',
  logs: [],
  patches: null,
  diffPreviews: null,
  prTitle: null,
  prDescription: null,
  commitMessage: null,
  aiSummary: null,
  aiExplanations: {},
  rollbackWarnings: {},
  prUrl: null,
  prNumber: null,
  commitSha: null,
  branchName: null,
  error: null,
  errorCode: null,
  retryable: false,
  needsReAuth: false,
  jobId: null,
  room: null,
  isDryRun: true,
  currentVuln: null,
  patchCount: 0,
};

export function useRemediation(accessToken) {
  const [state, setState] = useState(initialState);
  const socketRef = useRef(null);
  const roomRef = useRef(null);

  // Create a persistent socket connection
  useEffect(() => {
    const token = accessToken || localStorage.getItem('devpulse_token');
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    const socket = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('remediation:progress', (data) => {
      setState((prev) => ({
        ...prev,
        stage: data.stage,
        progress: data.progress,
        message: data.message,
        currentVuln: data.currentVuln || prev.currentVuln,
        logs: [...prev.logs, { ...data, ts: Date.now() }].slice(-100),
        // Accumulate patches as they arrive
        ...(data.patches ? { patches: data.patches, patchCount: data.patches.length } : {}),
      }));
    });

    socket.on('remediation:dry_run_complete', (data) => {
      setState((prev) => ({
        ...prev,
        status: 'dry_run_complete',
        progress: 100,
        patches: data.patches,
        patchCount: data.patchCount,
        diffPreviews: data.diffPreviews,
        prTitle: data.prTitle,
        prDescription: data.prDescription,
        commitMessage: data.commitMessage,
        aiSummary: data.aiSummary,
        aiExplanations: data.aiExplanations || {},
        rollbackWarnings: data.rollbackWarnings || {},
        branchName: data.branchName,
      }));
    });

    socket.on('remediation:complete', (data) => {
      if (data.success) {
        setState((prev) => ({
          ...prev,
          status: 'complete',
          progress: 100,
          prUrl: data.prUrl,
          prNumber: data.prNumber,
          prTitle: data.prTitle,
          commitSha: data.commitSha,
          branchName: data.branchName,
          patches: data.patches || prev.patches,
          patchCount: data.patchCount || prev.patchCount,
          aiSummary: data.aiSummary || prev.aiSummary,
          aiExplanations: data.aiExplanations || prev.aiExplanations,
          rollbackWarnings: data.rollbackWarnings || prev.rollbackWarnings,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: data.message || data.reason,
          errorCode: data.reason,
        }));
      }
    });

    socket.on('remediation:error', (data) => {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: data.message,
        errorCode: data.code,
        retryable: data.retryable,
        needsReAuth: data.code === 'INSUFFICIENT_GITHUB_SCOPE',
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const subscribeToRoom = useCallback((room) => {
    if (!socketRef.current || !room) return;
    if (roomRef.current) {
      socketRef.current.emit('unsubscribe', roomRef.current);
    }
    roomRef.current = room;
    socketRef.current.emit('subscribe', room);
  }, []);

  const startDryRun = useCallback(
    async (repositoryFullName, scanData, targetVulnIds = []) => {
      setState({ ...initialState, status: 'running', isDryRun: true });

      try {
        const encodedScanData = btoa(encodeURIComponent(JSON.stringify(scanData)));

        const response = await apiRequest('/api/remediation/generate', {
          accessToken,
          method: 'POST',
          body: JSON.stringify({ repositoryFullName, encodedScanData, targetVulnIds, isDryRun: true }),
          retry: false,
        });

        setState((prev) => ({ ...prev, jobId: response.jobId, room: response.room }));
        subscribeToRoom(response.room);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err.message,
          errorCode: err.data?.code || 'REQUEST_FAILED',
        }));
      }
    },
    [accessToken, subscribeToRoom],
  );

  const confirmAndCreatePR = useCallback(
    async (repositoryFullName, scanData, targetVulnIds = []) => {
      setState((prev) => ({
        ...prev,
        status: 'running',
        isDryRun: false,
        progress: 0,
        stage: null,
        logs: [],
        error: null,
      }));

      try {
        const encodedScanData = btoa(encodeURIComponent(JSON.stringify(scanData)));

        const response = await apiRequest('/api/remediation/confirm', {
          accessToken,
          method: 'POST',
          body: JSON.stringify({ repositoryFullName, encodedScanData, targetVulnIds }),
          retry: false,
        });

        setState((prev) => ({ ...prev, jobId: response.jobId, room: response.room }));
        subscribeToRoom(response.room);
      } catch (err) {
        const errorCode = err.data?.code;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err.message,
          errorCode,
          needsReAuth: errorCode === 'INSUFFICIENT_GITHUB_SCOPE',
        }));
      }
    },
    [accessToken, subscribeToRoom],
  );

  const analyseVulnerabilities = useCallback(
    async (scanData, targetVulnIds = []) => {
      try {
        const encodedScanData = btoa(encodeURIComponent(JSON.stringify(scanData)));

        return await apiRequest('/api/remediation/analyse', {
          accessToken,
          method: 'POST',
          body: JSON.stringify({ encodedScanData, targetVulnIds }),
          retry: false,
        });
      } catch {
        return null;
      }
    },
    [accessToken],
  );

  const reset = useCallback(() => {
    if (socketRef.current && roomRef.current) {
      socketRef.current.emit('unsubscribe', roomRef.current);
    }
    roomRef.current = null;
    setState(initialState);
  }, []);

  return {
    ...state,
    STAGES,
    startDryRun,
    confirmAndCreatePR,
    analyseVulnerabilities,
    reset,
  };
}
