import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Scan lifecycle phases (state machine) ─────────────────────────────────────
export const SCAN_PHASES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CLONING: 'cloning',
  SCANNING: 'scanning',
  AI_ANALYSIS: 'ai_analysis',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

const PHASE_FROM_EVENT = {
  'repository.synced': SCAN_PHASES.CLONING,
  'scan.started': SCAN_PHASES.SCANNING,
  'scan.progress': null, // determined by current_phase field
  'dependency.analyzed': SCAN_PHASES.SCANNING,
  'vulnerability.detected': SCAN_PHASES.SCANNING,
  'ai.analysis.started': SCAN_PHASES.AI_ANALYSIS,
  'ai.analysis.completed': SCAN_PHASES.AI_ANALYSIS,
  'scan.completed': SCAN_PHASES.COMPLETE,
  'scan.failed': SCAN_PHASES.FAILED,
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

const MAX_LOG_ENTRIES = 200; // Rolling terminal log cap
const MAX_VULN_ENTRIES = 500; // Rolling vulnerability feed cap
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000]; // Exponential backoff

/**
 * Production-grade WebSocket hook for real-time scan streaming.
 *
 * @param {string|null} room        Socket.IO room key (e.g. "scan_owner/repo-name")
 * @param {object}      options
 * @param {string}      options.accessToken    JWT token (passed directly — no localStorage read)
 * @param {Function}    options.onScanComplete Called with full result payload
 * @param {Function}    options.onScanFailed   Called with error payload
 */
