import { useEffect, useRef } from 'react';
import { STAGES } from '../hooks/useRemediation';

const STAGE_COLORS = {
  done: { ring: '#10b981', glow: 'rgba(16,185,129,0.4)', icon: '✓' },
  active: { ring: '#3b82f6', glow: 'rgba(59,130,246,0.5)', icon: null },
  error: { ring: '#ef4444', glow: 'rgba(239,68,68,0.4)', icon: '✗' },
  pending: { ring: '#1e293b', glow: 'transparent', icon: null },
};

function getStageStatus(stageKey, currentStage, status) {
  const stageKeys = STAGES.map((s) => s.key);
  const currentIdx = stageKeys.indexOf(currentStage);
  const thisIdx = stageKeys.indexOf(stageKey);

  if (status === 'complete') return 'done';
  if (status === 'dry_run_complete' && thisIdx <= currentIdx) return 'done';
  if (status === 'error' && thisIdx === currentIdx) return 'error';
  if (thisIdx < currentIdx) return 'done';
  if (thisIdx === currentIdx) return 'active';
  return 'pending';
}

export default function RemediationTimeline({
  stage,
  progress,
  message,
  status,
  logs,
  currentVuln,
}) {
  const timelineRef = useRef(null);

  // Auto-scroll to active stage
  useEffect(() => {
    if (!timelineRef.current) return;
    const activeEl = timelineRef.current.querySelector("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [stage]);

  const displayStages = STAGES.filter((s) => {
    // Hide dry_run stages in live mode and vice versa
    if (status === 'complete' && s.key === 'dry_run') return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Remediation Progress
          </span>
          <span
            className="text-[11px] font-black tabular-nums"
            style={{
              color: status === 'error' ? '#ef4444' : status === 'complete' ? '#10b981' : '#60a5fa',
            }}
          >
            {progress}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background:
                status === 'error'
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : status === 'complete'
                    ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              boxShadow:
                status === 'error'
                  ? '0 0 12px rgba(239,68,68,0.5)'
                  : '0 0 12px rgba(59,130,246,0.4)',
            }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {displayStages.map((s, idx) => {
          const stageStatus = getStageStatus(s.key, stage, status);
          const colors = STAGE_COLORS[stageStatus];
          const isActive = stageStatus === 'active';
          const isDone = stageStatus === 'done';

          return (
            <div
              key={s.key}
              data-active={isActive ? 'true' : 'false'}
              className="flex items-start gap-3 py-2 px-3 rounded-xl transition-all duration-300"
              style={{
                background: isActive
                  ? `rgba(59,130,246,0.06)`
                  : isDone
                    ? 'rgba(16,185,129,0.03)'
                    : 'transparent',
                boxShadow: isActive
                  ? `inset 0 0 0 1px rgba(59,130,246,0.15), 0 0 16px rgba(59,130,246,0.08)`
                  : isDone
                    ? 'inset 0 0 0 1px rgba(16,185,129,0.08)'
                    : 'none',
              }}
            >
              {/* Stage indicator */}
              <div className="relative shrink-0 mt-0.5">
                {/* Connection line */}
                {idx < displayStages.length - 1 && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 w-px transition-all duration-500"
                    style={{
                      height: '20px',
                      background: isDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)',
                    }}
                  />
                )}

                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 relative"
                  style={{
                    border: `2px solid ${colors.ring}`,
                    boxShadow: isActive ? `0 0 16px ${colors.glow}` : 'none',
                    background: isDone
                      ? 'rgba(16,185,129,0.15)'
                      : isActive
                        ? 'rgba(59,130,246,0.15)'
                        : 'rgba(15,20,40,0.8)',
                  }}
                >
                  {isDone ? (
                    <span style={{ color: '#10b981' }}>✓</span>
                  ) : stageStatus === 'error' ? (
                    <span style={{ color: '#ef4444' }}>✗</span>
                  ) : isActive ? (
                    <span
                      className="animate-spin block w-2.5 h-2.5 rounded-full border border-transparent"
                      style={{ borderTopColor: '#3b82f6' }}
                    />
                  ) : (
                    <span style={{ color: '#334155' }}>{s.icon}</span>
                  )}
                </div>
              </div>

              {/* Stage label + message */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold truncate transition-colors"
                    style={{
                      color: isDone
                        ? '#10b981'
                        : isActive
                          ? '#e2e8f0'
                          : stageStatus === 'error'
                            ? '#ef4444'
                            : '#334155',
                    }}
                  >
                    {s.label}
                  </span>
                  {isActive && (
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded animate-pulse"
                      style={{
                        background: 'rgba(59,130,246,0.15)',
                        color: '#60a5fa',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>

                {/* Active stage sub-message */}
                {isActive && message && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{message}</p>
                )}

                {/* Currently-analysing vuln */}
                {isActive && s.key === 'ai_analysis' && currentVuln && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          currentVuln.severity === 'CRITICAL'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(249,115,22,0.15)',
                        color: currentVuln.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
                      }}
                    >
                      {currentVuln.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {currentVuln.pkgName} · {currentVuln.id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent log entries */}
      {logs && logs.length > 0 && (
        <div
          className="border-t px-4 py-3 max-h-28 overflow-y-auto"
          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">
            Activity Log
          </p>
          <div className="space-y-0.5">
            {logs
              .slice(-5)
              .reverse()
              .map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-slate-700 shrink-0 tabular-nums">
                    {new Date(log.ts || log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="text-slate-500 truncate">{log.message}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
