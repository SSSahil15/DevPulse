import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Filter,
  Zap,
  AlertTriangle,
  CheckCircle2,
  GitPullRequest,
  ExternalLink,
  RefreshCw,
  Info,
  Search,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import { useRemediation } from '../hooks/useRemediation';
import RemediationTimeline from '../components/RemediationTimeline';
import GitHubPRPreview from '../components/GitHubPRPreview';
import RemediationDrawer from '../components/RemediationDrawer';

const SEV_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical', icon: ShieldAlert },
  HIGH: { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'High', icon: ShieldAlert },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Medium', icon: Shield },
  LOW: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', label: 'Low', icon: ShieldCheck },
};

function VulnRow({ vuln, patch, onClick, isSelected }) {
  const cfg = SEV_CONFIG[vuln.severity] || SEV_CONFIG.LOW;
  const Icon = cfg.icon;

  return (
    <button
      onClick={() => onClick(vuln)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-xl group"
      style={{
        background: isSelected ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.01)',
        border: isSelected ? '1px solid rgba(37,99,235,0.25)' : '1px solid rgba(255,255,255,0.04)',
        boxShadow: isSelected ? '0 0 12px rgba(37,99,235,0.08)' : 'none',
      }}
    >
      {/* Severity icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: cfg.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
      </div>

      {/* Package info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest shrink-0"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {vuln.severity}
          </span>
          <span className="text-xs font-mono text-sky-400/80 truncate">{vuln.id}</span>
        </div>
        <p className="text-xs font-bold text-slate-300 truncate">{vuln.pkgName}</p>
        <p className="text-[10px] font-mono text-slate-600 truncate">
          v{vuln.installedVersion}
          {patch?.toVersion && (
            <>
              <span className="mx-1 text-slate-700">→</span>
              <span className="text-emerald-500/70">v{patch.toVersion}</span>
            </>
          )}
        </p>
      </div>

      {/* Fix indicator */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {vuln.hasFixedVersion ? (
          <span
            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
          >
            Fixable
          </span>
        ) : (
          <span
            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}
          >
            Manual
          </span>
        )}
        {patch?.confidenceScore != null && (
          <span className="text-[9px] text-slate-600 font-mono">{patch.confidenceScore}%</span>
        )}
      </div>
    </button>
  );
}

