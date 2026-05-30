import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  CheckCheck,
  GitBranch,
  GitPullRequest,
  FileCode,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

function DiffLine({ line }) {
  const isAdd = line.startsWith('+') && !line.startsWith('+++');
  const isRemove = line.startsWith('-') && !line.startsWith('---');
  const isMeta = line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@');

  return (
    <div
      className="flex text-[11px] font-mono leading-relaxed px-3 py-0.5 select-text"
      style={{
        background: isAdd
          ? 'rgba(16,185,129,0.08)'
          : isRemove
            ? 'rgba(239,68,68,0.08)'
            : isMeta
              ? 'rgba(59,130,246,0.08)'
              : 'transparent',
        borderLeft: isAdd
          ? '2px solid #10b981'
          : isRemove
            ? '2px solid #ef4444'
            : isMeta
              ? '2px solid #3b82f6'
              : '2px solid transparent',
      }}
    >
      <span
        className="mr-3 w-3 shrink-0 font-black"
        style={{
          color: isAdd ? '#10b981' : isRemove ? '#ef4444' : isMeta ? '#3b82f6' : '#334155',
        }}
      >
        {isAdd ? '+' : isRemove ? '−' : isMeta ? '~' : ' '}
      </span>
      <span
        style={{ color: isAdd ? '#6ee7b7' : isRemove ? '#fca5a5' : isMeta ? '#93c5fd' : '#64748b' }}
      >
        {line.replace(/^[+\-]/, '')}
      </span>
    </div>
  );
}

function DiffViewer({ diff, filePath }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = (diff || '').split('\n').filter(Boolean);
  const addCount = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const removeCount = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  function copyDiff() {
    navigator.clipboard.writeText(diff || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* File header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'rgba(15,20,40,0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-mono text-slate-400 truncate">{filePath}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-bold" style={{ color: '#10b981' }}>
            +{addCount}
          </span>
          <span className="text-[11px] font-bold" style={{ color: '#ef4444' }}>
            −{removeCount}
          </span>
          <button
            onClick={copyDiff}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Copy diff"
          >
            {copied ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Diff content */}
      {!collapsed && (
        <div className="overflow-y-auto max-h-64 py-1" style={{ background: 'rgba(8,11,20,0.8)' }}>
          {lines.length === 0 ? (
            <p className="text-center text-slate-600 text-xs py-4">No changes detected</p>
          ) : (
            lines.map((line, i) => <DiffLine key={i} line={line} />)
          )}
        </div>
      )}
    </div>
  );
}

function PRDescriptionPreview({ description }) {
  const [expanded, setExpanded] = useState(false);

  if (!description) return null;

  // Very simple markdown → HTML (tables, bold, code)
  const rendered = description
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`(.+?)`/g,
      "<code class='bg-white/5 px-1 rounded text-[11px] font-mono text-sky-300'>$1</code>",
    )
    .replace(/^#{1,3} (.+)$/gm, "<p class='text-white font-black text-sm mt-3 mb-1'>$1</p>")
    .replace(
      /^- \[ \] (.+)$/gm,
      "<div class='flex gap-2 text-slate-400 text-[12px]'><span>☐</span><span>$1</span></div>",
    )
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'rgba(15,20,40,0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-xs font-bold text-slate-400">PR Description Preview</span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-[10px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: '#4f46e5' }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[600px]' : 'max-h-40'}`}
        style={{ background: 'rgba(8,11,20,0.6)' }}
      >
        <div
          className="px-4 py-4 text-[12px] text-slate-400 leading-relaxed overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </div>
  );
}

