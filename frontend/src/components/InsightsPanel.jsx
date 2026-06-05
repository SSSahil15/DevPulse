import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

/**
 * InsightsPanel — Shows AI pipeline explanation, root cause, and actionable suggestions.
 */
export default function InsightsPanel({ insights }) {
  if (!insights) return null;

  const { explanation, rootCause, suggestions = [], issues = [] } = insights;
  const allClear = issues.length === 0;

  return (
    <div className="space-y-4" data-testid="insights-panel">
      {/* Main explanation */}
      {explanation && (
        <div
          className={`rounded-xl p-4 ring-1 ${allClear ? 'bg-emerald-500/5 ring-emerald-500/20' : 'bg-white/[0.02] ring-white/[0.06]'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            {allClear ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {allClear ? 'All Clear' : 'AI Pipeline Insights'}
            </span>
          </div>
          <ul
            className="text-sm text-slate-300 leading-[1.8] max-w-[62ch] list-disc ml-4 space-y-1"
            data-testid="insights-explanation"
          >
            {explanation.split('. ').filter(Boolean).map((sentence, idx) => (
              <li key={idx}>{sentence}{sentence.endsWith('.') ? '' : '.'}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Root cause */}
      {rootCause && !allClear && (
        <div className="bg-red-500/5 ring-1 ring-red-500/20 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
            Root Cause
          </p>
          <p
            className="text-xs text-slate-300 leading-[1.8] max-w-[62ch]"
            data-testid="insights-rootcause"
          >
            {rootCause}
          </p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Actionable Solutions
            </p>
          </div>
          <ul className="space-y-2" data-testid="insights-suggestions">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 leading-snug max-w-[62ch] whitespace-pre-wrap">
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
