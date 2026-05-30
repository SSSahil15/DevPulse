import { createContext, useState, useEffect, useDeferredValue } from 'react';
import { apiRequest, ApiError } from '../api';

export const DashboardContext = createContext();

export function DashboardProvider({ children, accessToken, user, onSessionExpired }) {
  const STORAGE_KEY = `devpulse_last_repo_${user?.id}`;

  const [repositories, setRepositories] = useState([]);
  const [repoState, setRepoState] = useState({ error: '', status: 'loading' });
  const [analysisState, setAnalysisState] = useState({
    error: '',
    status: 'idle',
    targetRepositoryId: null,
    jobStatus: null,
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [sidebarTab, setSidebarTab] = useState('repos');
  const [sidebarHistory, setSidebarHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Live scan state ───────────────────────────────────────────────────────
  // scanRoom:    the Socket.IO room for the active scan
  // isLiveScanning: true while the LiveScanConsole is visible
  // scanTrigger: 'analyze' | 'simulate' | null — which button started the scan
  const [scanRoom, setScanRoom] = useState(null);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(null);

  useEffect(() => {
    setAnalysisResult(null);
    setSessionData(null);
    setAnalysisState({ error: '', status: 'idle', targetRepositoryId: null, jobStatus: null });
    // Clear live scan state when repo selection changes
    setScanRoom(null);
    setIsLiveScanning(false);
    setScanTrigger(null);
  }, [selectedRepositoryId]);

  async function fetchSidebarHistory() {
    setHistoryLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await apiRequest('/api/pipeline/results?limit=100', { accessToken });
      setSidebarHistory(data.results || []);
    } catch (err) {
      console.error('Failed to refresh scan history', err);
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.('Session expired.');
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteRecord(id) {
    try {
      await apiRequest(`/api/pipeline/results/${id}`, { accessToken, method: 'DELETE' });
      setSidebarHistory((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    try {
      await apiRequest(`/api/pipeline/results`, {
        accessToken,
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      setSidebarHistory((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk delete failed', err);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  useEffect(() => {
    try {
      if (selectedRepositoryId) {
        localStorage.setItem(STORAGE_KEY, String(selectedRepositoryId));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [selectedRepositoryId, STORAGE_KEY]);

  useEffect(() => {
    let live = true;
    async function load() {
      setRepoState({ error: '', status: 'loading' });
      try {
        const data = await apiRequest('/repos', { accessToken });
        if (!live) return;
        setRepositories(data.repositories);
        setRepoState({ error: '', status: 'success' });
        if (data.repositories.length > 0)
          setSelectedRepositoryId((c) => c || data.repositories[0].id);
      } catch (err) {
        if (!live) return;
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.('Session expired.');
          return;
        }
        setRepoState({ error: err.message, status: 'error' });
      }
    }
    load();
    return () => {
      live = false;
    };
  }, [accessToken, onSessionExpired, user?.id]);

  useEffect(() => {
    if (accessToken) fetchSidebarHistory();
  }, [accessToken]);

  async function handleAnalyze(repo) {
    if (!repo || isLiveScanning) return;
    setAnalysisState({
      error: '',
      status: 'loading',
      targetRepositoryId: repo.id,
      jobStatus: null,
    });
    setSelectedRepositoryId(repo.id);
    const optimisticRoom = `scan_${repo.fullName}`;
    setScanRoom(optimisticRoom);
    setIsLiveScanning(true);
    setScanTrigger('analyze');

    try {
      const data = await apiRequest('/analyze', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ repositoryFullName: repo.fullName }),
      });

      // Backend confirms the room — update if different (should match optimistic)
      if (data.room) setScanRoom(data.room);

      setAnalysisState({
        error: '',
        status: 'loading',
        targetRepositoryId: repo.id,
        jobStatus: 'queued',
        jobId: data.jobId,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.('Session expired.');
        return;
      }
      setAnalysisState({
        error: err.message,
        status: 'error',
        targetRepositoryId: repo.id,
        jobStatus: null,
      });
      setIsLiveScanning(false);
      setScanRoom(null);
      setScanTrigger(null);
    }
  }

  /**
   * Trigger a CI/CD simulation scan with live streaming.
   * Opens the LiveScanConsole and POSTs to /api/pipeline/simulate.
   * The old polling stepper in AnalysisPanel is bypassed.
   */
  async function handleSimulate(repo) {
    if (!repo || isLiveScanning) return; // Prevent double-clicks bypassing React state
    const room = `scan_${repo.fullName}`;
    setScanRoom(room);
    setIsLiveScanning(true);
    setScanTrigger('simulate');
    setSessionData(null); // clear previous simulate result

    try {
      await apiRequest('/api/pipeline/simulate', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ repositoryFullName: repo.fullName }),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.('Session expired.');
        return;
      }
      setIsLiveScanning(false);
      setScanRoom(null);
      setScanTrigger(null);
      console.error('[DashboardContext] handleSimulate failed:', err.message);
    }
  }

  /** Called by LiveScanConsole when scan.completed arrives */
  function handleLiveScanComplete(data) {
    const trigger = scanTrigger;

    if (trigger === 'simulate') {
      // Simulate result shape: { record: {...} }
      setSessionData(data?.record || data);
    } else {
      // Analyze result shape: { analysis, repository }
      setAnalysisResult(data);
      setAnalysisState({
        status: 'success',
        error: '',
        targetRepositoryId: selectedRepositoryId,
        jobStatus: null,
      });
    }
  }

  /** Called by LiveScanConsole when scan.failed arrives */
  function handleLiveScanFailed(payload) {
    setAnalysisState({
      error: payload?.message || 'Scan failed',
      status: 'error',
      targetRepositoryId: selectedRepositoryId,
      jobStatus: null,
    });
  }

  /** Called when user dismisses the LiveScanConsole */
  function dismissLiveScan() {
    setIsLiveScanning(false);
    setScanRoom(null);
    setScanTrigger(null);

    // If dismissed before completion, reset loading state so the button isn't stuck
    setAnalysisState((prev) => {
      if (prev.status === 'loading') {
        return { ...prev, status: 'idle', jobStatus: null };
      }
      return prev;
    });
  }

  const filteredRepositories = repositories.filter((r) => {
    const hay = `${r.name} ${r.fullName} ${r.language || ''} ${r.description || ''}`.toLowerCase();
    return hay.includes(deferredSearch.trim().toLowerCase());
  });

  const selectedRepo = repositories.find((r) => r.id === selectedRepositoryId) || null;

  return (
    <DashboardContext.Provider
      value={{
        repositories,
        repoState,
        analysisState,
        setAnalysisState,
        analysisResult,
        setAnalysisResult,
        sessionData,
        setSessionData,
        selectedRepositoryId,
        setSelectedRepositoryId,
        searchTerm,
        setSearchTerm,
        sidebarTab,
        setSidebarTab,
        sidebarHistory,
        historyLoading,
        selectedHistoryRecord,
        setSelectedHistoryRecord,
        historySearch,
        setHistorySearch,
        selectedIds,
        setSelectedIds,
        fetchSidebarHistory,
        deleteRecord,
        deleteSelected,
        toggleSelect,
        handleAnalyze,
        handleSimulate,
        filteredRepositories,
        selectedRepo,
        // Live scan
        scanRoom,
        isLiveScanning,
        scanTrigger,
        handleLiveScanComplete,
        handleLiveScanFailed,
        dismissLiveScan,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