export default function GitHubPRPreview({
  prTitle,
  prDescription,
  prUrl,
  prNumber,
  branchName,
  baseBranch,
  commitMessage,
  patches,
  diffPreviews,
  aiSummary,
  rollbackWarnings,
  onConfirmPR,
  status,
}) {
  const [editedTitle, setEditedTitle] = useState(prTitle || '');
  const [copied, setCopied] = useState(false);

  // Update title when prop changes
  if (prTitle && editedTitle === '' && editedTitle !== prTitle) {
    setEditedTitle(prTitle);
  }

  const isLive = !!prUrl;
  const hasWarnings = rollbackWarnings && Object.keys(rollbackWarnings).length > 0;
  const highRiskPatches = (patches || []).filter((p) => p.breakingRisk === 'HIGH');

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
        {/* PR Header */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(15,20,40,0.7)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                  border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                }}
              >
                <GitPullRequest
                  className="w-4 h-4"
                  style={{ color: isLive ? '#10b981' : '#3b82f6' }}
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isLive ? `Pull Request #${prNumber}` : 'PR Preview'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                      color: isLive ? '#10b981' : '#60a5fa',
                    }}
                  >
                    {isLive ? '✓ Open' : 'Preview'}
                  </span>
                </div>
              </div>
            </div>

            {isLive && prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                View on GitHub <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Editable PR title */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">
              PR Title
            </label>
            {isLive ? (
              <p className="text-sm font-bold text-slate-200">{prTitle}</p>
            ) : (
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/40 transition-colors"
                placeholder="PR title..."
              />
            )}
          </div>

          {/* Branch info */}
          <div className="flex items-center gap-3 flex-wrap">
            {branchName && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                <GitBranch className="w-3 h-3" />
                <span className="text-sky-400">{branchName}</span>
                {baseBranch && (
                  <>
                    <span className="text-slate-600">→</span>
                    <span>{baseBranch}</span>
                  </>
                )}
              </div>
            )}
            {commitMessage && (
              <div
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}
              >
                {commitMessage}
              </div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(37,99,235,0.05)',
              border: '1px solid rgba(37,99,235,0.15)',
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
              🤖 AI Analysis
            </p>
            <p className="text-sm font-bold text-slate-200 mb-2">{aiSummary.headline}</p>
            {aiSummary.riskRationale && (
              <p className="text-[12px] text-slate-400 mb-2">{aiSummary.riskRationale}</p>
            )}
            {aiSummary.estimatedImpact && (
              <p className="text-[12px] text-emerald-400/70">{aiSummary.estimatedImpact}</p>
            )}
          </div>
        )}

        {/* Breaking change warnings */}
        {hasWarnings && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Breaking Change Risk
              </p>
            </div>
            <div className="space-y-3">
              {Object.entries(rollbackWarnings).map(([pkg, warn]) => (
                <div key={pkg}>
                  <p className="text-xs font-bold text-amber-300 mb-1">
                    <code className="bg-white/5 px-1 rounded">{pkg}</code>
                  </p>
                  <p className="text-[11px] text-slate-400">{warn.warning}</p>
                  {warn.checkpoints && (
                    <ul className="mt-1.5 space-y-0.5">
                      {warn.checkpoints.map((c, i) => (
                        <li key={i} className="text-[11px] text-slate-500 flex gap-1.5">
                          <span className="text-amber-500">·</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patches table */}
        {patches && patches.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="px-4 py-3"
              style={{
                background: 'rgba(15,20,40,0.8)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Dependency Changes ({patches.length})
              </p>
            </div>
            <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.03)' }}>
              {patches.map((patch, i) => {
                const riskColor =
                  patch.breakingRisk === 'HIGH'
                    ? '#ef4444'
                    : patch.breakingRisk === 'MEDIUM'
                      ? '#f59e0b'
                      : '#10b981';
                const sevColor =
                  patch.severity === 'CRITICAL'
                    ? '#ef4444'
                    : patch.severity === 'HIGH'
                      ? '#f97316'
                      : '#f59e0b';

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.01] transition-colors"
                  >
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${sevColor}15`, color: sevColor }}
                    >
                      {patch.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-300 flex-1 truncate">
                      {patch.packageName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
                      <span className="text-red-400/70 line-through">{patch.fromVersion}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-emerald-400">{patch.toVersion}</span>
                    </div>
                    <div
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${riskColor}15`, color: riskColor }}
                    >
                      {patch.breakingRisk}
                    </div>
                    <div
                      className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}
                      title={`${patch.confidenceScore}% confidence`}
                    >
                      {patch.confidenceScore}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Diff viewers */}
        {diffPreviews && diffPreviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
              Changed Files
            </p>
            {diffPreviews.map((preview, i) => (
              <DiffViewer key={i} diff={preview.diff} filePath={preview.filePath} />
            ))}
          </div>
        )}

        {/* PR Description */}
        {prDescription && <PRDescriptionPreview description={prDescription} />}
      </div>

      {/* Footer / Confirm button (only shown in dry-run complete state) */}
      {!isLive && status === 'dry_run_complete' && onConfirmPR && (
        <div
          className="flex items-center justify-between gap-4 border-t z-20"
          style={{
            background: 'rgba(10, 15, 30, 0.85)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
            margin: '0 -24px -24px -24px',
            padding: '16px 100px 24px 24px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Target Branch
            </span>
            <span className="text-xs font-bold text-slate-300 mt-0.5 flex items-center gap-1.5 font-mono">
              <GitBranch className="w-3.5 h-3.5 text-sky-500" />
              {branchName || 'remediation-branch'}
            </span>
          </div>

          <button
            onClick={() => onConfirmPR(editedTitle)}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group shrink-0 active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2 text-white">
              <GitPullRequest className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              Confirm &amp; Open Pull Request
            </span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            />
          </button>
        </div>
      )}
    </div>
  );
}
