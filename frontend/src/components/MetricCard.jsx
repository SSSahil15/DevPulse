import { Info } from 'lucide-react';
import CountUp from './CountUp';

const toneMap = {
  danger: { borderColor: 'rgba(239,68,68,0.1)', text: 'text-red-500', glow: 'bg-red-500/15' },
  warning: { borderColor: 'rgba(245,158,11,0.1)', text: 'text-amber-500', glow: 'bg-amber-500/15' },
  primary: { borderColor: 'rgba(34,211,238,0.1)', text: 'text-[#22D3EE]', glow: 'bg-[#22D3EE]/15' },
  neutral: {
    borderColor: 'rgba(148,163,184,0.05)',
    text: 'text-slate-300',
    glow: 'bg-blue-500/10',
  },
};

function MetricCard({ eyebrow, value, detail, tone = 'neutral', isSpinning = false, subtext }) {
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 premium-transition hover:-translate-y-0.5 surface-1">
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </span>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 cursor-help transition-colors" />
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#0f1421] border border-white/10 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {detail}
            </div>
          </div>
        </div>
        <div className={`text-4xl font-black tracking-tight ${t.text}`}>
          <CountUp value={value} isSpinning={isSpinning} />
          {typeof value === 'number' && eyebrow.toLowerCase().includes('risk') && (
            <span className="text-sm font-normal text-slate-600 ml-1">/ 100</span>
          )}
        </div>
        {subtext && <div className="text-[10px] text-slate-500/80 font-mono pt-1">{subtext}</div>}
      </div>
      <div
        className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl opacity-15 ${t.glow}`}
      />
    </div>
  );
}

export default MetricCard;
