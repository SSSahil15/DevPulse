import React, { useState } from 'react';
import { Lightbulb, Terminal, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

// ─── Discord Webhook URL ──────────────────────────────────────────────────────
const DISCORD_PROPOSAL_WEBHOOK_URL = import.meta.env.VITE_DISCORD_PROPOSAL_WEBHOOK_URL || '';

// ─── Helper: send to Discord ───────────────────────────────────────────────────
async function sendToDiscord(embed, webhookUrl) {
  if (!webhookUrl) throw new Error('Webhook URL is not configured. Check your .env file.');
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

// ─── Shared Sub-components ─────────────────────────────────────────────────────
function ModalShell({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">{icon}</div>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors ml-2 shrink-0"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder, required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all"
      />
    </div>
  );
}

function TextareaField({ label, name, value, onChange, placeholder, required = false, rows = 4 }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
      />
    </div>
  );
}

function SubmitButton({ loading, label, color }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full py-3 ${color} text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Sending…
        </>
      ) : (
        label
      )}
    </button>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message || 'Something went wrong. Please try again.'}</span>
    </div>
  );
}

function SuccessState({ icon, title, message, onClose, accentColor }) {
  const btnColor =
    accentColor === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500';
  return (
    <div className="flex flex-col items-center text-center py-8 gap-4">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{message}</p>
      </div>
      <button
        onClick={onClose}
        className={`px-8 py-3 ${btnColor} text-white rounded-xl font-bold text-sm transition-all shadow-lg`}
      >
        Done
      </button>
    </div>
  );
}

// ─── Exported Proposal Modal ──────────────────────────────────────────────────
export default function ProposalModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    useCase: '',
  });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await sendToDiscord(
        {
          title: `💡 New Feature Proposal: ${form.title}`,
          color: 0x3b82f6,
          fields: [
            {
              name: '👤 Submitted by',
              value: `${form.name}${form.email ? ` (${form.email})` : ''}`,
              inline: false,
            },
            { name: '📝 Description', value: form.description, inline: false },
            { name: '🎯 Use Case', value: form.useCase || '_Not provided_', inline: false },
          ],
          footer: { text: 'DevPulse Community · Feature Proposal' },
          timestamp: new Date().toISOString(),
        },
        DISCORD_PROPOSAL_WEBHOOK_URL,
      );
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      {status === 'success' ? (
        <SuccessState
          icon={<Lightbulb className="w-10 h-10 text-blue-400" />}
          title="Proposal Submitted!"
          message="Your feature idea has been shared with our team. We'll review it and discuss it with the community."
          onClose={onClose}
          accentColor="blue"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModalHeader
            icon={<Terminal className="w-5 h-5 text-blue-400" />}
            title="Submit a Feature Proposal"
            subtitle="Great features start with great ideas."
            onClose={onClose}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Your Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              required
            />
            <Field
              label="Email (optional)"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
            />
          </div>
          <Field
            label="Feature Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. AI-powered dependency auto-updates"
            required
          />
          <TextareaField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="What should this feature do?"
            required
            rows={4}
          />
          <TextareaField
            label="Use Case / Motivation"
            name="useCase"
            value={form.useCase}
            onChange={handleChange}
            placeholder="Why do you need this? What problem does it solve?"
            rows={3}
          />
          {status === 'error' && <ErrorBanner message={errorMsg} />}
          <SubmitButton
            loading={status === 'loading'}
            label="Submit Proposal"
            color="bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
          />
        </form>
      )}
    </ModalShell>
  );
}
