import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  Search,
  LogOut,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ScanLine,
  History,
  FileDown,
  Trash2,
  Zap,
  Shield,
  Share2,
  Calendar,
} from 'lucide-react';
import RemediationPage from './RemediationPage';
import ScheduleModal from '../components/ScheduleModal';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { renderToString } from 'react-dom/server';
import { ApiError, apiRequest } from '../api';
import AnalysisPanel from '../components/AnalysisPanel';
import RepositoryCard from '../components/RepositoryCard';
import ReportTemplate from '../components/ReportTemplate';
import CountUp from '../components/CountUp';
import { DashboardProvider } from '../context/DashboardContext';
import { useDashboard } from '../hooks/useDashboard';

function getInitials(user) {
  if (!user?.displayName && !user?.username) return 'DP';
  return (user.displayName || user.username)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
// ─── Rate Limit Ticker ───────────────────────────────────────────────────────
const RATE_CAPS = [
  {
    label: 'AI Analysis',
    value: '100 scans',
    window: 'per 24 hrs',
    color: 'text-violet-400',
    dot: 'bg-violet-400',
  },
  {
    label: 'CI/CD Simulate',
    value: '5 scans',
    window: 'per hour',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  {
    label: 'AI Copilot',
    value: '30 requests',
    window: 'per minute',
    color: 'text-cyan-400',
    dot: 'bg-cyan-400',
  },
  {
    label: 'Repo Listing',
    value: '100 requests',
    window: 'per minute',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  {
    label: 'General API',
    value: '100 requests',
    window: 'per minute',
    color: 'text-slate-300',
    dot: 'bg-slate-400',
  },
];

function RateLimitTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % RATE_CAPS.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(cycle);
  }, []);

  const cap = RATE_CAPS[index];

  return (
    <div
      className="shrink-0 w-full flex items-center justify-between px-6 py-2 border-b border-white/[0.08] z-10 relative"
      style={{
        background:
          'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(15,20,40,0.85), rgba(99,102,241,0.08))',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: label pill */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.08]">
          API Limits
        </span>
        {/* Nav dots */}
        <div className="flex items-center gap-1 ml-1">
          {RATE_CAPS.map((c, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? `w-2 h-2 ${c.dot} shadow-[0_0_6px_2px] opacity-100`
                  : 'w-1.5 h-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Centre: the cycling cap */}
      <div
        className="flex items-center gap-3 transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-5px)',
        }}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${cap.dot} shadow-[0_0_8px_2px]`} />
        <span className={`text-sm font-black tracking-wide ${cap.color}`}>{cap.label}</span>
        <span className="text-white/20 text-xs">|</span>
        <span className="text-sm font-bold text-white">{cap.value}</span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            cap.color === 'text-violet-400'
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
              : cap.color === 'text-orange-400'
                ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                : cap.color === 'text-cyan-400'
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                  : cap.color === 'text-blue-400'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                    : 'border-white/10 bg-white/5 text-slate-300'
          }`}
        >
          {cap.window}
        </span>
      </div>

      {/* Right: env status */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          Production limits · bypassed in dev
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────
function DashboardContent({ accessToken, onLogout, user }) {
  const {
    repoState,
    analysisState,
    analysisResult,
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
    filteredRepositories: filtered,
    selectedRepo,
    selectedRepositoryId,
    setSelectedRepositoryId,
    isLiveScanning,
    scanRoom,
    sessionData,
  } = useDashboard();

  const lastScan = sessionData;
  const vulnerabilities = lastScan?.stages?.security?.vulnerabilities || [];
  const fixableVulnerabilities = vulnerabilities.filter((v) => v.fixedVersion || v.FixedVersion);

  const [showRemediation, setShowRemediation] = useState(false);
  const [remediationTarget, setRemediationTarget] = useState({ repo: null, scanData: null });
  const [sharingId, setSharingId] = useState(null); // record.id being shared
  const [shareToast, setShareToast] = useState(null); // { message, ok }
  const [scheduleRepo, setScheduleRepo] = useState(null); // repo being scheduled

  function openRemediation(repo, scanData) {
    setRemediationTarget({ repo, scanData });
    setShowRemediation(true);
  }

  async function createShareLink(record) {
    setSharingId(record.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ resultId: record.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to create share link');
      }
      const { shareUrl } = await res.json();

      // shareUrl from backend is a path like /report/TOKEN — make it a full URL
      const fullUrl = shareUrl.startsWith('http')
        ? shareUrl
        : `${window.location.origin}${shareUrl}`;

      try {
        await navigator.clipboard.writeText(fullUrl);
        setShareToast({ message: 'Share link copied to clipboard!', ok: true });
      } catch {
        // Clipboard permission denied (e.g. non-HTTPS or browser policy)
        setShareToast({ message: `Share link: ${fullUrl}`, ok: true });
      }
    } catch (err) {
      setShareToast({ message: err.message || 'Failed to create share link', ok: false });
    } finally {
      setSharingId(null);
      setTimeout(() => setShareToast(null), 5000);
    }
  }


  // PDF generator — matches SharedReportPage visual format
  function downloadPDF(record) {
    const reportHtml = renderToString(
      <ReportTemplate report={record} origin={window.location.origin} />,
    );
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DevPulse Report - ${record.repository}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-[#080b14] text-white">
  ${reportHtml}
  <script>
    // Wait slightly for tailwind CDN to parse the classes
    setTimeout(() => { window.print(); }, 1500);

    // Bind print button for when user cancels initial print and wants to print again
    setTimeout(() => {
      const btn = document.getElementById('export-pdf-btn');
      if (btn) btn.onclick = () => window.print();
    }, 100);
  </script>
</body>
</html>`;
    const url = URL.createObjectURL(new Blob([fullHtml], { type: 'text/html' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ─── Logout: clear server-side token then local storage ──────────────────
  async function handleLogout() {
    try {
      await apiRequest('/auth/provider-token', { accessToken, method: 'DELETE' });
    } catch {
      // Best-effort — still log out locally even if the server call fails
    }
    // Clear the persisted last-selected repo key (mirrors the key in DashboardContext)
    try {
      localStorage.removeItem(`devpulse_last_repo_${user?.id}`);
    } catch {}
    onLogout();
  }

  return (
    <div className="flex flex-col h-screen surface-3 overflow-hidden relative">
      {/* ── Rate Limit Ticker ─────────────────────────────────────────────── */}
      <RateLimitTicker />

      {/* ── Share Toast Notification ──────────────────────────────────────── */}
      {shareToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-2xl"
          style={{
            background: shareToast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: shareToast.ok
              ? '1px solid rgba(16,185,129,0.3)'
              : '1px solid rgba(239,68,68,0.3)',
            color: shareToast.ok ? '#10b981' : '#ef4444',
            backdropFilter: 'blur(20px)',
          }}
        >
          {shareToast.ok ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {shareToast.message}
        </div>
      )}

      {/* ── Schedule Modal ────────────────────────────────────────────────── */}
      {scheduleRepo && (
        <ScheduleModal
          repository={scheduleRepo.fullName}
          accessToken={accessToken}
          onClose={() => setScheduleRepo(null)}
          onSuccess={() => setScheduleRepo(null)}
        />
      )}

      {/* Main layout row */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Immersive Ambient Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Animated Radial Gradients */}
          <div
            className="absolute inset-0 animate-ambient-glow"
            style={{
              background:
                'radial-gradient(circle at top right, rgba(59,130,246,.18), transparent 30%), radial-gradient(circle at center, rgba(99,102,241,.12), transparent 40%)',
            }}
          />
          {/* Faint Infrastructure Grid with Breathing */}
          <div
            className="absolute inset-0 animate-grid-breathe"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Signal Lines */}
          <div className="absolute top-[30%] left-0 right-0 h-[1px] bg-white/[0.015] overflow-hidden">
            <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-signal-flow-x" />
          </div>
          <div className="absolute top-[65%] left-0 right-0 h-[1px] bg-white/[0.015] overflow-hidden">
            <div
              className="w-1/3 h-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-signal-flow-x"
              style={{ animationDelay: '3s', animationDuration: '12s' }}
            />
          </div>
          <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-white/[0.015] overflow-hidden">
            <div
              className="h-1/3 w-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-signal-flow-y"
              style={{ animationDelay: '1s' }}
            />
          </div>
          <div className="absolute left-[75%] top-0 bottom-0 w-[1px] bg-white/[0.015] overflow-hidden">
            <div
              className="h-1/3 w-full bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-signal-flow-y"
              style={{ animationDelay: '5s', animationDuration: '15s' }}
            />
          </div>
          {/* Connection Nodes */}
          <div className="absolute top-[30%] left-[25%] w-1 h-1 bg-cyan-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(34,211,238,0.5)] animate-subtle-pulse" />
          <div
            className="absolute top-[30%] left-[75%] w-1 h-1 bg-blue-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-subtle-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-[65%] left-[25%] w-1 h-1 bg-indigo-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(99,102,241,0.5)] animate-subtle-pulse"
            style={{ animationDelay: '2s' }}
          />
          <div
            className="absolute top-[65%] left-[75%] w-1 h-1 bg-cyan-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(34,211,238,0.5)] animate-subtle-pulse"
            style={{ animationDelay: '3s' }}
          />
        </div>

        {/* ─── In-Platform Report Modal ─────────────────────────────────────── */}
        {selectedHistoryRecord &&
          (() => {
            const r = selectedHistoryRecord;
            const sc = r.devpulseScore?.score ?? 'N/A';
            const scColor =
              sc >= 75 ? 'text-emerald-400' : sc >= 50 ? 'text-amber-400' : 'text-red-400';
            const statusBg =
              r.devpulseScore?.status === 'SAFE'
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : r.devpulseScore?.status === 'WARNING'
                  ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                  : 'bg-red-500/10 text-red-400 ring-red-500/20';
            const stgColor = (s) =>
              s === 'success'
                ? 'text-emerald-400'
                : s === 'failure'
                  ? 'text-red-400'
                  : 'text-slate-500';
            const stgLabel = (s) =>
              s === 'success' ? 'Passed' : s === 'failure' ? 'Failed' : 'Skipped';
            const vulns = r.stages?.security?.vulnerabilities || [];
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={() => setSelectedHistoryRecord(null)}
              >
                <div
                  className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1117]/70 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="sticky top-0 z-10 bg-[#0d1117]/40 backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="section-label mb-0.5">Scan Report</p>
                      <h2 className="text-base heading-primary">
                        {r.repository?.split('/')[1] || r.repository}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {r.repository} · {r.branch || 'main'} ·{' '}
                        {new Date(r.timestamp || r.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadPDF(r)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl premium-btn"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                      <button
                        onClick={() => setSelectedHistoryRecord(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-lg font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Score Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'DevPulse Score', value: sc, colorClass: scColor },
                        {
                          label: 'Pipeline Status',
                          value: r.overallStatus?.toUpperCase() || 'N/A',
                          colorClass:
                            r.overallStatus === 'success' ? 'text-emerald-400' : 'text-red-400',
                        },
                        {
                          label: 'Total CVEs',
                          value:
                            (r.stages?.security?.critical || 0) +
                            (r.stages?.security?.high || 0) +
                            (r.stages?.security?.medium || 0),
                          colorClass: 'text-orange-400',
                        },
                      ].map(({ label, value, colorClass }) => (
                        <div key={label} className="surface-2 rounded-2xl p-4 text-center">
                          <div className={`text-3xl font-black ${colorClass}`}>
                            <CountUp value={value} />
                          </div>
                          <div className="section-label mt-1">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 flex items-center gap-2 ${statusBg}`}
                      >
                        <span
                          className={`status-dot animate-status-pulse ${r.devpulseScore?.status === 'SAFE' ? 'bg-emerald-400 text-emerald-400' : r.devpulseScore?.status === 'WARNING' ? 'bg-amber-400 text-amber-400' : 'bg-red-400 text-red-400'}`}
                        />
                        {r.devpulseScore?.status || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-500">CVE breakdown:</span>
                      <span className="text-xs text-red-400 font-bold">
                        {r.stages?.security?.critical || 0} Critical
                      </span>
                      <span className="text-xs text-orange-400 font-bold">
                        {r.stages?.security?.high || 0} High
                      </span>
                      <span className="text-xs text-amber-400 font-bold">
                        {r.stages?.security?.medium || 0} Medium
                      </span>
                    </div>

                    {/* AI Pipeline Insights */}
                    {r.insights?.explanation && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: 'rgba(37,99,235,0.05)',
                          boxShadow: 'inset 0 0 0 1px rgba(37,99,235,0.15)',
                        }}
                      >
                        <p className="section-label mb-[18px]">AI Pipeline Insights</p>
                        <p className="text-sm text-secondary max-w-[65ch] mb-[18px]">
                          {r.insights.explanation}
                        </p>
                      </div>
                    )}

                    {/* AI Analysis (from Analyze Repository button — current session only) */}
                    {(() => {
                      const aiData = analysisResult?.analysis;
                      const sameRepo = selectedRepo?.fullName === r.repository;
                      if (!aiData || !sameRepo) return null;
                      const prob = aiData.failurePrediction?.probability;
                      const probColor =
                        prob >= 70
                          ? 'text-red-400'
                          : prob >= 40
                            ? 'text-amber-400'
                            : 'text-emerald-400';
                      return (
                        <div
                          className="rounded-2xl p-4 space-y-4"
                          style={{
                            background: 'rgba(37,99,235,0.04)',
                            boxShadow: 'inset 0 0 0 1px rgba(56,189,248,0.15)',
                          }}
                        >
                          <p className="section-label">AI Repository Analysis</p>

                          {/* Decision + Probability */}
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black tracking-widest ring-1 ${
                                aiData.decision === 'BLOCK'
                                  ? 'bg-red-500/15 text-red-400 ring-red-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
                              }`}
                            >
                              {aiData.decision}
                            </span>
                            {prob !== undefined && (
                              <span className={`text-sm font-black ${probColor}`}>
                                {Math.round(prob)}% failure probability
                              </span>
                            )}
                          </div>

                          {/* Rationale */}
                          {aiData.failurePrediction?.rationale && (
                            <p className="text-sm text-slate-400 italic leading-relaxed">
                              "{aiData.failurePrediction.rationale}"
                            </p>
                          )}

                          {/* Suggestions */}
                          {aiData.suggestions?.length > 0 && (
                            <div className="space-y-2">
                              <p className="section-label">Remediation Steps</p>
                              {aiData.suggestions.map((s, si) => (
                                <div key={si} className="flex gap-2.5">
                                  <div
                                    className="w-5 h-5 shrink-0 rounded-md text-white flex items-center justify-center text-[10px] font-black"
                                    style={{
                                      background: 'linear-gradient(135deg,#38BDF8,#2563EB)',
                                    }}
                                  >
                                    {si + 1}
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed">{s}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pipeline Stages */}
                    <div className="surface-2 rounded-2xl p-6">
                      <p className="section-label mb-4">Pipeline Stages</p>
                      <div className="space-y-2">
                        {[
                          { name: 'Backend Tests', status: r.stages?.backend?.tests },
                          { name: 'Frontend Build', status: r.stages?.frontend?.build },
                          { name: 'Frontend Tests', status: r.stages?.frontend?.tests },
                          { name: 'Docker Build', status: r.stages?.docker?.build },
                        ].map(({ name, status }) => (
                          <div
                            key={name}
                            className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                          >
                            <span className="text-sm text-slate-400">{name}</span>
                            <span
                              className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${stgColor(status)}`}
                            >
                              <span
                                className={`status-dot animate-status-pulse ${status === 'success' ? 'bg-emerald-400 text-emerald-400' : status === 'failure' ? 'bg-red-400 text-red-400' : 'bg-slate-500 text-slate-500'}`}
                              />
                              {stgLabel(status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score History Chart */}
                    {(() => {
                      const historyForRepo = sidebarHistory.filter(
                        (h) => h.repository === r.repository && h.devpulseScore?.score != null,
                      );
                      if (historyForRepo.length < 2) return null;
                      const chartData = [...historyForRepo]
                        .reverse()
                        .slice(0, 10)
                        .map((h, i) => ({
                          name: `#${i + 1}`,
                          score: h.devpulseScore.score,
                        }));
                      return (
                        <div className="surface-2 rounded-2xl p-6 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-sweep pointer-events-none" />
                          <p className="section-label mb-4">Score History</p>
                          <ResponsiveContainer width="100%" height={100}>
                            <BarChart
                              data={chartData}
                              margin={{ top: 4, right: 0, left: -32, bottom: 0 }}
                            >
                              <XAxis
                                dataKey="name"
                                tick={{ fill: '#475569', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fill: '#475569', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: '#0f1421',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 10,
                                  fontSize: 12,
                                }}
                                labelStyle={{ color: '#94a3b8' }}
                                itemStyle={{ color: '#4F46E5' }}
                              />
                              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell
                                    key={index}
                                    fill={`url(#scoreGrad${index})`}
                                    opacity={0.85}
                                  />
                                ))}
                              </Bar>
                              <defs>
                                {chartData.map((_, index) => (
                                  <linearGradient
                                    key={index}
                                    id={`scoreGrad${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#06B6D4" />
                                  </linearGradient>
                                ))}
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {/* Top Vulnerabilities */}
                    {vulns.length > 0 && (
                      <div className="surface-2 rounded-2xl p-6">
                        <p className="section-label mb-4">Top Vulnerabilities ({vulns.length})</p>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {vulns.slice(0, 20).map((v, vi) => (
                            <div
                              key={vi}
                              className="flex items-start gap-3 p-2 rounded-xl bg-white/[0.02]"
                            >
                              <span
                                className={`shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${
                                  v.severity === 'CRITICAL'
                                    ? 'bg-red-500/10 text-red-400'
                                    : v.severity === 'HIGH'
                                      ? 'bg-orange-500/10 text-orange-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {v.severity}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-300 font-mono truncate">{v.id}</p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {v.pkgName} {v.installedVersion}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {vulns.length === 0 && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> No vulnerabilities found in this scan
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Background with deeper ambient glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#080b14] to-[#080b14]">
          <div className="absolute -top-60 -right-60 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[160px] animate-pulse-glow" />
          <div
            className="absolute -bottom-60 -left-40 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[140px] animate-pulse-glow"
            style={{ animationDelay: '2s' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] animate-breathe" />
        </div>

        {/* Sidebar */}
        <aside
          className="relative z-10 w-[280px] shrink-0 flex flex-col border-r border-slate-400/[0.04] backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
          style={{ background: 'linear-gradient(180deg, rgba(2,6,23,.4), rgba(2,6,23,.6))' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/Logo.png"
                alt="DevPulse"
                className="w-full h-full object-cover"
                width="40"
                height="40"
                loading="eager"
              />
            </div>
            <span
              className="text-base font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              DevPulse
            </span>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
              <input
                className="w-full bg-white/[0.04] ring-1 ring-white/[0.04] focus:ring-blue-500/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 outline-none transition-all"
                onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
                placeholder="Search repos..."
                value={searchTerm}
              />
            </div>
          </div>

          {/* Sidebar Tab Bar */}
          <nav aria-label="Sidebar navigation" className="flex border-b border-white/[0.06]">
            {[
              { id: 'repos', label: 'Repos', icon: null },
              { id: 'history', label: 'History', icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                aria-label={`View ${tab.label}`}
                aria-current={sidebarTab === tab.id ? 'page' : undefined}
                tabIndex={0}
                onClick={() => {
                  setSidebarTab(tab.id);
                  if (tab.id === 'history') fetchSidebarHistory();
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                  sidebarTab === tab.id
                    ? 'text-white border-b-2'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
                style={
                  sidebarTab === tab.id
                    ? {
                        color: '#38BDF8',
                        boxShadow: '0 0 0 1px rgba(56,189,248,.4), 0 0 20px rgba(56,189,248,.15)',
                      }
                    : {}
                }
              >
                {tab.icon && <tab.icon className="w-3 h-3" aria-hidden="true" />}
                {tab.label}
                {tab.id === 'repos' && (
                  <span className="ml-1 text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full">
                    {filtered.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Tab: Repositories */}
          {sidebarTab === 'repos' && (
            <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-[18px]">
              {repoState.status === 'loading' && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">Fetching repositories...</span>
                </div>
              )}
              {repoState.status === 'error' && (
                <div className="mx-2 flex items-start gap-2 bg-red-500/10 ring-1 ring-red-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-300">{repoState.error}</span>
                </div>
              )}
              {filtered.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  isAnalyzing={
                    analysisState.status === 'loading' &&
                    analysisState.targetRepositoryId === repo.id
                  }
                  isLiveScanning={isLiveScanning && scanRoom === `scan_${repo.fullName}`}
                  isSelected={selectedRepositoryId === repo.id}
                  onAnalyze={handleAnalyze}
                  onSchedule={(r) => setScheduleRepo(r)}
                  onSelect={(r) => setSelectedRepositoryId(r.id)}
                  repository={repo}
                />
              ))}
            </div>
          )}

          {/* Tab: Scan History */}
          {sidebarTab === 'history' &&
            (() => {
              const filtered = sidebarHistory.filter((r) => {
                const q = historySearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (r.repository || '').toLowerCase().includes(q) ||
                  (r.branch || '').toLowerCase().includes(q) ||
                  String(r.devpulseScore?.score || '').includes(q) ||
                  (r.devpulseScore?.status || '').toLowerCase().includes(q)
                );
              });
              const allSelected =
                filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

              return (
                <div className="flex-1 overflow-y-auto flex flex-col pb-4">
                  {/* Header row */}
                  <div className="px-4 py-2 flex items-center justify-between shrink-0">
                    <span className="section-label">All Repositories</span>
                    <button
                      onClick={() => fetchSidebarHistory()}
                      className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{ color: '#4F46E5' }}
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="px-3 pb-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                      <input
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search reports..."
                        className="w-full bg-white/[0.03] ring-1 ring-white/[0.04] focus:ring-blue-500/40 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Bulk actions bar */}
                  {filtered.length > 0 && (
                    <div className="px-3 pb-2 flex items-center gap-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedIds((prev) => {
                              const s = new Set(prev);
                              filtered.forEach((r) => s.delete(r.id));
                              return s;
                            });
                          } else {
                            setSelectedIds((prev) => {
                              const s = new Set(prev);
                              filtered.forEach((r) => s.add(r.id));
                              return s;
                            });
                          }
                        }}
                        className="w-3 h-3 rounded accent-blue-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-600 flex-1">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                      </span>
                      {selectedIds.size > 0 && (
                        <button
                          onClick={deleteSelected}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-2 py-1 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete {selectedIds.size}
                        </button>
                      )}
                    </div>
                  )}

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12 text-slate-600 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Loading history...</span>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <History className="w-8 h-8 text-slate-700 mb-3" />
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {historySearch ? 'No records match your search.' : 'No scan history yet.'}
                        <br />
                        {!historySearch && (
                          <span>
                            Run <b>Simulate CI/CD</b> to create the first record.
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="px-2 space-y-1.5 overflow-y-auto flex-1 pb-4">
                      <p className="section-label px-2 mb-1">
                        Auto-deleted after 7 days · {filtered.length} records
                      </p>

                      {filtered.length === 0 && (
                        <div className="mt-4 mx-2 flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-2xl bg-white/[0.01] relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-20 animate-slow-breathe pointer-events-none"
                            style={{
                              backgroundImage:
                                "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMjAgMEwxIDBMMCAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8cGF0aCBkPSJNMCAyMEwwIDFMMSAxIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTQ4LDE2MywxODQsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')",
                            }}
                          />

                          <div className="w-10 h-10 rounded-full bg-[#0f1421] border border-white/5 flex items-center justify-center mb-3 relative overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.05)] z-10">
                            <Activity className="w-4 h-4 text-slate-500 opacity-50" />
                            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent animate-sweep pointer-events-none" />
                          </div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">
                            No pipeline records
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono relative z-10">
                            System monitoring active but no history detected.
                          </p>
                        </div>
                      )}

                      {filtered.map((record, i) => {
                        const sc = record.devpulseScore?.score ?? '–';
                        const scColor =
                          sc >= 75
                            ? 'text-emerald-400'
                            : sc >= 50
                              ? 'text-amber-400'
                              : 'text-red-400';
                        const statusBg =
                          record.devpulseScore?.status === 'SAFE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : record.devpulseScore?.status === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400';
                        const cves =
                          (record.stages?.security?.critical || 0) +
                          (record.stages?.security?.high || 0) +
                          (record.stages?.security?.medium || 0);
                        const isSelected = selectedIds.has(record.id);
                        return (
                          <div
                            key={record.id || i}
                            className={`relative bg-white/[0.01] ring-1 rounded-xl p-3 transition-all ${isSelected ? 'ring-white/10 bg-white/[0.03]' : 'ring-white/[0.03] hover:bg-white/[0.02]'}`}
                            style={
                              isSelected
                                ? {
                                    boxShadow:
                                      'inset 0 0 0 1px rgba(37,99,235,0.3), 0 0 12px rgba(37,99,235,0.1)',
                                  }
                                : {}
                            }
                          >
                            {/* Select checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(record.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-3 left-3 w-3 h-3 rounded accent-blue-500 cursor-pointer"
                            />

                            {/* Clickable report area */}
                            <button
                              onClick={() => setSelectedHistoryRecord(record)}
                              className="w-full text-left pl-5"
                            >
                              {/* Repo name + status */}
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="text-[11px] font-bold text-slate-400 truncate max-w-[120px]"
                                  title={record.repository}
                                >
                                  {record.repository?.split('/')[1] || record.repository}
                                </span>
                                <span
                                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${statusBg}`}
                                >
                                  {record.devpulseScore?.status || 'N/A'}
                                </span>
                              </div>
                              {/* Date */}
                              <div className="text-[10px] text-slate-600 font-mono mb-2">
                                {new Date(record.timestamp || record.receivedAt).toLocaleDateString(
                                  [],
                                  { month: 'short', day: 'numeric' },
                                )}
                                {' · '}
                                {new Date(record.timestamp || record.receivedAt).toLocaleTimeString(
                                  [],
                                  { hour: '2-digit', minute: '2-digit' },
                                )}
                              </div>
                              {/* Score + CVEs */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg font-black ${scColor}`}>
                                  <CountUp value={sc} />
                                </span>
                                <div className="text-[10px] text-slate-600">
                                  <div>
                                    {cves} CVEs · {record.branch || 'main'}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Actions row: PDF + Share + Delete */}
                            <div className="flex items-center gap-1.5 pl-5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPDF(record);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-white px-2 py-1 rounded-lg premium-btn"
                              >
                                <FileDown className="w-3 h-3" /> PDF
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  createShareLink(record);
                                }}
                                disabled={sharingId === record.id}
                                className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-white hover:bg-cyan-500/10 px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                                title="Copy share link"
                              >
                                {sharingId === record.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Share2 className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRecord(record.id);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
                                title="Delete this record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* User footer */}
          <div className="border-t border-white/[0.06] bg-white/[0.01] p-4 group relative">
            {/* Hover Card */}
            <div className="absolute bottom-full left-0 w-full p-4 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none translate-y-2 group-hover:translate-y-0 z-50">
              <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-center">
                  <div>
                    <div className="text-lg font-black text-emerald-400">
                      <CountUp value={user.publicRepos || 0} />
                    </div>
                    <div className="section-label mt-1">Public</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-purple-400">
                      <CountUp value={user.privateRepos || 0} />
                    </div>
                    <div className="section-label mt-1">Private</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-primary">
                      <CountUp value={user.followers || 0} />
                    </div>
                    <div className="section-label mt-1">Followers</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-primary">
                      <CountUp value={user.following || 0} />
                    </div>
                    <div className="section-label mt-1">Following</div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={user.profileUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 hover:bg-white/[0.04] p-2 -m-2 rounded-xl transition-colors"
            >
              {user.avatarUrl ? (
                <div
                  className="rounded-full shrink-0 p-[2px]"
                  style={{
                    background: 'linear-gradient(135deg,#38BDF8,#2563EB)',
                    boxShadow: '0 0 10px rgba(37,99,235,0.3)',
                  }}
                >
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-[44px] h-[44px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg,#38BDF8,#2563EB)',
                    boxShadow: '0 0 10px rgba(37,99,235,0.3)',
                  }}
                >
                  {getInitials(user)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-base font-black truncate w-fit max-w-full"
                  style={{
                    background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {user.username}
                </p>
                <div
                  className="flex items-center gap-1.5 text-[10px] font-bold mt-1 w-fit px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ background: 'linear-gradient(135deg,#38BDF8,#2563EB)' }}
                  ></div>
                  <span
                    style={{
                      background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Connected via GitHub OAuth
                  </span>
                </div>
              </div>
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="w-full max-w-[1800px] p-8 lg:px-12">
            {/* Dashboard header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-subtle-pulse absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                  </span>
                  <p className="section-label">DevPulse Dashboard</p>
                </div>
                <h1 className="text-2xl heading-primary">
                  Welcome back,{' '}
                  <span className="heading-primary">{user.displayName || user.username}</span> 👋
                </h1>
              </div>
              <div className="flex items-center gap-6">
                {/* AI Remediation CTA — shown when we have scan results with vulns */}
                {vulnerabilities.length > 0 && selectedRepo && (
                  <button
                    id="open-ai-remediation"
                    onClick={() => openRemediation(selectedRepo, lastScan?.stages?.security)}
                    className="flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl transition-all relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                      boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                    }}
                  >
                    <Zap className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">AI Remediation</span>
                    <span
                      className="relative z-10 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                      {fixableVulnerabilities.length} fixable
                    </span>
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #8b5cf6)' }}
                    />
                  </button>
                )}

                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="section-label flex items-center justify-end gap-1.5">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Live Sync
                    </p>
                    <p className="text-xs text-slate-400">
                      Synced {repoState.data?.length ?? 0} repos at{' '}
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl active:scale-95 text-white premium-btn"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>

            <AnalysisPanel
              accessToken={accessToken}
              analysisResult={
                analysisState.targetRepositoryId === selectedRepo?.id ? analysisResult : null
              }
              analysisState={
                analysisState.targetRepositoryId === selectedRepo?.id
                  ? analysisState
                  : { status: 'idle', error: null }
              }
              onAnalyze={handleAnalyze}
              repository={selectedRepo}
              sidebarHistory={sidebarHistory}
              onScanComplete={async () => {
                // Refresh sidebar history but DO NOT switch tabs automatically
                setHistorySearch('');
                setSelectedIds(new Set());
                await fetchSidebarHistory();
              }}
            />
          </div>
        </main>
        {/* AI Remediation fullscreen overlay */}
        {showRemediation && (
          <RemediationPage
            accessToken={accessToken}
            repositoryFullName={
              remediationTarget.repo?.fullName ||
              remediationTarget.repo?.full_name ||
              remediationTarget.repo?.nameWithOwner ||
              selectedRepo?.fullName ||
              ''
            }
            scanData={remediationTarget.scanData || lastScan?.stages?.security}
            onBack={() => setShowRemediation(false)}
          />
        )}
      </div>
      {/* end main layout row */}
    </div>
  );
}

export default function DashboardPage({ accessToken, onLogout, onSessionExpired, user }) {
  return (
    <DashboardProvider accessToken={accessToken} user={user} onSessionExpired={onSessionExpired}>
      <DashboardContent accessToken={accessToken} onLogout={onLogout} user={user} />
    </DashboardProvider>
  );
}
