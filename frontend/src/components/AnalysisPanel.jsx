import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import {
  Zap,
  ShieldAlert,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  GitBranch,
  Server,
  Box,
  TestTube,
  Star,
  GitFork,
  Clock,
  ExternalLink,
  Link2,
  Check,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import MetricCard from './MetricCard';
import AICopilot from './AICopilot';
import InfrastructureTopology from './InfrastructureTopology';
import ScoreGauge from './ScoreGauge';
import VulnerabilityTable from './VulnerabilityTable';
import InsightsPanel from './InsightsPanel';
import ErrorBoundary from './ErrorBoundary';
import CountUp from './CountUp';
import { apiRequest, pollScanJob } from '../api';
import LiveScanConsole from './LiveScanConsole';

function getRiskTone(score) {
  if (score >= 80) return 'success';
  if (score >= 55) return 'warning';
  if (score >= 30) return 'danger';
  return 'danger';
}

function getToneFromScoreObj(status) {
  if (status === 'SAFE') return 'success';
  if (status === 'WARNING') return 'warning';
  if (status === 'RISKY') return 'danger';
  if (status === 'CRITICAL') return 'danger';
  return 'neutral';
}

function getRecordTime(record) {
  return new Date(record?.receivedAt || record?.timestamp || 0).getTime() || 0;
}

function AnalysisPanel({
  analysisState,
  analysisResult,
  onAnalyze,
  repository,
  accessToken,
  onScanComplete,
  sidebarHistory = [],
}) {
  const {
    sessionData,
    setSessionData,
    scanRoom,
    isLiveScanning,
    scanTrigger,
    handleLiveScanComplete,
    handleLiveScanFailed,
    dismissLiveScan,
    handleSimulate,
  } = useDashboard();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateJobStatus, setSimulateJobStatus] = useState(null);
  const simulateRequestLockRef = useRef(false);

  // The LiveScanConsole handles its own 4-second auto-dismiss countdown now.
  // Legacy auto-dismiss removed to prevent prematurely killing subsequent simulate scans.

  // Helper for dynamic time ago
  const getTimeAgo = (ts) => {
    if (!ts) return 'just now';
    const sec = Math.floor((new Date() - new Date(ts)) / 1000);
    if (sec < 60) return `${Math.max(1, sec)}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  const handleSimulateClick = async () => {
    if (!repository || isLiveScanning) return;
    setSessionData(null); // clear previous result
    handleSimulate(repository);
  };

  // ─── Inline Simulate Progress Stepper ────────────────────────────────────
  const SIMULATE_STEPS = [
    { id: 'clone', label: 'Cloning repository', icon: GitBranch },
    { id: 'trivy', label: 'Running Trivy security scan', icon: ShieldAlert },
    { id: 'health', label: 'Fetching GitHub health metrics', icon: Activity },
    { id: 'score', label: 'Calculating DevPulse Score', icon: CheckCircle2 },
  ];

  function SimulateProgressStepper() {
    const stepIndex =
      simulateJobStatus === 'processing'
        ? 2
        : simulateJobStatus === 'pending'
          ? 0
          : simulateJobStatus === 'done'
            ? 4
            : 0;
    return (
      <div className="flex flex-col gap-2 py-3 px-4 rounded-xl border border-white/[0.05] bg-white/[0.01] relative overflow-hidden mt-3 shadow-[inset_0_0_20px_rgba(37,99,235,0.02)]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-sweep pointer-events-none" />
        <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 relative z-10">
          Monitoring Repository Activity...
        </h4>
        {SIMULATE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-xs relative z-10 ${
                done ? 'text-emerald-400' : active ? 'text-cyan-400 font-medium' : 'text-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : active
                      ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'bg-white/5'
                }`}
              >
                {active ? (
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                ) : done ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3 opacity-50" />
                )}
              </div>
              <span className={active ? 'animate-pulse' : ''}>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-32 relative overflow-hidden">
        {/* Faint animated grid background */}
        <div
          className="absolute inset-0 opacity-30 animate-slow-breathe pointer-events-none"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMjAgMEwxIDBMMCAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8cGF0aCBkPSJNMCAyMEwwIDFMMSAxIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-1 ring-cyan-500/20 bg-cyan-500/5 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
          <div
            className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin-slow"
            style={{ borderStyle: 'dashed' }}
          ></div>
          <Activity className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>

        <div className="flex flex-col items-center gap-2 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-status-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <h2 className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Awaiting Connection
            </h2>
          </div>
          <p className="text-slate-400 text-[11px] max-w-sm leading-relaxed font-mono">
            Select a target repository from the sidebar to initialize AI scanning telemetry and
            establish pipeline baseline.
          </p>
        </div>
      </div>
    );
  }

  const analysis = analysisResult?.analysis;

  const recordsById = new Map();
  sidebarHistory
    .filter((h) => h.repository === repository.fullName && h.devpulseScore?.score != null)
    .forEach((record) =>
      recordsById.set(record.id || record.runId || record.receivedAt || record.timestamp, record),
    );

  if (
    sessionData?.repository === repository.fullName &&
    sessionData?.devpulseScore?.score != null
  ) {
    recordsById.set(
      sessionData.id || sessionData.runId || sessionData.receivedAt || sessionData.timestamp,
      sessionData,
    );
  }

  const historyForRepo = [...recordsById.values()]
    .sort((a, b) => getRecordTime(a) - getRecordTime(b))
    .slice(-10);

  const lastScan = sessionData;

  // Main metrics — fallback to historical scan if current session has no scan
  const devpulseScore = lastScan?.devpulseScore?.score ?? '--';
  const scoreStatus = lastScan?.devpulseScore?.status ?? 'N/A';
  const pipelineVulns = lastScan
    ? (lastScan.stages?.security?.critical || 0) +
      (lastScan.stages?.security?.high || 0) +
      (lastScan.stages?.security?.medium || 0)
    : '--';

  const failureProb = analysis?.failurePrediction
    ? `${Math.round(analysis.failurePrediction.probability)}%`
    : '--';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" style={{ color: '#4F46E5' }} />
            <span className="section-label">DevPulse Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-3xl font-black tracking-tight hover:opacity-80 transition-opacity"
              style={{
                background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {repository.fullName}
            </a>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: '#4F46E5', opacity: 0.6 }} />
          </div>
          <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
            {repository.description ||
              'Real-time CI/CD pipeline intelligence & AI Repository Analysis.'}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Star className="w-3.5 h-3.5 text-amber-400" /> {repository.stargazersCount} Stars
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <GitFork className="w-3.5 h-3.5" style={{ color: '#4F46E5' }} />{' '}
              {repository.forksCount} Forks
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Updated{' '}
              {new Date(repository.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleSimulateClick}
            disabled={isLiveScanning}
            className="flex items-center gap-2 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl shrink-0 premium-btn"
          >
            {scanTrigger === 'simulate' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Server className="w-4 h-4" />
            )}
            {scanTrigger === 'simulate' ? 'Simulating...' : 'Simulate CI/CD'}
          </button>

          <button
            onClick={() => onAnalyze(repository)}
            disabled={analysisState.status === 'loading' || isLiveScanning}
            className="flex items-center gap-2 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl shrink-0 premium-btn"
          >
            {analysisState.status === 'loading' || scanTrigger === 'analyze' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-white" />
            )}
            {scanTrigger === 'analyze'
              ? 'Analyzing...'
              : analysisState.status === 'loading'
                ? 'Analyzing Repo...'
                : 'Analyze Repository (AI)'}
          </button>
        </div>
      </div>

      {/* ── Live Scan Console ─────────────────────────────────────── */}
      {isLiveScanning && scanRoom && (
        <div
          className="mt-6 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          style={{ height: '480px' }}
        >
          <LiveScanConsole
            room={scanRoom}
            repoName={repository?.fullName || scanRoom}
            mode={scanTrigger || 'analyze'}
            accessToken={accessToken}
            onScanComplete={(data) => {
              handleLiveScanComplete(data);
              onScanComplete?.();
            }}
            onScanFailed={handleLiveScanFailed}
            onDismiss={dismissLiveScan}
          />
        </div>
      )}

      {/* Error */}
      {analysisState.status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-3 bg-red-950/20 ring-1 ring-red-500/20 rounded-2xl p-8 my-4 relative overflow-hidden group">
          <div
            className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center relative z-10 mb-2 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>

          <div className="relative z-10 text-center">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-1">
              Telemetry Interrupted
            </h3>
            <p className="text-sm text-red-300/80 font-mono">
              System degraded: {analysisState.error}
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4 stagger-1">
        <MetricCard
          eyebrow="CI/CD DevPulse Score"
          value={devpulseScore}
          detail="Score from the latest CI/CD scan. Run Simulate CI/CD to get a fresh score."
          tone={lastScan ? 'primary' : 'neutral'}
          isSpinning={isSimulating}
          subtext={
            lastScan
              ? `Last analyzed ${getTimeAgo(lastScan.timestamp || lastScan.receivedAt)}`
              : 'Not analyzed yet'
          }
        />
        <MetricCard
          eyebrow="AI Failure Probability"
          value={failureProb}
          detail="AI prediction of next pipeline run failure based on repo activity, size, and technical debt."
          tone={analysis?.failurePrediction ? 'warning' : 'neutral'}
          isSpinning={analysisState.status === 'loading'}
          subtext={
            analysis
              ? `Last analyzed ${getTimeAgo(analysis.analyzedAt || new Date().toISOString())}`
              : 'Not analyzed yet'
          }
        />
        <MetricCard
          eyebrow="Pipeline Vulnerabilities"
          value={pipelineVulns}
          detail="Total CVEs found in the latest CI/CD scan."
          tone={lastScan ? 'danger' : 'neutral'}
          isSpinning={isSimulating}
          subtext={
            lastScan
              ? `Last analyzed ${getTimeAgo(lastScan.timestamp || lastScan.receivedAt)}`
              : 'Not analyzed yet'
          }
        />
      </div>

      {/* AI Analysis Job Queue Stepper */}
      {analysisState.status === 'loading' && (
        <div className="rounded-2xl relative overflow-hidden mt-4 p-4 border border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center gap-3 text-cyan-400">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Connecting to live scan stream...
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!sessionData && !analysis && analysisState.status !== 'loading' && (
        <div className="surface-2 py-24 rounded-[28px] flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
          {/* Subtle radar / grid background */}
          <div
            className="absolute inset-0 opacity-20 animate-slow-breathe pointer-events-none"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMjAgMEwxIDBMMCAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8cGF0aCBkPSJNMCAyMEwwIDFMMSAxIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')",
            }}
          />

          <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 bg-[#0f1421] border border-white/5 shadow-[0_0_40px_rgba(37,99,235,0.05)]">
            <Activity className="w-6 h-6 text-slate-500 opacity-60" />
            <div
              className="absolute -inset-1 rounded-2xl border border-white/5 animate-ping opacity-20"
              style={{ animationDuration: '3s' }}
            />
          </div>

          <div className="text-center relative z-10 mt-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
              No Active Telemetry
            </h3>
            <p className="text-slate-500 text-[11px] font-mono max-w-xs mx-auto leading-relaxed">
              Initialize an AI analysis or CI/CD simulation to extract insights and calculate a
              DevPulse score.
            </p>
          </div>
        </div>
      )}

      {/* Skeleton Loading State */}
      {(analysisState.status === 'loading' ||
        (simulateJobStatus && simulateJobStatus !== 'done' && simulateJobStatus !== 'failed')) &&
        !sessionData &&
        !analysis && (
          <div className="mt-8 space-y-8 pointer-events-none">
            <div className="grid grid-cols-3 gap-4 stagger-1">
              <div className="h-[120px] rounded-2xl skeleton-loader" />
              <div className="h-[120px] rounded-2xl skeleton-loader" />
              <div className="h-[120px] rounded-2xl skeleton-loader" />
            </div>
            <div className="h-[280px] rounded-2xl skeleton-loader stagger-2" />
            <div className="grid grid-cols-2 gap-6 stagger-3">
              <div className="h-[200px] rounded-2xl skeleton-loader" />
              <div className="h-[200px] rounded-2xl skeleton-loader" />
            </div>
          </div>
        )}

      {/* AI Repository Analysis Section */}
      {analysis && (
        <div className="mt-8 stagger-3">
          <div className="flex items-center gap-3 mb-4">
            <h3
              className="text-lg font-black"
              style={{
                background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              AI Repository Analyzer
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold tracking-widest uppercase">
              <span className="status-dot animate-status-pulse bg-cyan-400 text-cyan-400" /> AI
              ACTIVE
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="surface-2 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-6 right-6 opacity-[0.04]">
                <ShieldAlert className="w-28 h-28" />
              </div>
              <div className="flex items-center justify-between mb-5">
                <p className="section-label">AI Decision & Rationale</p>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wide px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {analysis.source === 'bootstrap-github-metadata'
                    ? 'Confidence: Metadata only'
                    : analysis.failurePrediction?.probability != null
                    ? `AI Confidence: ${Math.round(100 - analysis.failurePrediction.probability)}%`
                    : 'AI Confidence: High'}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-5">
                <span
                  className={`px-5 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 flex items-center gap-2 ${
                    analysis.decision === 'BLOCK' || analysis.decision === 'FAIL'
                      ? 'bg-red-500/15 text-red-400 ring-red-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
                  }`}
                >
                  <span
                    className={`status-dot animate-status-pulse ${
                      analysis.decision === 'BLOCK' || analysis.decision === 'FAIL'
                        ? 'bg-red-400 text-red-400'
                        : 'bg-emerald-400 text-emerald-400'
                    }`}
                  />
                  {analysis.decision}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 ring-1 ring-white/10 px-3 py-1 rounded-lg uppercase">
                  {analysis.source === 'bootstrap-github-metadata'
                    ? 'Metadata Analysis'
                    : analysis.source?.startsWith('devpulse-ai')
                    ? 'AI Model v1'
                    : analysis.source?.replace(/-/g, ' ') || 'AI Analysis'}
                </span>
              </div>
              {analysis.source === 'bootstrap-github-metadata' ? (
                <div
                  className="flex items-start gap-3 rounded-xl p-3 mb-[18px]"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    <strong className="font-bold">Fallback mode</strong> — AI microservice unavailable. This prediction uses repository metadata (age, issues, size) only. Click{' '}
                    <strong>Analyze Repository</strong> to retry with the full AI model.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-secondary italic max-w-[65ch] mb-[18px]">
                  "{analysis.failurePrediction?.rationale}"
                </p>
              )}
            </div>
            <div className="surface-2 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <p className="section-label">AI Remediation</p>
                {analysis.source === 'bootstrap-github-metadata' && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Baseline
                  </span>
                )}
              </div>
              {analysis.source === 'bootstrap-github-metadata' && (
                <p className="text-[10px] text-slate-600 mb-4 leading-relaxed">
                  General setup recommendations based on repository metadata. Run a full AI analysis for context-specific suggestions.
                </p>
              )}
              <div className="flex flex-col gap-[18px] mt-[18px]">
                {analysis.suggestions?.map((s, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 text-white transition-all"
                      style={{ background: analysis.source === 'bootstrap-github-metadata' ? 'linear-gradient(135deg,#92400e,#b45309)' : 'linear-gradient(135deg,#38BDF8,#2563EB)' }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm text-secondary max-w-[65ch] leading-snug whitespace-pre-wrap">
                      {s}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-2 rounded-2xl p-6 col-span-2">
              <p className="section-label mb-5">Repository Facts (Analyzed Metadata)</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Branch', value: repository.defaultBranch },
                  { label: 'Open Issues', value: repository.openIssuesCount },
                  { label: 'Stars', value: repository.stargazersCount },
                  { label: 'Forks', value: repository.forksCount },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card rounded-xl px-4 py-3">
                    <div className="section-label mb-1">{label}</div>
                    <div className="text-lg font-bold text-white">
                      <CountUp value={value} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CI/CD Pipeline Data Section — only shows after a Simulate CI/CD scan this session */}
      <div className="mt-8 stagger-2">
        <div className="flex items-center gap-3 mb-4">
          <h3
            className="text-lg font-black"
            style={{
              background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CI/CD Pipeline Intelligence
          </h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold tracking-widest uppercase">
            <span className="status-dot animate-status-pulse bg-emerald-400 text-emerald-400" />{' '}
            REALTIME MONITORING
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-widest uppercase ml-auto">
            <TrendingUp className="w-3 h-3" /> Pipeline stability improving
          </div>
        </div>

        {/* Score History Chart */}
        {(() => {
          if (historyForRepo.length === 0) {
            return (
              <div className="surface-2 rounded-2xl p-6 mb-6 relative overflow-hidden group border border-white/5 h-[280px] flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50 animate-sweep pointer-events-none" />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMjAgMEwxIDBMMCAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wMykiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8cGF0aCBkPSJNMCAyMEwwIDFMMSAxIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wMykiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')",
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4 relative z-10">
                  <Activity className="w-6 h-6 text-slate-500 opacity-50" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Awaiting CI/CD Telemetry
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono max-w-[280px]">
                    Run a pipeline simulation to establish your first DevPulse baseline.
                  </p>
                </div>
              </div>
            );
          }

          const chartData = historyForRepo.map((h, i) => ({
            name: `Run ${i + 1}`,
            score: h.devpulseScore.score,
            status: h.devpulseScore.status,
            date: new Date(h.receivedAt || h.timestamp).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
          return (
            <div className="surface-2 rounded-2xl p-6 mb-6 relative overflow-hidden group animate-chart-glow">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-sweep pointer-events-none delay-1" />
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <p className="section-label">DevPulse Score Trend</p>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Anomaly Detection Active
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Last analyzed{' '}
                    {historyForRepo.length > 0
                      ? getTimeAgo(
                          historyForRepo[historyForRepo.length - 1].timestamp ||
                            historyForRepo[historyForRepo.length - 1].receivedAt,
                        )
                      : 'never'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-semibold">
                    {historyForRepo.length === 1
                      ? '1 scan recorded'
                      : `${historyForRepo.length} scans recorded`}
                  </span>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#ffffff40"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#ffffff40"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <RechartsTooltip
                      wrapperStyle={{ transition: 'opacity .24s ease, transform .24s ease' }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #ffffff20',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#4F46E5', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                      formatter={(value, name, item) => [
                        `${value}/100 (${item.payload.status || 'N/A'})`,
                        'Score',
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                    />
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4F46E5">
                          <animate
                            attributeName="stop-color"
                            values="#4F46E5;#3B82F6;#4F46E5"
                            dur="4s"
                            repeatCount="indefinite"
                          />
                        </stop>
                        <stop offset="100%" stopColor="#06B6D4">
                          <animate
                            attributeName="stop-color"
                            values="#06B6D4;#22D3EE;#06B6D4"
                            dur="4s"
                            repeatCount="indefinite"
                          />
                        </stop>
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="url(#lineGradient)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#areaGradient)"
                      dot={{ r: 4, fill: '#4F46E5', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#06B6D4', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* Simulate progress stepper */}
        {simulateJobStatus && simulateJobStatus !== 'done' && (
          <div className="mb-6 bg-white/[0.02] ring-1 ring-white/[0.04] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-scan-line pointer-events-none" />
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{
                background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {simulateJobStatus === 'failed' ? 'Scan Failed' : 'CI/CD Scan In Progress'}
            </p>
            {simulateJobStatus !== 'failed' ? (
              <SimulateProgressStepper />
            ) : (
              <p className="text-xs text-red-400 mt-2">
                The Trivy scan failed. Check that Trivy and Git are installed and accessible.
              </p>
            )}
          </div>
        )}

        {!sessionData && !simulateJobStatus ? (
          <div className="py-12 rounded-2xl ring-1 ring-dashed ring-white/[0.07] flex flex-col items-center justify-center text-center">
            <Server className="w-6 h-6 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">
              No scan data for this session.
              <br />
              Click <b>Simulate CI/CD</b> to run a fresh Trivy scan.
            </p>
          </div>
        ) : sessionData ? (
          <>
            <div className="grid grid-cols-2 gap-6">
              {/* Pipeline Stages */}
              <div className="surface-2 rounded-2xl p-6 flex flex-col h-full">
                <p className="section-label mb-5 shrink-0">Pipeline Stages</p>
                <div className="space-y-4 shrink-0">
                  {[
                    {
                      name: 'Backend Tests',
                      status: sessionData.stages?.backend?.tests,
                      icon: TestTube,
                    },
                    {
                      name: 'Frontend Build',
                      status: sessionData.stages?.frontend?.build,
                      icon: Box,
                    },
                    {
                      name: 'Docker Build',
                      status: sessionData.stages?.docker?.build,
                      icon: Server,
                    },
                  ].map((stage) => (
                    <div
                      key={stage.name}
                      className="flex items-center justify-between p-3 bg-white/[0.02] ring-1 border border-white/[0.02] ring-0 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <stage.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-300">{stage.name}</span>
                      </div>
                      {stage.status === 'success' ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                          Passed
                        </span>
                      ) : stage.status === 'failure' ? (
                        <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                          Failed
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-400/10 px-2 py-1 rounded">
                          Skipped
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Dynamic Infrastructure Topology */}
                <InfrastructureTopology
                  sessionData={sessionData}
                  analysis={analysis}
                  repository={repository}
                />
              </div>

              {/* AI Pipeline Insights */}
              <div className="surface-2 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-6 right-6 opacity-[0.04]">
                  <Lightbulb className="w-28 h-28" />
                </div>
                <div className="flex items-center justify-between mb-5">
                  <p className="section-label">AI Pipeline Insights</p>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-wide px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Risk trending downward
                  </span>
                </div>
                <InsightsPanel insights={sessionData.insights} />
              </div>

              {/* Security findings */}
              <div className="surface-2 rounded-2xl p-6 col-span-2 backdrop-blur-xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-shadow premium-transition stagger-4">
                <div className="flex items-center justify-between mb-5">
                  <p className="section-label">Security Findings (Trivy Scan)</p>
                  <span className="text-[10px] text-amber-400 font-mono tracking-wide px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    3 anomalies detected
                  </span>
                </div>
                <div className="flex flex-col md:flex-row gap-8 mb-6 items-center">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Critical',
                              value: sessionData.stages?.security?.critical || 0,
                              fill: '#f87171',
                            },
                            {
                              name: 'High',
                              value: sessionData.stages?.security?.high || 0,
                              fill: '#fb923c',
                            },
                            {
                              name: 'Medium',
                              value: sessionData.stages?.security?.medium || 0,
                              fill: '#fbbf24',
                            },
                            {
                              name: 'Docker',
                              value: sessionData.stages?.docker?.imageVulnerabilities || 0,
                              fill: '#60a5fa',
                            },
                          ].filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #ffffff20',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          }}
                          itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                      {
                        label: 'Critical',
                        value: sessionData.stages?.security?.critical,
                        color: 'text-red-400',
                      },
                      {
                        label: 'High',
                        value: sessionData.stages?.security?.high,
                        color: 'text-orange-400',
                      },
                      {
                        label: 'Medium',
                        value: sessionData.stages?.security?.medium,
                        color: 'text-amber-400',
                      },
                      {
                        label: 'Docker Image',
                        value: sessionData.stages?.docker?.imageVulnerabilities,
                        color: 'text-blue-400',
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center bg-white/[0.04] ring-1 ring-white/5 rounded-xl p-4 gap-1 text-center transition-all hover:bg-white/[0.06]"
                      >
                        <span className={`text-2xl font-black ${color}`}>{value ?? 0}</span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {sessionData.stages?.security?.vulnerabilities?.length > 0 && (
                  <div className="border-t border-white/5 pt-5">
                    <p className="section-label mb-4">Top Vulnerabilities</p>
                    <VulnerabilityTable
                      vulnerabilities={sessionData.stages.security.vulnerabilities}
                    />
                  </div>
                )}
              </div>
            </div>

            <ErrorBoundary>
              <AICopilot
                pipelineData={sessionData}
                analysisResult={analysisResult}
                accessToken={accessToken}
              />
            </ErrorBoundary>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AnalysisPanel;
