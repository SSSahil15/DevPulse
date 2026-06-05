import { CheckCircle2, ShieldAlert } from 'lucide-react';
import CountUp from './CountUp';

export function ScoreCard({ label, value, colorClass, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-2xl ${className}`} style={className ? {} : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className={`text-3xl font-black tabular-nums ${colorClass}`}>
        <CountUp value={value} />
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
        {label}
      </div>
    </div>
  );
}

export function AIPipelineInsights({ insights }) {
  if (!insights || (!insights.explanation && !insights.rootCause && !insights.suggestions?.length)) {
    return null;
  }
  
  return (
    <div
      className="rounded-2xl p-5 space-y-2 mb-6"
      style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">
        🤖 AI Pipeline Insights
      </p>
      
      {insights.explanation ? (
        <ul className="text-sm text-slate-300 leading-relaxed list-disc ml-4 space-y-1">
          {insights.explanation.split('. ').filter(Boolean).map((sentence, idx) => (
            <li key={idx}>{sentence}{sentence.endsWith('.') ? '' : '.'}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed">No insights generated.</p>
      )}

      {insights.rootCause && (
        <div className="mt-4 bg-red-500/5 ring-1 ring-red-500/20 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 mb-2">
            Root Cause
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">{insights.rootCause}</p>
        </div>
      )}

      {insights.suggestions?.length > 0 && (
        <div className="mt-4 bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 mb-3">
            Recommended Actions
          </p>
          <ul className="space-y-2">
            {insights.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 leading-snug whitespace-pre-wrap">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PipelineStages({ stages }) {
  if (!stages) return null;

  const stageColor = (s) => (s === 'success' ? 'text-emerald-400' : s === 'failure' ? 'text-red-400' : 'text-slate-500');
  const stageLabel = (s) => (s === 'success' ? 'Passed' : s === 'failure' ? 'Failed' : 'Skipped');

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline Stages</p>
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
            <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${stageColor(s)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s === 'success' ? 'bg-emerald-400' : s === 'failure' ? 'bg-red-400' : 'bg-slate-600'}`} />
              {stageLabel(s)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeverityBadge({ severity }) {
  const cfg = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[severity] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cfg}`}>
      {severity}
    </span>
  );
}

export function VulnerabilityList({ vulnerabilities = [], maxItems = 25, criticalCount = 0, highCount = 0 }) {
  if (!vulnerabilities || vulnerabilities.length === 0) {
    return (
      <div className="flex items-center gap-3 text-emerald-400 text-sm font-semibold p-5 rounded-2xl mb-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <CheckCircle2 className="w-5 h-5" /> No vulnerabilities found in this scan — repository is clean
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vulnerabilities ({vulnerabilities.length})</p>
        {(criticalCount > 0 || highCount > 0) && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            ⚠️ Attention required
          </span>
        )}
      </div>
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {vulnerabilities.slice(0, maxItems).map((v, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white/[0.01]">
            <SeverityBadge severity={v.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-sky-400 truncate">{v.id}</p>
              <p className="text-[11px] text-slate-500 truncate">{v.pkgName} {v.installedVersion}</p>
            </div>
            {v.fixedVersion && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                Fix: {v.fixedVersion}
              </span>
            )}
          </div>
        ))}
        {vulnerabilities.length > maxItems && (
          <div className="px-5 py-3 text-center text-[11px] text-slate-600">
            +{vulnerabilities.length - maxItems} more vulnerabilities not shown
          </div>
        )}
      </div>
    </div>
  );
}
