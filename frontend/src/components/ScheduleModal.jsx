/**
 * ScheduleModal — lets users set up recurring automated scans for a repository.
 * Shows preset frequencies (Daily / Weekly / Monthly) with a premium UI.
 */
import { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Zap,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

const PRESETS = [
  {
    id: 'daily',
    label: 'Daily',
    sub: 'Every day at 9:00 AM UTC',
    cron: '0 9 * * *',
    icon: '⚡',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.2)',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    sub: 'Every Monday at 9:00 AM UTC',
    cron: '0 9 * * 1',
    icon: '📅',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.2)',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    sub: '1st of each month at 9:00 AM UTC',
    cron: '0 9 1 * *',
    icon: '🗓️',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
  },
];

/**
 * @param {object}   props
 * @param {string}   props.repository     - Full repo name e.g. "owner/repo"
 * @param {string}   props.accessToken    - JWT for API calls
 * @param {object}   [props.existing]     - Existing schedule if one is set
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess      - Called with the schedule response
 */
export default function ScheduleModal({ repository, accessToken, existing, onClose, onSuccess }) {
  const [selected, setSelected] = useState(existing?.label || 'weekly');
  const [status, setStatus] = useState('idle'); // idle | saving | success | error | deleting
  const [error, setError] = useState(null);

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ repository, preset: selected }),
      });

      // Conflict = already scheduled, show helpful message
      if (res.status === 409) {
        const d = await res.json();
        setError(d.message || 'A schedule already exists for this repository.');
        setStatus('error');
        return;
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to create schedule.');
      }

      const data = await res.json();
      setStatus('success');
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  async function deleteSchedule() {
    if (!existing?.id) return;
    setStatus('deleting');
    try {
      await fetch(`/api/schedules/${existing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onSuccess?.({ deleted: true });
      onClose();
    } catch (err) {
      setError('Failed to delete schedule.');
      setStatus('error');
    }
  }

  const preset = PRESETS.find((p) => p.id === selected) || PRESETS[1];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
        style={{
          background: 'linear-gradient(180deg, rgba(10,14,25,0.98) 0%, rgba(8,11,20,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,211,238,0.2))',
              }}
            >
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Schedule Scan</p>
              <p className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                {repository}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-black text-white mb-1">Scan Scheduled!</p>
                <p className="text-sm text-slate-400">
                  <strong className="text-white">{preset.label}</strong> scans are now active for
                  this repository.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                Select Frequency
              </p>

              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left"
                  style={{
                    background: selected === p.id ? p.bg : 'rgba(255,255,255,0.02)',
                    border:
                      selected === p.id
                        ? `1px solid ${p.border}`
                        : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: selected === p.id ? `0 0 12px ${p.color}15` : 'none',
                  }}
                >
                  <span className="text-xl shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-black"
                      style={{ color: selected === p.id ? p.color : '#CBD5E1' }}
                    >
                      {p.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">{p.sub}</p>
                  </div>
                  {selected === p.id && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: p.color }}
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}

              {error && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl"
                  style={{
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <button
                onClick={save}
                disabled={status === 'saving'}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.3)',
                  opacity: status === 'saving' ? 0.7 : 1,
                }}
              >
                {status === 'saving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Enable Scheduled Scans
                  </>
                )}
              </button>

              {existing?.id && (
                <button
                  onClick={deleteSchedule}
                  disabled={status === 'deleting'}
                  className="w-full py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {status === 'deleting' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Remove Schedule
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