export function useScanStream(room, { accessToken, onScanComplete, onScanFailed } = {}) {
  const [phase, setPhase] = useState(SCAN_PHASES.IDLE);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [counters, setCounters] = useState({
    filesScanned: 0,
    vulnsFound: 0,
    criticals: 0,
    highs: 0,
    mediums: 0,
    lows: 0,
    aiEvents: 0,
    depsAnalyzed: 0,
  });
  const [events, setEvents] = useState([]); // timeline log
  const [vulnerabilities, setVulnerabilities] = useState([]); // CVE feed
  const [currentMessage, setCurrentMessage] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const [aiSummary, setAiSummary] = useState(null); // populated by ai.analysis.completed

  const socketRef = useRef(null);
  const scanStartRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const roomRef = useRef(room);
  roomRef.current = room;

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  function startElapsedTimer() {
    scanStartRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      if (isMountedRef.current && scanStartRef.current) {
        setElapsedMs(Date.now() - scanStartRef.current);
      }
    }, 250);
  }
  function stopElapsedTimer() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }

  // ── Append to timeline log (rolling window) ───────────────────────────────
  function addLogEntry(envelope) {
    if (!isMountedRef.current) return;
    setEvents((prev) => {
      const entry = {
        id: envelope.eventId,
        event: envelope.event,
        timestamp: envelope.timestamp,
        message: envelope.payload?.message || '',
        payload: envelope.payload,
      };
      const next = [...prev, entry];
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
    });
    setEventIndex((n) => n + 1);
  }

  // ── Handle a single scan:event envelope ──────────────────────────────────
  function handleScanEvent(envelope) {
    if (!isMountedRef.current) return;
    const { event, payload } = envelope;

    addLogEntry(envelope);

    if (payload?.message) setCurrentMessage(payload.message);

    // Resolve phase
    const newPhase = PHASE_FROM_EVENT[event];
    if (newPhase) {
      setPhase(newPhase);
    } else if (event === 'scan.progress' && payload?.current_phase) {
      const p = payload.current_phase;
      if (p === 'cloning') setPhase(SCAN_PHASES.CLONING);
      if (p === 'scanning') setPhase(SCAN_PHASES.SCANNING);
      if (p === 'ai_analysis') setPhase(SCAN_PHASES.AI_ANALYSIS);
      if (p === 'scoring') setPhase(SCAN_PHASES.AI_ANALYSIS); // simulate scoring step
    }

    // Update counters
    switch (event) {
      case 'scan.started':
        startElapsedTimer();
        break;

      case 'scan.progress':
        setCounters((c) => ({
          ...c,
          filesScanned: payload?.files_scanned ?? c.filesScanned,
        }));
        break;

      case 'dependency.analyzed':
        setCounters((c) => ({
          ...c,
          filesScanned: payload?.files_scanned ?? c.filesScanned,
          depsAnalyzed: (c.depsAnalyzed ?? 0) + 1,
        }));
        break;

      case 'vulnerability.detected': {
        const sev = (payload?.severity || 'UNKNOWN').toUpperCase();
        setCounters((c) => ({
          ...c,
          vulnsFound: (c.vulnsFound ?? 0) + 1,
          criticals: sev === 'CRITICAL' ? c.criticals + 1 : c.criticals,
          highs: sev === 'HIGH' ? c.highs + 1 : c.highs,
          mediums: sev === 'MEDIUM' ? c.mediums + 1 : c.mediums,
          lows: sev === 'LOW' ? c.lows + 1 : c.lows,
        }));
        setVulnerabilities((prev) => {
          const entry = { ...payload, id: envelope.eventId, detectedAt: envelope.timestamp };
          const next = [entry, ...prev];
          return next.length > MAX_VULN_ENTRIES ? next.slice(0, MAX_VULN_ENTRIES) : next;
        });
        break;
      }

      case 'ai.analysis.started':
        setCounters((c) => ({ ...c, aiEvents: c.aiEvents + 1 }));
        break;

      case 'ai.analysis.completed':
        setCounters((c) => ({ ...c, aiEvents: c.aiEvents + 1 }));
        // Capture AI result for display in the console right panel
        setAiSummary({
          decision: payload?.decision,
          failureProbability: payload?.failure_probability,
          riskScore: payload?.risk_score,
          suggestionsCount: payload?.suggestions_count ?? 0,
          message: payload?.message,
        });
        break;

      case 'scan.completed':
        stopElapsedTimer();
        break;

      case 'scan.failed':
        stopElapsedTimer();
        if (onScanFailed) onScanFailed(payload);
        break;

      default:
        break;
    }
  }

  // ── Request missed events from server ─────────────────────────────────────
  const replay = useCallback(() => {
    const socket = socketRef.current;
    if (socket && roomRef.current) {
      socket.emit('replay', { room: roomRef.current, sinceIndex: eventIndex });
    }
  }, [eventIndex]);

  // ── Connect / reconnect ───────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!room) return;
    // Use passed accessToken first, fall back to localStorage
    const token = accessToken || localStorage.getItem('devpulse_token');
    if (!token) {
      console.warn('[useScanStream] No auth token — skipping socket connection.');
      return;
    }

    // When VITE_API_URL is empty the app uses a dev proxy on the same origin.
    // Socket.IO needs an explicit host so use window.location.origin as fallback.
    const envUrl = import.meta.env.VITE_API_URL;
    const backendUrl = envUrl && envUrl.trim() ? envUrl.trim() : window.location.origin;

    setPhase(SCAN_PHASES.CONNECTING);
    setIsConnected(false);

    const socket = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket'],
      reconnection: false, // We handle reconnection manually with backoff
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      reconnectCountRef.current = 0;
      setReconnectAttempt(0);
      socket.emit('subscribe', room);
    });

    socket.on('subscribed', () => {
      // Replay any missed events if reconnecting mid-scan
      if (eventIndex > 0) {
        socket.emit('replay', { room, sinceIndex: eventIndex });
      }
    });

    // ── Main event handler ────────────────────────────────────────────────────
    socket.on('scan:event', handleScanEvent);

    // ── Replay batch from server ──────────────────────────────────────────────
    socket.on('replay:events', ({ events: replayBatch }) => {
      if (!isMountedRef.current) return;
      replayBatch.forEach(handleScanEvent);
    });

    // ── Legacy scan:complete (for AnalysisPanel backward compat) ─────────────
    socket.on('scan:complete', (data) => {
      if (isMountedRef.current && onScanComplete) {
        onScanComplete(data);
      }
    });

    socket.on('scan:error', (data) => {
      if (isMountedRef.current && onScanFailed) {
        onScanFailed(data);
      }
      stopElapsedTimer();
      setPhase(SCAN_PHASES.FAILED);
    });

    socket.on('heartbeat', () => {
      socket.emit('pong_ack');
    });

    socket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return;
      setIsConnected(false);

      // Don't retry after clean manual disconnect or complete scan
      if (reason === 'io client disconnect') return;
      if (phase === SCAN_PHASES.COMPLETE || phase === SCAN_PHASES.FAILED) return;

      // Exponential backoff reconnection
      const attempt = reconnectCountRef.current;
      if (attempt < RECONNECT_DELAYS.length) {
        const delay = RECONNECT_DELAYS[attempt];
        reconnectCountRef.current++;
        setReconnectAttempt(reconnectCountRef.current);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    });

    socket.on('connect_error', () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      const attempt = reconnectCountRef.current;
      if (attempt < RECONNECT_DELAYS.length) {
        const delay = RECONNECT_DELAYS[attempt];
        reconnectCountRef.current++;
        setReconnectAttempt(reconnectCountRef.current);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    });
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount / room change ───────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    if (!room) return;

    // Reset state for new scan
    setPhase(SCAN_PHASES.IDLE);
    setCounters({
      filesScanned: 0,
      vulnsFound: 0,
      criticals: 0,
      highs: 0,
      mediums: 0,
      lows: 0,
      aiEvents: 0,
      depsAnalyzed: 0,
    });
    setEvents([]);
    setVulnerabilities([]);
    setCurrentMessage('');
    setElapsedMs(0);
    setEventIndex(0);
    setAiSummary(null);
    reconnectCountRef.current = 0;

    connect();

    return () => {
      isMountedRef.current = false;
      stopElapsedTimer();
      clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe', room);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    phase,
    isConnected,
    reconnectAttempt,
    counters,
    events,
    vulnerabilities,
    currentMessage,
    elapsedMs,
    eventIndex,
    aiSummary,
    replay,
  };
}
