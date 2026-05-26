import CountUp from "./CountUp";

/**
 * ScoreGauge — Circular SVG score display with color-coded risk status.
 */
export default function ScoreGauge({ score, status, riskCategory, trend, isSpinning = false }) {
  const numScore = typeof score === "number" ? score : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (numScore / 100) * circumference;
  const noData = score === "--" || score === null || score === undefined;

  const color =
    status === "SAFE"     ? "#10b981" :
    status === "WARNING"  ? "#f59e0b" :
    status === "RISKY"    ? "#f97316" :
    status === "CRITICAL" ? "#ef4444" :
    "#4F46E5";

  const bgColor =
    status === "SAFE"     ? "#10b98120" :
    status === "WARNING"  ? "#f59e0b20" :
    status === "RISKY"    ? "#f9731620" :
    status === "CRITICAL" ? "#ef444420" :
    "#4F46E520";

  const trendLabel = trend != null
    ? (trend > 0 ? `▲ +${trend}` : trend < 0 ? `▼ ${trend}` : "━ No change")
    : null;

  const trendColor = trend > 0 ? "text-emerald-400" : trend < 0 ? "text-red-400" : "text-slate-500";

  return (
    <div className="flex flex-col items-center gap-3" data-testid="score-gauge">
      <div className="relative w-[140px] h-[140px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Track */}
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#ffffff0a" strokeWidth="12" />
          {/* Progress */}
          {!noData && (
            <circle
              cx="64" cy="64" r={radius} fill="none"
              stroke={color} strokeWidth="12"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-3xl font-black text-white leading-none" style={{ color: noData && !isSpinning ? "#374151" : color }}>
            {noData && !isSpinning ? "--" : <CountUp value={numScore} isSpinning={isSpinning} />}
          </span>
          {(!noData || isSpinning) && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">/100</span>}
        </div>
      </div>

      {/* Status badge */}
      {status && (
        <span
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ring-1"
          style={{ color, backgroundColor: bgColor, borderColor: `${color}30` }}
          data-testid="score-status"
        >
          {status}
        </span>
      )}

      {/* Risk category */}
      {riskCategory && (
        <span className="text-[9px] text-slate-500 font-medium">
          Risk: <span className="text-slate-400 font-bold">{riskCategory}</span>
        </span>
      )}

      {/* Trend */}
      {trendLabel && (
        <span className={`text-[10px] font-mono font-bold ${trendColor}`}>{trendLabel}</span>
      )}
    </div>
  );
}
