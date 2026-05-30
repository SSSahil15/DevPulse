import { useState, useEffect } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  ChevronRight,
  Zap,
  ExternalLink,
  Info,
  CheckCircle2,
  GitPullRequest,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const SEV_CONFIG = {
  CRITICAL: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    ring: 'rgba(239,68,68,0.25)',
    label: 'CRITICAL',
  },
  HIGH: {
    color: '#f97316',
    bg: 'rgba(249,115,22,0.10)',
    ring: 'rgba(249,115,22,0.25)',
    label: 'HIGH',
  },
  MEDIUM: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    ring: 'rgba(245,158,11,0.25)',
    label: 'MEDIUM',
  },
  LOW: {
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    ring: 'rgba(96,165,250,0.20)',
    label: 'LOW',
  },
};

function ConfidenceRing({ score }) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease',
            filter: `drop-shadow(0 0 4px ${color}80)`,
          }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums"
        style={{ color }}
      >
        {score}%
      </span>
    </div>
  );
}

function AIExplanationCard({ explanation, loading, onFetch }) {
  if (loading) {
    return (
      <div
        className="rounded-xl p-5 flex flex-col items-center gap-3"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)' }}
      >
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <p className="text-xs text-slate-500 text-center">AI is analysing this vulnerability…</p>
        <p className="text-[10px] text-slate-600">Powered by Groq · llama-3.3-70b</p>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center gap-4 text-center"
        style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.1)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))',
          }}
        >
          🤖
        </div>
        <div>
          <p className="text-sm font-black text-white mb-1">AI Security Analysis</p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-[260px]">
            Get an instant explanation of this CVE — impact, exploit scenario, and remediation
            steps.
          </p>
        </div>
        <button
          onClick={onFetch}
          className="flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.25))',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc',
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          Analyse with AI
        </button>
      </div>
    );
  }

  const urgencyColor =
    {
      IMMEDIATE: '#ef4444',
      SOON: '#f59e0b',
      SCHEDULED: '#60a5fa',
    }[explanation.urgency] || '#60a5fa';

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
          🤖 AI Analysis
        </span>
        {explanation.urgency && (
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest"
            style={{ background: `${urgencyColor}20`, color: urgencyColor }}
          >
            {explanation.urgency}
          </span>
        )}
      </div>

      {explanation.tldr && (
        <p className="text-sm text-slate-200 leading-relaxed font-medium">{explanation.tldr}</p>
      )}

      <div className="space-y-2">
        {explanation.impact && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
              Impact
            </p>
            <p className="text-[12px] text-slate-400">{explanation.impact}</p>
          </div>
        )}
        {explanation.exploitScenario && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
              Exploit Scenario
            </p>
            <p className="text-[12px] text-slate-400 italic">{explanation.exploitScenario}</p>
          </div>
        )}
      </div>

      {explanation.remediationSteps && explanation.remediationSteps.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1.5">
            Remediation Steps
          </p>
          <div className="space-y-1">
            {explanation.remediationSteps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div
                  className="w-4 h-4 shrink-0 rounded flex items-center justify-center text-[9px] font-black mt-0.5"
                  style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}
                >
                  {i + 1}
                </div>
                <p className="text-[11px] text-slate-400">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemediationDrawer({
  vuln,
  patch,
  onClose,
  onGeneratePR,
  aiExplanation: externalAIExplanation,
  aiLoading: externalAILoading,
  status,
  accessToken,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [localAI, setLocalAI] = useState(null);
  const [localAILoading, setLocalAILoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Reset local AI state whenever the selected vuln changes
  useEffect(() => {
    setLocalAI(null);
    setAiError(null);
    setActiveTab('overview');
  }, [vuln?.id]);

  if (!vuln) return null;

  // Merge external (post-job) explanation with on-demand local one
  const aiExplanation = externalAIExplanation || localAI;
  const aiLoading = externalAILoading || localAILoading;

  async function fetchAI() {
    if (aiExplanation || aiLoading) return;
    setLocalAILoading(true);
    setAiError(null);
    try {
      // Use relative URL — goes through Vite proxy to backend (avoids CORS)
      const token = accessToken || localStorage.getItem('devpulse_token');
      const res = await fetch('/api/remediation/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ vuln }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLocalAI(data.explanation);
    } catch (err) {
      setAiError(err.message || 'AI analysis failed. Please try again.');
    } finally {
      setLocalAILoading(false);
    }
  }

  const sevConfig = SEV_CONFIG[vuln.severity] || SEV_CONFIG.LOW;
  const hasFixedVersion = !!(vuln.fixedVersion || patch?.toVersion);
  const fixVersion = patch?.toVersion || vuln.fixedVersion;
  const confidenceScore = patch?.confidenceScore ?? null;
  const breakingRisk = patch?.breakingRisk ?? null;
  const breakingReason = patch?.breakingReason ?? null;
  const isRunning = status === 'running';

  // Build smart reference links from the CVE/GHSA ID + stored references
  function buildRefs(vuln) {
    const stored = vuln.references || [];
    const id = vuln.id || '';
    const extra = [];
    if (/^CVE-/i.test(id)) {
      extra.push(
        {
          label: 'NVD',
          icon: '🏛️',
          color: '#60a5fa',
          url: `https://nvd.nist.gov/vuln/detail/${id}`,
        },
        {
          label: 'MITRE',
          icon: '🔐',
          color: '#a78bfa',
          url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${id}`,
        },
        { label: 'OSV', icon: '🗃️', color: '#34d399', url: `https://osv.dev/vulnerability/${id}` },
      );
    }
    if (/^GHSA-/i.test(id)) {
      extra.push(
        {
          label: 'GitHub Advisory',
          icon: '⚫',
          color: '#e2e8f0',
          url: `https://github.com/advisories/${id}`,
        },
        { label: 'OSV', icon: '🗃️', color: '#34d399', url: `https://osv.dev/vulnerability/${id}` },
      );
    }
    if (vuln.pkgName) {
      const eco = vuln.ecosystem === 'pip' ? 'pip' : 'npm';
      extra.push({
        label: 'Snyk',
        icon: '🛡️',
        color: '#7c3aed',
        url: `https://security.snyk.io/package/${eco}/${vuln.pkgName}`,
      });
    }
    // Deduplicate stored refs and append extra
    const seen = new Set(extra.map((e) => e.url));
    const storedItems = stored
      .filter((u) => u && u.startsWith('http') && !seen.has(u))
      .map((u) => {
        seen.add(u);
        return { label: null, icon: null, color: null, url: u };
      });
    return [...extra, ...storedItems];
  }

  const smartRefs = buildRefs(vuln);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai', label: 'AI Analysis', onClick: fetchAI },
    { id: 'references', label: `References (${smartRefs.length})` },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(8,11,20,0.97) 0%, rgba(10,14,25,0.98) 100%)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="shrink-0 px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: sevConfig.bg,
                  color: sevConfig.color,
                  boxShadow: `inset 0 0 0 1px ${sevConfig.ring}`,
                }}
              >
                {sevConfig.label}
              </span>
              <code className="text-xs font-mono text-sky-400">{vuln.id}</code>
            </div>
            <h3 className="text-sm font-black text-white leading-snug line-clamp-2">
              {vuln.title || vuln.id}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {vuln.pkgName} · {vuln.installedVersion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="shrink-0 grid grid-cols-3 gap-px"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {[
            {
              label: 'Installed',
              value: vuln.installedVersion || '—',
              sub: vuln.pkgName,
              color: '#ef4444',
            },
            {
              label: 'Fixed In',
              value: fixVersion || 'No fix',
              sub: hasFixedVersion ? 'Available' : 'Manual fix needed',
              color: hasFixedVersion ? '#10b981' : '#f59e0b',
            },
            {
              label: 'CVSS Score',
              value: vuln.cvssScore ? vuln.cvssScore.toFixed(1) : 'N/A',
              sub: vuln.cvssScore >= 9 ? 'Critical' : vuln.cvssScore >= 7 ? 'High' : 'Medium',
              color: vuln.cvssScore >= 9 ? '#ef4444' : vuln.cvssScore >= 7 ? '#f97316' : '#f59e0b',
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="px-4 py-3"
              style={{ background: 'rgba(8,11,20,0.8)' }}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">
                {metric.label}
              </p>
              <p className="text-sm font-black font-mono" style={{ color: metric.color }}>
                {metric.value}
              </p>
              <p className="text-[10px] text-slate-600 truncate">{metric.sub}</p>
            </div>
          ))}
        </div>

        {hasFixedVersion && (
          <div
            className="shrink-0 px-5 py-3 flex items-center gap-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1.5">
                Upgrade Path
              </p>
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-red-400/80 line-through">{vuln.installedVersion}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-emerald-400 font-black">{fixVersion}</span>
              </div>
            </div>
            {confidenceScore !== null && (
              <div className="shrink-0 flex flex-col items-center gap-1">
                <ConfidenceRing score={confidenceScore} />
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                  Confidence
                </p>
              </div>
            )}
          </div>
        )}

        <div className="shrink-0 flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                tab.onClick?.();
              }}
              className="flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                color: activeTab === tab.id ? '#38bdf8' : '#334155',
                borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                background: activeTab === tab.id ? 'rgba(56,189,248,0.04)' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'overview' && (
            <>
              {vuln.description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">
                    Description
                  </p>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{vuln.description}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'ai' && (
            <>
              {aiError && (
                <div
                  className="rounded-xl p-3 flex items-start gap-2 mb-2"
                  style={{
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-red-300 mb-1">{aiError}</p>
                    <button
                      onClick={fetchAI}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                </div>
              )}
              <AIExplanationCard
                explanation={aiExplanation}
                loading={aiLoading}
                onFetch={fetchAI}
              />
            </>
          )}

          {activeTab === 'references' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">
                {smartRefs.length} Reference{smartRefs.length !== 1 ? 's' : ''}
              </p>
              {smartRefs.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl transition-all group"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
                  }}
                >
                  {ref.icon && ref.label ? (
                    <span
                      className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest"
                      style={{ background: `${ref.color}18`, color: ref.color }}
                    >
                      {ref.icon} {ref.label}
                    </span>
                  ) : (
                    <ExternalLink className="w-3 h-3 shrink-0 text-slate-600" />
                  )}
                  <span className="flex-1 min-w-0 text-[11px] font-mono text-slate-500 truncate group-hover:text-sky-400 transition-colors">
                    {ref.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-700 group-hover:text-sky-400 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          className="shrink-0 px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {isRunning ? (
            <div
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-black"
              style={{
                background: 'rgba(59,130,246,0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Remediation in progress...
            </div>
          ) : hasFixedVersion ? (
            <button
              onClick={() => onGeneratePR && onGeneratePR(vuln)}
              className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                boxShadow: '0 0 28px rgba(99,102,241,0.35), 0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Generate Fix PR
              </span>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'linear-gradient(135deg, #2563eb, #8b5cf6)' }}
              />
            </button>
          ) : (
            <div
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Info className="w-4 h-4" />
              Manual fix required
            </div>
          )}
        </div>
      </div>
    </>
  );
}
