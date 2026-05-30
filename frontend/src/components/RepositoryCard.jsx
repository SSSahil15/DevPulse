import { Lock, Globe, Star, Code2, Play, Loader2, Radio, Clock } from 'lucide-react';

/**
 * @param {object}   props
 * @param {boolean}  props.isAnalyzing   True while the BullMQ job is queued/running
 * @param {boolean}  props.isLiveScanning True while the LiveScanConsole is open for this repo
 * @param {boolean}  props.isSelected
 * @param {Function} props.onAnalyze
 * @param {Function} props.onSelect
 * @param {Function} [props.onSchedule]  Opens the schedule modal for this repo
 * @param {object}   props.repository
 */
function RepositoryCard({
  isAnalyzing,
  isLiveScanning,
  isSelected,
  onAnalyze,
  onSelect,
  onSchedule,
  repository,
}) {
  const scanning = isAnalyzing || isLiveScanning;

  return (
    <button
      onClick={() => onSelect(repository)}
      className={`w-full shrink-0 text-left p-4 rounded-xl hover:translate-x-[2px] relative group overflow-hidden ${
        isSelected ? 'bg-transparent' : 'hover:bg-white/[0.02]'
      }`}
      style={{
        transition: 'all .28s cubic-bezier(.4,0,.2,1)',
        background: isSelected ? 'rgba(15,23,42, .65)' : 'rgba(30,41,59, .3)',
        backdropFilter: isSelected
          ? 'blur(24px) saturate(150%)'
          : 'blur(24px) saturate(200%) brightness(130%)',
        WebkitBackdropFilter: isSelected
          ? 'blur(24px) saturate(150%)'
          : 'blur(24px) saturate(200%) brightness(130%)',
        boxShadow: scanning
          ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 0 20px rgba(251,146,60,.2)'
          : isSelected
            ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 0 20px rgba(34,211,238,.15)'
            : 'none',
        border: scanning
          ? '1px solid rgba(251,146,60, 0.35)'
          : isSelected
            ? '1px solid rgba(34,211,238, 0.4)'
            : '1px solid rgba(255,255,255, 0.04)',
      }}
    >
      {/* Shimmer on hover */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full pointer-events-none"
        style={{ transitionDuration: '1s' }}
      />

      {/* Selected indicator */}
      {isSelected && !scanning && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.6)] animate-subtle-pulse" />
      )}

      {/* Live scanning indicator bar */}
      {scanning && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-orange-400 rounded-r-full shadow-[0_0_12px_rgba(251,146,60,0.8)]"
          style={{ animation: 'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite' }}
        />
      )}

      <div className="space-y-2 pl-1">
        {/* Name row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {repository.isPrivate ? (
              <Lock className="w-3 h-3 text-amber-500/70 shrink-0" />
            ) : (
              <Globe className="w-3 h-3 text-blue-400/70 shrink-0" />
            )}
            <span
              className={`text-sm font-bold truncate transition-colors ${isSelected || scanning ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}
            >
              {repository.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Live scan badge */}
            {scanning && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                <Radio className="w-2.5 h-2.5" style={{ animation: 'pulse 1s infinite' }} />
                Live
              </span>
            )}
            <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
              <Star className="w-3 h-3" /> {repository.stargazersCount}
            </div>
          </div>
        </div>

        {/* Description */}
        {repository.description && (
          <p className="text-[11px] text-secondary truncate leading-relaxed">
            {repository.description}
          </p>
        )}

        {/* Footer (shown when selected) */}
        {isSelected && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
              <Code2 className="w-3 h-3" />
              {repository.language || 'Unknown'}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {/* Schedule button */}
              {onSchedule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSchedule(repository);
                  }}
                  className="p-1.5 rounded-lg transition-all text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10"
                  title="Schedule recurring scan"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Analyze button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze(repository);
                }}
                disabled={scanning}
                className={`p-1.5 rounded-lg transition-all ${
                  scanning
                    ? 'text-orange-400 bg-orange-500/15 cursor-not-allowed'
                    : 'text-slate-600 hover:text-blue-400 hover:bg-blue-500/10'
                }`}
                title={scanning ? 'Scan in progress...' : 'Analyze'}
              >
                {scanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export default RepositoryCard;
