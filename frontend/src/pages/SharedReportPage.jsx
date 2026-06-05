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
import { ScoreCard, AIPipelineInsights, PipelineStages, VulnerabilityList } from '../components/ReportComponents';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
          <ScoreCard label="DevPulse Score" value={score} colorClass={scoreColor} />
          <ScoreCard
            label="Critical CVEs"
            value={critical}
            colorClass={critical > 0 ? 'text-red-400' : 'text-emerald-400'}
          />
          <ScoreCard
            label="High CVEs"
            value={high}
            colorClass={high > 0 ? 'text-orange-400' : 'text-emerald-400'}
          />
          <ScoreCard
            label="Medium CVEs"
            value={medium}
            colorClass={medium > 0 ? 'text-amber-400' : 'text-emerald-400'}
          />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Generated {new Date(r.createdAt).toLocaleString()}
        </div>

        {/* AI Insights */}
        <AIPipelineInsights insights={r.insights} />

        {/* Pipeline Stages */}
        <PipelineStages stages={stages} />

        {/* Vulnerabilities */}
        <VulnerabilityList
          vulnerabilities={vulns}
          criticalCount={critical}
          highCount={high}
        />

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
