/**
 * SharedReportPage — Public-facing, no-auth-required scan report viewer.
 * Accessible at /report/:token
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  GitBranch,
  Lock,
  Globe,
  Star,
  Code2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function MetricCard({ label, value, color = 'text-white' }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className={`text-3xl font-black tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
        {label}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const cfg =
    {
      CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
      HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }[severity] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span
      className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cfg}`}
    >
      {severity}
    </span>
  );
}

export default function SharedReportPage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading', report: null, error: null });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/reports/${token}`)
      .then(async (r) => {
        if (r.status === 410) {
          const d = await r.json();
          setState({ status: 'expired', report: d, error: null });
          return;
        }
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setState({ status: 'error', report: null, error: d.message || 'Report not found.' });
          return;
        }
        const data = await r.json();
        setState({ status: 'loaded', report: data, error: null });
      })
      .catch((err) => setState({ status: 'error', report: null, error: err.message }));
  }, [token]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm font-semibold">Loading report...</p>
        </div>
      </div>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (state.status === 'expired') {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Report Expired</h1>
          <p className="text-sm text-slate-400 mb-6">
            This report for <strong className="text-slate-200">{state.report?.repository}</strong>{' '}
            has expired. Shared reports are available for 7 days.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: 'white' }}
          >
            Sign in to DevPulse
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Report Not Found</h1>
          <p className="text-sm text-slate-400 mb-6">{state.error}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: 'white' }}
          >
            Go to DevPulse
          </Link>
        </div>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────────
  const r = state.report;
  const score = r.devpulseScore?.score ?? 'N/A';
  const status = r.devpulseScore?.status || 'UNKNOWN';
  const stages = r.stages || {};
  const vulns = stages.security?.vulnerabilities || [];
  const critical = stages.security?.critical || 0;
  const high = stages.security?.high || 0;
  const medium = stages.security?.medium || 0;

  const scoreColor =
    score >= 75
      ? 'text-emerald-400'
      : score >= 50
        ? 'text-amber-400'
        : score >= 25
          ? 'text-orange-400'
          : 'text-red-400';
  const statusStyle =
    status === 'SAFE'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
      : status === 'WARNING'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
        : 'bg-red-500/10 text-red-400 border-red-500/25';

  const stageColor = (s) =>
    s === 'success' ? 'text-emerald-400' : s === 'failure' ? 'text-red-400' : 'text-slate-600';
  const stageLabel = (s) => (s === 'success' ? 'Passed' : s === 'failure' ? 'Failed' : 'Skipped');

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header
        className="relative z-10 border-b border-white/[0.06]"
        style={{ backdropFilter: 'blur(20px)', background: 'rgba(8,11,20,0.7)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/Logo.png" alt="DevPulse" className="w-8 h-8 rounded-lg object-cover" />
            <span
              className="text-base font-black"
              style={{
                background: 'linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              DevPulse
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Shared Report
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-[10px] font-mono text-slate-600">
              Expires {new Date(r.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Repo Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Security Scan Report
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mb-1">
              {r.repository?.split('/')[1] || r.repository}
            </h1>
            <p className="text-sm text-slate-500 font-mono">{r.repository}</p>
          </div>
          <span
            className={`text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${statusStyle}`}
          >
            {status}
          </span>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="DevPulse Score" value={score} color={scoreColor} />
          <MetricCard
            label="Critical CVEs"
            value={critical}
            color={critical > 0 ? 'text-red-400' : 'text-emerald-400'}
          />
          <MetricCard
            label="High CVEs"
            value={high}
            color={high > 0 ? 'text-orange-400' : 'text-emerald-400'}
          />
          <MetricCard
            label="Medium CVEs"
            value={medium}
            color={medium > 0 ? 'text-amber-400' : 'text-emerald-400'}
          />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Generated {new Date(r.createdAt).toLocaleString()}
        </div>

        {/* AI Insights */}
        {r.insights?.explanation && (
          <div
            className="rounded-2xl p-5 space-y-2"
            style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">
              🤖 AI Pipeline Insights
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{r.insights.explanation}</p>
          </div>
        )}

        {/* Pipeline Stages */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="px-5 py-4 border-b border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Pipeline Stages
            </p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[
              { name: 'Backend Tests', status: stages.backend?.tests },
              { name: 'Frontend Build', status: stages.frontend?.build },
              { name: 'Frontend Tests', status: stages.frontend?.tests },
              { name: 'Docker Build', status: stages.docker?.build },
            ].map(({ name, status: s }) => (
              <div key={name} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-400">{name}</span>
                <span
                  className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${stageColor(s)}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${s === 'success' ? 'bg-emerald-400' : s === 'failure' ? 'bg-red-400' : 'bg-slate-600'}`}
                  />
                  {stageLabel(s)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerabilities */}
        {vulns.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Vulnerabilities ({vulns.length})
              </p>
              {(critical > 0 || high > 0) && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                  ⚠️ Attention required
                </span>
              )}
            </div>
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {vulns.slice(0, 25).map((v, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <SeverityBadge severity={v.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-sky-400 truncate">{v.id}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {v.pkgName} {v.installedVersion}
                    </p>
                  </div>
                  {v.fixedVersion && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      Fix: {v.fixedVersion}
                    </span>
                  )}
                </div>
              ))}
              {vulns.length > 25 && (
                <div className="px-5 py-3 text-center text-[11px] text-slate-600">
                  +{vulns.length - 25} more vulnerabilities not shown
                </div>
              )}
            </div>
          </div>
        )}

        {vulns.length === 0 && (
          <div
            className="flex items-center gap-3 text-emerald-400 text-sm font-semibold p-5 rounded-2xl"
            style={{
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <CheckCircle2 className="w-5 h-5" />
            No vulnerabilities found in this scan — repository is clean
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">Want to scan your own repositories?</div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-black px-6 py-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              boxShadow: '0 0 24px rgba(99,102,241,0.3)',
            }}
          >
            <Shield className="w-4 h-4" />
            Try DevPulse Free
          </Link>
        </div>
      </main>
    </div>
  );
}
