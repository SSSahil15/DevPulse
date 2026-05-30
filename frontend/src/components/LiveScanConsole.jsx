import { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  RotateCcw,
  Bug,
  GitBranch,
  FlaskConical,
  Radio,
  Link2,
  Search,
  BarChart3,
  Brain,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { useScanStream, SCAN_PHASES } from '../hooks/useScanStream';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function severityColor(sev) {
  switch ((sev || '').toUpperCase()) {
    case 'CRITICAL':
      return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' };
    case 'HIGH':
      return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'MEDIUM':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'LOW':
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
    default:
      return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
}

function eventColor(event) {
  if (event.includes('vulnerability')) return 'text-red-400';
  if (event.includes('ai')) return 'text-violet-400';
  if (event.includes('scan.started') || event.includes('scan.progress')) return 'text-cyan-400';
  if (event.includes('completed') || event.includes('synced')) return 'text-emerald-400';
  if (event.includes('failed')) return 'text-red-500';
  if (event.includes('dependency')) return 'text-blue-400';
  return 'text-slate-400';
}

function eventIcon(event) {
  if (event.includes('vulnerability')) return '🐛';
  if (event.includes('ai.analysis.started')) return '🤖';
  if (event.includes('ai.analysis.completed')) return '✅';
  if (event.includes('repository.synced')) return '📦';
  if (event.includes('scan.started')) return '🔍';
  if (event.includes('scan.progress')) return '⚡';
  if (event.includes('scan.completed')) return '🎉';
  if (event.includes('scan.failed')) return '💥';
  if (event.includes('dependency')) return '📄';
  return '•';
}

// ── Step configs ──────────────────────────────────────────────────────────────

const ANALYZE_STEPS = [
  { id: 'connect', label: 'Connect', icon: Link2 },
  { id: 'clone', label: 'Clone Repo', icon: GitBranch },
  { id: 'scan', label: 'Trivy Scan', icon: Search },
  { id: 'ai', label: 'Groq AI', icon: FlaskConical },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
];

const SIMULATE_STEPS = [
  { id: 'connect', label: 'Connect', icon: Link2 },
  { id: 'clone', label: 'Clone Repo', icon: GitBranch },
  { id: 'scan', label: 'Trivy Scan', icon: Search },
  { id: 'score', label: 'Score & Insights', icon: BarChart3 },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
];

const PHASE_STEP_INDEX = {
  analyze: {
    [SCAN_PHASES.IDLE]: 0,
    [SCAN_PHASES.CONNECTING]: 0,
    [SCAN_PHASES.CLONING]: 1,
    [SCAN_PHASES.SCANNING]: 2,
    [SCAN_PHASES.AI_ANALYSIS]: 3,
    [SCAN_PHASES.COMPLETE]: 4,
    [SCAN_PHASES.FAILED]: -1,
  },
  simulate: {
    [SCAN_PHASES.IDLE]: 0,
    [SCAN_PHASES.CONNECTING]: 0,
    [SCAN_PHASES.CLONING]: 1,
    [SCAN_PHASES.SCANNING]: 2,
    [SCAN_PHASES.AI_ANALYSIS]: 3,
    [SCAN_PHASES.COMPLETE]: 4,
    [SCAN_PHASES.FAILED]: -1,
  },
};

// ── Step Tracker ──────────────────────────────────────────────────────────────
function StepTracker({ steps, activeIndex, failed }) {
  return (
    <div
      className="shrink-0 flex items-center px-4 py-3 border-b border-white/[0.06]"
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      {steps.map((step, i) => {
        const done = !failed && i < activeIndex;
        const active = !failed && i === activeIndex;
        const stepFailed = failed && i === activeIndex;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-500 ${
                  stepFailed
                    ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : done
                      ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                      : active
                        ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                        : 'bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {active && !stepFailed ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : stepFailed ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Icon className={`w-3 h-3 ${active ? 'text-cyan-400' : 'text-slate-600'}`} />
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider truncate max-w-[60px] text-center ${
                  done
                    ? 'text-emerald-400'
                    : active
                      ? 'text-cyan-300'
                      : stepFailed
                        ? 'text-red-400'
                        : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-1 rounded-full transition-all duration-700 ${
                  done ? 'bg-gradient-to-r from-emerald-500/60 to-cyan-500/40' : 'bg-white/[0.06]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CVE Card (CI/CD only) ─────────────────────────────────────────────────────
function VulnCard({ vuln }) {
  const c = severityColor(vuln.severity);
  return (
    <div
      className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${c.border} ${c.bg} transition-all duration-300`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <span
        className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${c.bg} ${c.text} border ${c.border}`}
      >
        {vuln.severity || '?'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] text-slate-200 font-bold">{vuln.cve}</span>
          {vuln.fix_available && (
            <span className="text-[8px] uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-bold">
              Fix ✓
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
          {vuln.package}@{vuln.installed_version}
        </p>
      </div>
      {vuln.cvss_score && (
        <span className={`shrink-0 text-[10px] font-black ${c.text}`}>
          {vuln.cvss_score.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ── AI Insights Panel (AI Analysis only) ─────────────────────────────────────
function AiInsightsPanel({ aiSummary, aiEvents, isActive }) {
  const decisionColor = (d) => {
    if (!d) return 'text-slate-400';
    if (d === 'deploy') return 'text-emerald-400';
    if (d === 'review') return 'text-amber-400';
    return 'text-red-400';
  };
  const decisionBg = (d) => {
    if (!d) return 'bg-slate-500/10 border-slate-500/20';
    if (d === 'deploy') return 'bg-emerald-500/10 border-emerald-500/25';
    if (d === 'review') return 'bg-amber-500/10 border-amber-500/25';
    return 'bg-red-500/10 border-red-500/25';
  };
  const riskColor = (r) => {
    if (!r && r !== 0) return 'text-slate-400';
    if (r < 30) return 'text-emerald-400';
    if (r < 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="w-[210px] shrink-0 flex flex-col min-h-0">
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04]"
        style={{ background: 'rgba(255,255,255,0.01)' }}
      >
        <Brain className="w-3 h-3 text-violet-400" />
        <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
          Groq AI Output
        </span>
        {aiEvents > 0 && (
          <span className="ml-auto text-[9px] text-violet-400 font-bold font-mono">{aiEvents}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {!aiSummary ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            {isActive ? (
              <>
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-violet-400 font-mono animate-pulse">
                  Waiting for Groq...
                </span>
                <span className="text-[9px] text-slate-600">AI analysis starts after Trivy</span>
              </>
            ) : (
              <>
                <Brain className="w-6 h-6 text-slate-700" />
                <span className="text-[10px] text-slate-600">No AI output yet</span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5" style={{ animation: 'slideInRight 0.4s ease-out' }}>
            {/* Decision */}
            {aiSummary.decision && (
              <div className={`rounded-xl border p-3 ${decisionBg(aiSummary.decision)}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                    AI Decision
                  </span>
                </div>
                <span
                  className={`text-sm font-black uppercase tracking-wider ${decisionColor(aiSummary.decision)}`}
                >
                  {aiSummary.decision}
                </span>
              </div>
            )}

            {/* Failure probability */}
            {aiSummary.failureProbability != null && (
              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                    Failure Prob.
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-black tabular-nums text-amber-400">
                    {Math.round(aiSummary.failureProbability * 100)}%
                  </span>
                </div>
                {/* Bar */}
                <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-amber-500"
                    style={{ width: `${Math.round(aiSummary.failureProbability * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Risk score */}
            {aiSummary.riskScore != null && (
              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                    Risk Score
                  </span>
                </div>
                <span
                  className={`text-xl font-black tabular-nums ${riskColor(aiSummary.riskScore)}`}
                >
                  {aiSummary.riskScore}
                  <span className="text-[11px] font-normal text-slate-600">/100</span>
                </span>
              </div>
            )}

            {/* Suggestions count */}
            {aiSummary.suggestionsCount > 0 && (
              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3 h-3 text-yellow-400" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                    Suggestions
                  </span>
                </div>
                <span className="text-xl font-black tabular-nums text-yellow-400">
                  {aiSummary.suggestionsCount}
                </span>
                <span className="text-[9px] text-slate-600 block mt-0.5">
                  View in results panel
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Terminal Line ─────────────────────────────────────────────────────────────
function TerminalLine({ entry }) {
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <div className="flex items-start gap-2 py-0.5 hover:bg-white/[0.02] rounded px-1 transition-colors group">
      <span className="text-slate-600 font-mono text-[10px] shrink-0 mt-0.5 group-hover:text-slate-500">
        {timeStr}
      </span>
      <span className="text-slate-600 font-mono text-[10px] shrink-0 mt-0.5">
        {eventIcon(entry.event)}
      </span>
      <span
        className={`font-mono text-[10px] ${eventColor(entry.event)} shrink-0 mt-0.5 hidden sm:inline`}
      >
        [{entry.event}]
      </span>
      <span className="font-mono text-[10px] text-slate-300 min-w-0 break-all">
        {entry.message}
      </span>
    </div>
  );
}

// ── Main LiveScanConsole ──────────────────────────────────────────────────────
/**
 * Real-time scan telemetry console.
 *
 * @param {string}   room           Socket.IO room key
 * @param {string}   repoName       Display repo name
 * @param {string}   mode           "analyze" | "simulate"
 * @param {string}   accessToken    JWT
 * @param {Function} onScanComplete Called with result payload on completion
 * @param {Function} onScanFailed   Called with error payload on failure
 * @param {Function} onDismiss      Called when user clicks dismiss
 */
export default function LiveScanConsole({
  room,
  repoName,
  mode = 'analyze',
  accessToken,
  onScanComplete,
  onScanFailed,
  onDismiss,
}) {
  const terminalRef = useRef(null);
  const [countdown, setCountdown] = useState(null); // null = not counting

  const {
    phase,
    isConnected,
    reconnectAttempt,
    counters,
    events,
    vulnerabilities,
    currentMessage,
    elapsedMs,
    aiSummary,
    replay,
  } = useScanStream(room, { accessToken, onScanComplete, onScanFailed });

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events.length]);

  // Auto-dismiss countdown when scan completes or fails
  const isDone = phase === SCAN_PHASES.COMPLETE;
  const isFailed = phase === SCAN_PHASES.FAILED;

  useEffect(() => {
    if ((isDone || isFailed) && onDismiss) {
      setCountdown(4);
      const tick = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(tick);
            onDismiss();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }
  }, [isDone, isFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = mode === 'simulate' ? SIMULATE_STEPS : ANALYZE_STEPS;
  const stepMap = PHASE_STEP_INDEX[mode] ?? PHASE_STEP_INDEX.analyze;
  const activeIndex = stepMap[phase] ?? 0;

  const isActive = phase !== SCAN_PHASES.IDLE && !isDone && !isFailed;

  const modeLabel = mode === 'simulate' ? 'CI/CD Simulation' : 'AI Analysis';
  const modeSubtitle =
    mode === 'simulate'
      ? 'Real Trivy scan · GitHub health metrics · DevPulse scoring'
      : 'Real Trivy scan → Groq AI failure prediction & risk scoring';

  return (
    <div
      className="relative flex flex-col w-full h-full min-h-0 overflow-hidden rounded-2xl border border-white/[0.06]"
      style={{ background: 'linear-gradient(160deg, rgba(2,6,23,0.97), rgba(5,10,30,0.99))' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(2000%); opacity: 0; }
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      {/* Scanning sweep */}
      {isActive && (
        <div
          className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-20"
          style={{ animation: 'scanLine 3s linear infinite', top: 0 }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {/* Mode badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.35)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {mode === 'simulate' ? (
            <BarChart3 className="w-3 h-3 text-orange-400" />
          ) : (
            <FlaskConical className="w-3 h-3 text-violet-400" />
          )}
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              mode === 'simulate' ? 'text-orange-300' : 'text-violet-300'
            }`}
          >
            {modeLabel}
          </span>
        </div>

        {/* Repo + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{repoName}</p>
          <p className="text-[9px] text-slate-600 truncate">{modeSubtitle}</p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1 text-slate-500 shrink-0">
          <Clock className="w-3 h-3" />
          <span className="font-mono text-[11px] tabular-nums">{formatMs(elapsedMs)}</span>
        </div>

        {/* Connection */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-slate-600" />
          )}
          {reconnectAttempt > 0 && (
            <button
              onClick={replay}
              className="flex items-center gap-0.5 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {reconnectAttempt}
            </button>
          )}
        </div>

        {/* Manual dismiss */}
        {(isDone || isFailed) && onDismiss && (
          <button
            onClick={() => {
              setCountdown(null);
              onDismiss();
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Step Tracker ─────────────────────────────────────────────────────── */}
      <StepTracker steps={steps} activeIndex={activeIndex} failed={isFailed} />

      {/* Current message */}
      {currentMessage && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.04]"
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          )}
          {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
          <span className="text-[11px] text-slate-400 truncate font-mono">{currentMessage}</span>
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-4 divide-x divide-white/[0.04] border-b border-white/[0.06]">
        <div className="flex flex-col items-center justify-center py-2 px-2 gap-0.5">
          <Search className="w-3 h-3 text-cyan-400 mb-0.5" />
          <span className="text-lg font-black tabular-nums text-white">
            {counters.filesScanned}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
            Files
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 px-2 gap-0.5">
          <Bug className="w-3 h-3 text-red-400 mb-0.5" />
          <span className="text-lg font-black tabular-nums text-red-400">
            {counters.vulnsFound}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
            CVEs Found
          </span>
        </div>
        {mode === 'analyze' ? (
          <div className="flex flex-col items-center justify-center py-2 px-2 gap-0.5">
            <Brain className="w-3 h-3 text-violet-400 mb-0.5" />
            <span className="text-lg font-black tabular-nums text-violet-400">
              {counters.aiEvents}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
              AI Events
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 px-2 gap-0.5">
            <BarChart3 className="w-3 h-3 text-orange-400 mb-0.5" />
            <span className="text-lg font-black tabular-nums text-orange-400">
              {counters.depsAnalyzed}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
              Targets
            </span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-2 px-2 gap-0.5">
          <GitBranch className="w-3 h-3 text-blue-400 mb-0.5" />
          <span className="text-lg font-black tabular-nums text-blue-400">
            {counters.depsAnalyzed}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
            Deps
          </span>
        </div>
      </div>

      {/* Severity bar (CI/CD only — or when vulns found in any mode) */}
      {mode === 'simulate' && counters.vulnsFound > 0 && (
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-b border-white/[0.04]"
          style={{ background: 'rgba(239,68,68,0.03)' }}
        >
          <Shield className="w-3 h-3 text-slate-500 shrink-0" />
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'CRIT', val: counters.criticals, color: 'text-red-400' },
              { label: 'HIGH', val: counters.highs, color: 'text-orange-400' },
              { label: 'MED', val: counters.mediums, color: 'text-amber-400' },
              { label: 'LOW', val: counters.lows, color: 'text-blue-400' },
            ].map(
              ({ label, val, color }) =>
                val > 0 && (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`text-[10px] font-black ${color}`}>{val}</span>
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                      {label}
                    </span>
                  </span>
                ),
            )}
          </div>
        </div>
      )}

      {/* ── Main: Terminal + Right Panel ─────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Terminal log */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-white/[0.04]">
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04]"
            style={{ background: 'rgba(255,255,255,0.01)' }}
          >
            <Terminal className="w-3 h-3 text-slate-600" />
            <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
              Live Stream Log
            </span>
            <span className="ml-auto text-[9px] text-slate-700 font-mono">
              {events.length} events
            </span>
          </div>
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 font-mono"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            {events.length === 0 ? (
              <div className="flex items-center gap-2 py-8 justify-center text-slate-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[11px]">Waiting for events...</span>
              </div>
            ) : (
              events.map((entry) => <TerminalLine key={entry.id} entry={entry} />)
            )}
            {isActive && (
              <div className="flex items-center gap-1 py-0.5 px-1">
                <span className="text-[10px] text-emerald-400 font-mono">▶</span>
                <span
                  className="text-emerald-400 text-[10px]"
                  style={{ animation: 'blink-cursor 1s step-end infinite' }}
                >
                  _
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: AI Insights (analyze) or CVE Feed (simulate) */}
        {mode === 'analyze' ? (
          <AiInsightsPanel aiSummary={aiSummary} aiEvents={counters.aiEvents} isActive={isActive} />
        ) : (
          <div className="w-[210px] shrink-0 flex flex-col min-h-0">
            <div
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04]"
              style={{ background: 'rgba(255,255,255,0.01)' }}
            >
              <Radio className="w-3 h-3 text-slate-600" />
              <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
                CVE Feed
              </span>
              {counters.vulnsFound > 0 && (
                <span className="ml-auto text-[9px] text-red-400 font-bold font-mono">
                  {counters.vulnsFound}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
              {vulnerabilities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Shield className="w-6 h-6 text-slate-700" />
                  <span className="text-[10px] text-slate-600">No CVEs yet</span>
                </div>
              ) : (
                vulnerabilities.map((vuln, i) => <VulnCard key={vuln.id || i} vuln={vuln} />)
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: complete / failed with auto-dismiss countdown ────────────── */}
      {(isDone || isFailed) && (
        <div
          className={`shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] ${
            isDone ? 'bg-emerald-500/5' : 'bg-red-500/5'
          }`}
        >
          <div className="flex items-center gap-2">
            {isDone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-bold">
                  {modeLabel} complete · {counters.vulnsFound} CVEs · {formatMs(elapsedMs)}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs text-red-400 font-bold">Scan failed</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {countdown !== null && countdown > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">Closing in {countdown}s</span>
            )}
            {onDismiss && (
              <button
                onClick={() => {
                  setCountdown(null);
                  onDismiss();
                }}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                  isDone
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                }`}
              >
                View Results →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