function ErrorBanner({ error, errorCode, needsReAuth, retryable, onRetry }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: 'rgba(239,68,68,0.07)',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-300 mb-1">
          {needsReAuth ? 'GitHub Permissions Required' : 'Remediation Failed'}
        </p>
        <p className="text-xs text-slate-400 mb-3">{error}</p>
        {needsReAuth ? (
          <a
            href="/auth/github"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Reconnect GitHub with repo write access <ExternalLink className="w-3 h-3" />
          </a>
        ) : retryable && onRetry ? (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function RemediationPage({ accessToken, repositoryFullName, scanData, onBack }) {
  const rem = useRemediation(accessToken);

  const [selectedVuln, setSelectedVuln] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [activePanel, setActivePanel] = useState('vulns'); // vulns | preview
  const [remediationTargets, setRemediationTargets] = useState([]);

  // Parse all vulnerabilities from scan data
  const allVulns = useMemo(() => {
    if (!scanData) return [];

    // Support simplified database format (from pipeline results DB)
    if (Array.isArray(scanData.vulnerabilities)) {
      return scanData.vulnerabilities.map((v) => ({
        id: v.id || v.VulnerabilityID,
        title: v.title || v.id || v.VulnerabilityID,
        description: v.description || '',
        severity: v.severity || 'UNKNOWN',
        pkgName: v.pkgName,
        installedVersion: v.installedVersion,
        fixedVersion: v.fixedVersion || null,
        hasFixedVersion: !!v.fixedVersion?.trim(),
        references: v.references || [],
        cvssScore: v.cvssScore || null,
        ecosystem:
          v.ecosystem ||
          (v.target?.toLowerCase().includes('npm') || v.pkgName?.startsWith('@') ? 'npm' : 'pip'),
      }));
    }

    // Support standard raw Trivy JSON output
    if (scanData.Results) {
      const vulns = [];
      scanData.Results.forEach((result) => {
        (result.Vulnerabilities || []).forEach((v) => {
          vulns.push({
            id: v.VulnerabilityID,
            title: v.Title || v.VulnerabilityID,
            description: v.Description || '',
            severity: v.Severity || 'UNKNOWN',
            pkgName: v.PkgName,
            installedVersion: v.InstalledVersion,
            fixedVersion: v.FixedVersion || null,
            hasFixedVersion: !!v.FixedVersion?.trim(),
            references: v.References || [],
            cvssScore: v.CVSS?.nvd?.V3Score || v.CVSS?.redhat?.V3Score || null,
            ecosystem: result.Type?.toLowerCase().includes('npm') ? 'npm' : 'pip',
          });
        });
      });
      return vulns;
    }

    return [];
  }, [scanData]);

  // Filter vulns
  const filteredVulns = useMemo(() => {
    return allVulns.filter((v) => {
      if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false;
      if (
        searchTerm &&
        !v.pkgName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !v.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allVulns, severityFilter, searchTerm]);

  // Summary stats
  const stats = useMemo(
    () => ({
      total: allVulns.length,
      critical: allVulns.filter((v) => v.severity === 'CRITICAL').length,
      high: allVulns.filter((v) => v.severity === 'HIGH').length,
      fixable: allVulns.filter((v) => v.hasFixedVersion).length,
    }),
    [allVulns],
  );

  // Get patch info for a vuln
  const getPatch = useCallback(
    (vuln) => {
      return rem.patches?.find((p) => p.packageName === vuln.pkgName);
    },
    [rem.patches],
  );

  // Get AI explanation for a vuln
  const getAIExplanation = useCallback(
    (vuln) => {
      return rem.aiExplanations?.[vuln.id] || null;
    },
    [rem.aiExplanations],
  );

  // Handle "Generate Fix PR" for a single vuln
  function handleGeneratePR(vuln) {
    setShowTimeline(true);
    setActivePanel('vulns');
    setRemediationTargets([vuln.id]);
    rem.startDryRun(repositoryFullName, { vulnerabilities: allVulns }, [vuln.id]);
  }

  // Handle "Fix All" — batch all fixable critical+high
  function handleFixAll() {
    const targets = allVulns
      .filter((v) => v.hasFixedVersion && (v.severity === 'CRITICAL' || v.severity === 'HIGH'))
      .map((v) => v.id);
    setShowTimeline(true);
    setActivePanel('vulns');
    setRemediationTargets(targets);
    rem.startDryRun(repositoryFullName, { vulnerabilities: allVulns }, targets);
  }

  // Handle confirm (after dry-run review)
  function handleConfirmPR() {
    rem.confirmAndCreatePR(repositoryFullName, { vulnerabilities: allVulns }, remediationTargets);
    setActivePanel('preview');
  }

  // Switch to preview panel when dry run completes
  useEffect(() => {
    if (rem.status === 'dry_run_complete') {
      setActivePanel('preview');
    }
  }, [rem.status]);

  const severityFilters = [
    { id: 'ALL', label: `All (${allVulns.length})` },
    { id: 'CRITICAL', label: `Critical (${stats.critical})`, color: '#ef4444' },
    { id: 'HIGH', label: `High (${stats.high})`, color: '#f97316' },
    {
      id: 'MEDIUM',
      label: `Medium (${allVulns.filter((v) => v.severity === 'MEDIUM').length})`,
      color: '#f59e0b',
    },
    {
      id: 'LOW',
      label: `Low (${allVulns.filter((v) => v.severity === 'LOW').length})`,
      color: '#60a5fa',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #080b14 0%, #060910 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-red-600/6 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <div
        className="shrink-0 relative z-10 flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold">Dashboard</span>
        </button>

        <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.3))',
            }}
          >
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">AI Remediation</h1>
            <p className="text-[10px] text-slate-500 font-mono">{repositoryFullName}</p>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-2 ml-auto">
          {[
            {
              label: `${stats.critical} Critical`,
              color: '#ef4444',
              bg: 'rgba(239,68,68,0.12)',
              show: stats.critical > 0,
            },
            {
              label: `${stats.high} High`,
              color: '#f97316',
              bg: 'rgba(249,115,22,0.10)',
              show: stats.high > 0,
            },
            {
              label: `${stats.fixable} Fixable`,
              color: '#10b981',
              bg: 'rgba(16,185,129,0.12)',
              show: stats.fixable > 0,
            },
          ]
            .filter((s) => s.show)
            .map((chip) => (
              <span
                key={chip.label}
                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: chip.bg, color: chip.color }}
              >
                {chip.label}
              </span>
            ))}

          {/* Fix All CTA */}
          {stats.fixable > 0 && rem.status === 'idle' && (
            <button
              onClick={handleFixAll}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl transition-all relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                boxShadow: '0 0 20px rgba(99,102,241,0.3)',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              Fix All Critical &amp; High
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #2563eb, #8b5cf6)' }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* ─── Left Panel: Vulnerability List ─────────────────────────────── */}
        <div
          className="flex flex-col border-r"
          style={{
            width: showTimeline ? '280px' : '360px',
            borderColor: 'rgba(255,255,255,0.05)',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Filters */}
          <div
            className="shrink-0 p-3 space-y-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search CVE or package..."
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-all"
              />
            </div>
            {/* Severity tabs */}
            <div className="flex gap-1 flex-wrap">
              {severityFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSeverityFilter(f.id)}
                  className="text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all"
                  style={{
                    background:
                      severityFilter === f.id
                        ? f.color
                          ? `${f.color}20`
                          : 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.03)',
                    color: severityFilter === f.id ? f.color || '#e2e8f0' : '#475569',
                    border:
                      severityFilter === f.id
                        ? `1px solid ${f.color ? `${f.color}30` : 'rgba(255,255,255,0.12)'}`
                        : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vuln list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredVulns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <ShieldCheck className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-xs text-slate-500">No vulnerabilities match your filter</p>
              </div>
            ) : (
              filteredVulns.map((vuln) => (
                <VulnRow
                  key={vuln.id}
                  vuln={vuln}
                  patch={getPatch(vuln)}
                  isSelected={selectedVuln?.id === vuln.id}
                  onClick={(v) => {
                    setSelectedVuln(v);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── Center Panel: Timeline ──────────────────────────────────────── */}
        {showTimeline && (
          <div
            className="flex flex-col border-r shrink-0"
            style={{
              width: '280px',
              borderColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Progress
              </p>
              {(rem.status === 'complete' || rem.status === 'error') && (
                <button
                  onClick={rem.reset}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <RemediationTimeline
                stage={rem.stage}
                progress={rem.progress}
                message={rem.message}
                status={rem.status}
                logs={rem.logs}
                currentVuln={rem.currentVuln}
              />
            </div>
          </div>
        )}

        {/* ─── Right Panel: Preview / Empty ────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Panel tab bar */}
          {showTimeline && (rem.status === 'dry_run_complete' || rem.status === 'complete') && (
            <div
              className="shrink-0 flex"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {[
                { id: 'preview', label: 'PR Preview' },
                { id: 'vulns', label: 'Vuln Details' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className="px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    color: activePanel === tab.id ? '#38bdf8' : '#334155',
                    borderBottom:
                      activePanel === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div
            className={`flex-1 flex flex-col p-6 ${activePanel === 'preview' && (rem.status === 'dry_run_complete' || rem.status === 'complete') ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {/* Error state */}
            {rem.status === 'error' && (
              <ErrorBanner
                error={rem.error}
                errorCode={rem.errorCode}
                needsReAuth={rem.needsReAuth}
                retryable={rem.retryable}
                onRetry={() => rem.startDryRun(repositoryFullName, { vulnerabilities: allVulns }, remediationTargets)}
              />
            )}

            {/* PR Preview panel */}
            {activePanel === 'preview' &&
              (rem.status === 'dry_run_complete' || rem.status === 'complete') && (
                <GitHubPRPreview
                  prTitle={rem.prTitle}
                  prDescription={rem.prDescription}
                  prUrl={rem.prUrl}
                  prNumber={rem.prNumber}
                  branchName={rem.branchName}
                  commitMessage={rem.commitMessage}
                  patches={rem.patches}
                  diffPreviews={rem.diffPreviews}
                  aiSummary={rem.aiSummary}
                  rollbackWarnings={rem.rollbackWarnings}
                  status={rem.status}
                  onConfirmPR={handleConfirmPR}
                />
              )}

            {/* ── PR CREATED: Full-screen success celebration ─────────────── */}
            {rem.status === 'complete' && rem.prUrl && activePanel !== 'preview' && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
                {/* Glow ring */}
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full blur-2xl animate-pulse"
                    style={{ background: 'rgba(16,185,129,0.25)', transform: 'scale(1.8)' }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(5,150,105,0.3), rgba(16,185,129,0.2))',
                      border: '2px solid rgba(16,185,129,0.4)',
                      boxShadow: '0 0 40px rgba(16,185,129,0.3)',
                    }}
                  >
                    <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">
                    Remediation Complete
                  </p>
                  <h2 className="text-2xl font-black text-white mb-2">Pull Request Created! 🚀</h2>
                  <p className="text-sm text-slate-400 max-w-xs">
                    DevPulse AI has automatically generated and opened a security fix PR on GitHub.
                  </p>
                </div>

                {/* PR Meta Cards */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                  {[
                    {
                      label: 'PR Number',
                      value: rem.prNumber ? `#${rem.prNumber}` : '—',
                      color: '#38bdf8',
                    },
                    { label: 'Packages Fixed', value: rem.patchCount || '—', color: '#10b981' },
                    {
                      label: 'Branch',
                      value: rem.branchName ? rem.branchName.split('/').pop() : '—',
                      color: '#a78bfa',
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <span className="text-lg font-black font-mono" style={{ color }}>
                        {value}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-600 mt-0.5">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Commit SHA */}
                {rem.commitSha && (
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-mono"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#64748b',
                    }}
                  >
                    <GitPullRequest className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{rem.commitSha}</span>
                  </div>
                )}

                {/* CTA buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <a
                    href={rem.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm font-black py-3.5 rounded-2xl transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #0d9488)',
                      boxShadow: '0 0 24px rgba(5,150,105,0.4)',
                      color: 'white',
                    }}
                  >
                    <GitPullRequest className="w-4 h-4" />
                    Review Pull Request on GitHub
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                  <button
                    onClick={() => setActivePanel('preview')}
                    className="flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-2xl transition-all text-slate-400 hover:text-white"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    View Diff Preview
                  </button>
                  <button
                    onClick={() => rem.reset()}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
                  >
                    Start another remediation
                  </button>
                </div>
              </div>
            )}

            {/* Idle / initial state */}
            {rem.status === 'idle' && !selectedVuln && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  <Shield className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-lg font-black text-white mb-2">AI Remediation Copilot</h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
                  Select a vulnerability from the left panel and click{' '}
                  <strong className="text-slate-300">Generate Fix PR</strong> to automatically
                  create a remediation branch and pull request on GitHub.
                </p>
                <div className="flex flex-col gap-2.5 text-left w-full max-w-xs">
                  {[
                    '🔍 Parses Trivy scan data',
                    '🤖 AI explains each CVE',
                    '📦 Resolves safe upgrade versions',
                    '👁️ Shows diff preview first',
                    '🚀 Opens GitHub PR automatically',
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm text-slate-400 px-4 py-2.5 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remediation Drawer */}
      {selectedVuln && (
        <RemediationDrawer
          vuln={selectedVuln}
          patch={getPatch(selectedVuln)}
          aiExplanation={getAIExplanation(selectedVuln)}
          aiLoading={rem.status === 'running' && rem.stage === 'ai_analysis'}
          status={rem.status}
          accessToken={accessToken}
          onClose={() => setSelectedVuln(null)}
          onGeneratePR={handleGeneratePR}
        />
      )}
    </div>
  );
}
