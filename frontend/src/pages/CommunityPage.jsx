import React, { useState } from 'react';
import {
  MessageSquare,
  GitPullRequest,
  Map,
  Bug,
  Users,
  ArrowRight,
  Heart,
  Star,
  Terminal,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
  Lightbulb,
  Flame,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Globe,
} from 'lucide-react';
import { GithubIcon, LinkedinIcon, DiscordIcon } from '../components/icons';
import { Search, Menu, ArrowLeft } from 'lucide-react';
import ProposalModal from '../components/ProposalModal';

// ─── Discord Webhook URLs ──────────────────────────────────────────────────────
const DISCORD_PROPOSAL_WEBHOOK_URL = import.meta.env.VITE_DISCORD_PROPOSAL_WEBHOOK_URL || '';
const DISCORD_ISSUE_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  {
    label: 'Active Members',
    value: '12,400+',
    icon: Users,
    color: 'text-blue-400',
    bg: 'from-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    label: 'GitHub Stars',
    value: '4.8k',
    icon: Star,
    color: 'text-amber-400',
    bg: 'from-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    label: 'Pull Requests',
    value: '850+',
    icon: GitPullRequest,
    color: 'text-purple-400',
    bg: 'from-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    label: 'Discussions',
    value: '2.1k',
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'from-emerald-500/10',
    border: 'border-emerald-500/20',
  },
];

const DISCUSSIONS = [
  {
    title: 'Proposal: Native Kubernetes Operator for DevPulse',
    author: 'Alex Rivera',
    comments: 45,
    type: 'Feature Request',
    hot: true,
  },
  {
    title: 'RFC: Expanding AI remediation to Go syntax',
    author: 'Sarah Chen',
    comments: 32,
    type: 'Architecture',
    hot: false,
  },
  {
    title: 'How to configure custom webhook payloads?',
    author: 'James Wilson',
    comments: 12,
    type: 'Q&A',
    hot: false,
  },
];

const ROADMAP_PREVIEW = [
  {
    title: 'AI Dependency Auto-Updates',
    status: 'In Progress',
    votes: 432,
    color: 'text-blue-400',
    dot: 'bg-blue-400 animate-pulse',
  },
  {
    title: 'Native GitLab CI Integration',
    status: 'Planned',
    votes: 385,
    color: 'text-slate-400',
    dot: 'bg-slate-500',
  },
  {
    title: 'Custom Remediation Scripts',
    status: 'Under Review',
    votes: 215,
    color: 'text-amber-400',
    dot: 'bg-amber-400',
  },
];

const TYPE_COLORS = {
  'Feature Request': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Architecture: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Q&A': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

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

// ─── Proposal Modal ────────────────────────────────────────────────────────────
// Imported from '../components/ProposalModal'

// ─── Issue Modal ───────────────────────────────────────────────────────────────
function IssueModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    severity: 'Medium',
    steps: '',
  });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const severityColors = { Low: 0x10b981, Medium: 0xf59e0b, High: 0xef4444, Critical: 0x7c3aed };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await sendToDiscord(
        {
          title: `🐛 Bug Report: ${form.title}`,
          color: severityColors[form.severity] ?? 0xef4444,
          fields: [
            {
              name: '👤 Reported by',
              value: `${form.name}${form.email ? ` (${form.email})` : ''}`,
              inline: true,
            },
            { name: '🚨 Severity', value: form.severity, inline: true },
            { name: '📝 Description', value: form.description, inline: false },
            { name: '🔁 Steps to Reproduce', value: form.steps || '_Not provided_', inline: false },
          ],
          footer: { text: 'DevPulse Community · Bug Report' },
          timestamp: new Date().toISOString(),
        },
        DISCORD_ISSUE_WEBHOOK_URL,
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
          icon={<CheckCircle className="w-10 h-10 text-emerald-400" />}
          title="Issue Reported!"
          message="Your bug report has been shared with our team. The maintainers will investigate and get back to you."
          onClose={onClose}
          accentColor="red"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModalHeader
            icon={<Bug className="w-5 h-5 text-red-400" />}
            title="Report an Issue"
            subtitle="Help us squash bugs and keep DevPulse solid."
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
            label="Issue Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Dashboard crashes on mobile Safari"
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Severity
            </label>
            <div className="flex flex-wrap gap-2">
              {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, severity: s }))}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                    form.severity === s
                      ? s === 'Low'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : s === 'Medium'
                          ? 'bg-amber-500/20   border-amber-500/50   text-amber-400'
                          : s === 'High'
                            ? 'bg-red-500/20     border-red-500/50     text-red-400'
                            : 'bg-purple-500/20  border-purple-500/50  text-purple-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <TextareaField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="What went wrong? Be as specific as possible."
            required
            rows={3}
          />
          <TextareaField
            label="Steps to Reproduce"
            name="steps"
            value={form.steps}
            onChange={handleChange}
            placeholder={`1. Go to…\n2. Click on…\n3. See error`}
            rows={3}
          />
          {status === 'error' && <ErrorBanner message={errorMsg} />}
          <SubmitButton
            loading={status === 'loading'}
            label="Submit Report"
            color="bg-red-600 hover:bg-red-500 shadow-red-500/20"
          />
        </form>
      )}
    </ModalShell>
  );
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
          <h2 className="text-lg font-black text-white leading-tight">{title}</h2>
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
        <h2 className="text-xl font-black text-white mb-2">{title}</h2>
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

const SIDEBAR_LINKS = [
  { id: 'overview', title: 'Overview', icon: Heart },
  { id: 'discussions', title: 'Top Discussions', icon: TrendingUp },
  { id: 'feedback-issues', title: 'Feedback & Issues', icon: Bug },
  { id: 'roadmap', title: 'Public Roadmap', icon: Map },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [activeModal, setActiveModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && !isCommandPaletteOpen) {
        e.preventDefault();
        const searchInput = document.getElementById('community-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  React.useEffect(() => {
    const extractHeadings = () => {
      const headingElements = Array.from(document.querySelectorAll('main h2[id]'));
      setHeadings(headingElements.map((h) => ({ id: h.id, text: h.textContent })));
    };
    setTimeout(extractHeadings, 100);

    const handleScroll = () => {
      const headingElements = Array.from(document.querySelectorAll('main h2[id]'));
      let currentId = '';
      for (const heading of headingElements) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 120) {
          currentId = heading.id;
        } else {
          break;
        }
      }
      if (currentId) setActiveHeadingId(currentId);
      else if (headingElements.length > 0) setActiveHeadingId(headingElements[0].id);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(id);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col font-sans text-slate-300">
      {/* Modals */}
      {activeModal === 'proposal' && <ProposalModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'issue' && <IssueModal onClose={() => setActiveModal(null)} />}

      {/* ── Top Navigation ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-3 border-b border-white/10 bg-[#080b14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <a href="/" className="flex items-center gap-2 cursor-pointer group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
              <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
                <img src="/Logo.png" alt="DevPulse Logo" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              DevPulse <span className="text-slate-500 font-normal">Community</span>
            </span>
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="community-search"
              type="text"
              placeholder="Search community (Press '/')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <a
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> App
          </a>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1500px] w-full mx-auto relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left Sidebar (Navigation) ── */}
        <aside
          className={`
          fixed md:sticky top-[73px] left-0 z-50 h-[calc(100vh-73px)] w-72 bg-[#080b14] md:bg-transparent border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300 custom-scrollbar
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        >
          <div className="md:hidden mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-8 pb-10">
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 px-3">
                Navigation
              </div>
              {SIDEBAR_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToHeading(link.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group text-slate-400 hover:text-white hover:bg-white/5`}
                >
                  <link.icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-400" />
                  <span className="truncate">{link.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto w-full space-y-24 pb-32">
          <section id="overview">
            <h2 id="overview" className="sr-only">
              Overview
            </h2>
            {/* ── Hero ── */}
            <div className="relative pt-24 pb-20 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/8 blur-[100px] rounded-full" />
                <div className="absolute top-10 right-1/4 w-64 h-64 bg-purple-600/8 blur-[80px] rounded-full" />
              </div>
              <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-semibold mb-8">
                  <Heart className="w-3.5 h-3.5" /> Open Source &amp; Community-Driven
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-5 leading-tight">
                  Build the future of{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    AI-powered DevSecOps
                  </span>{' '}
                  together.
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                  Join thousands of developers, security researchers, and DevOps engineers shaping
                  the next generation of CI/CD pipeline intelligence.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="https://discord.gg/95NY3xxx8X"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-7 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/20"
                  >
                    <MessageSquare className="w-4 h-4" /> Join Discord
                  </a>
                  <a
                    href="https://github.com/SSSahil15/DevPulse"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-7 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                  >
                    <GithubIcon className="w-4 h-4" /> GitHub Discussions
                  </a>
                </div>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="max-w-5xl mx-auto px-6 mb-20">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat, i) => (
                  <div
                    key={i}
                    className={`relative bg-gradient-to-br ${stat.bg} to-transparent border ${stat.border} rounded-2xl p-6 text-center group hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
                  >
                    <div className={`flex justify-center mb-3 ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Discussions Section ── */}
          <section id="discussions" className="scroll-mt-24">
            <h2
              id="discussions"
              className="text-2xl font-bold text-white mb-6 flex items-center gap-2"
            >
              <TrendingUp className="w-6 h-6 text-blue-400" /> Top Discussions
            </h2>
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-blue-400" /> Top Discussions
                </h2>
                <a
                  href="https://github.com/SSSahil15/DevPulse/discussions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="divide-y divide-white/5">
                {DISCUSSIONS.map((disc, i) => (
                  <div
                    key={i}
                    className="px-6 py-5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${TYPE_COLORS[disc.type] || 'bg-slate-800 text-slate-400 border-white/10'}`}
                          >
                            {disc.type}
                          </span>
                          {disc.hot && (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-orange-400">
                              <Flame className="w-3 h-3" /> Hot
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug truncate">
                          {disc.title}
                        </h3>
                        <div className="text-xs text-slate-500 mt-1.5">
                          by <span className="text-slate-400">{disc.author}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium shrink-0 bg-white/5 px-2.5 py-1.5 rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5" /> {disc.comments}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Feedback & Issues Section ── */}
          <section id="feedback-issues" className="scroll-mt-24">
            <h2
              id="feedback-issues"
              className="text-2xl font-bold text-white mb-6 flex items-center gap-2"
            >
              <Bug className="w-6 h-6 text-red-400" /> Feedback & Issues
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Proposal Card */}
              <button
                id="btn-submit-proposal"
                onClick={() => setActiveModal('proposal')}
                className="text-left relative bg-gradient-to-br from-[#0d1117] via-[#0d1117] to-blue-950/30 border border-blue-500/20 rounded-2xl p-7 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                    <Terminal className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-base font-black text-white mb-2">Request a Feature</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">
                    Have an idea to improve DevPulse? Submit it and let the community vote.
                  </p>
                  <div className="text-blue-400 text-sm font-bold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    Submit Proposal <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Issue Card */}
              <button
                id="btn-report-issue"
                onClick={() => setActiveModal('issue')}
                className="text-left relative bg-gradient-to-br from-[#0d1117] via-[#0d1117] to-red-950/30 border border-red-500/20 rounded-2xl p-7 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10 hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                    <Bug className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-base font-black text-white mb-2">Report an Issue</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">
                    Found a bug or vulnerability? Report it directly to our maintainers.
                  </p>
                  <div className="text-red-400 text-sm font-bold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    Open Issue <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* ── Public Roadmap Section ── */}
          <section id="roadmap" className="scroll-mt-24">
            <h2 id="roadmap" className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Map className="w-6 h-6 text-emerald-400" /> Public Roadmap
            </h2>
            <div className="space-y-6">
              <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                  <h2 className="text-base font-black text-white flex items-center gap-2.5">
                    <Map className="w-4 h-4 text-emerald-400" /> Public Roadmap
                  </h2>
                </div>
                <div className="divide-y divide-white/5">
                  {ROADMAP_PREVIEW.map((item, i) => (
                    <div
                      key={i}
                      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                        <span className="text-sm font-semibold text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold ${item.color}`}>{item.status}</span>
                        <div className="flex items-center gap-1 text-slate-500 text-xs bg-white/5 px-2 py-0.5 rounded-md">
                          <ArrowRight className="w-3 h-3 -rotate-90" /> {item.votes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-white/8">
                  <a
                    href="/roadmap"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors group"
                  >
                    View Full Roadmap
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Join the community CTA mini-card */}
              <div className="bg-gradient-to-br from-[#0d1117] to-purple-950/30 border border-purple-500/20 rounded-2xl p-6">
                <Globe className="w-6 h-6 text-purple-400 mb-4" />
                <h3 className="text-base font-black text-white mb-2">Open Source First</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                  DevPulse is built in public. Every scan, every fix suggestion, every AI model
                  choice — discussed openly with the community.
                </p>
                <a
                  href="https://github.com/SSSahil15/DevPulse"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <GithubIcon className="w-4 h-4" /> Star us on GitHub{' '}
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* ── CTA Footer ── */}
          <div className="max-w-5xl mx-auto px-6">
            <div className="relative p-10 md:p-16 rounded-[2rem] bg-gradient-to-br from-[#0d1117] via-blue-900/20 to-purple-900/20 border border-blue-500/20 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full" />
                <div className="absolute top-0 left-0 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full" />
              </div>
              <div className="relative z-10 text-center">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-5" />
                <h2 className="text-2xl md:text-4xl font-black text-white mb-5">
                  Ready to contribute?
                </h2>
                <p className="text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
                  Check out our contributor guidelines and pick up your first "good first issue". We
                  can't wait to see what you build.
                </p>
                <a
                  href="/contributing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black transition-colors shadow-xl text-sm"
                >
                  <GithubIcon className="w-4 h-4" /> Read Contributor Guidelines
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full bg-[#06080d] border-t border-white/5 pt-16 pb-8 mt-20 z-10">
            <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 max-w-6xl mx-auto">
              <div className="col-span-1 md:col-span-1">
                <a
                  href="/"
                  className="flex items-center gap-2 cursor-pointer group mb-4 inline-flex"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
                    <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
                      <img src="/Logo.png" alt="DevPulse Logo" className="w-5 h-5 object-contain" />
                    </div>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">DevPulse</span>
                </a>
                <p className="text-xs text-slate-500 leading-relaxed mb-6 pr-4">
                  The AI-powered DevSecOps platform for modern engineering teams. Ship faster,
                  securely.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://www.linkedin.com/in/-sahil/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <LinkedinIcon className="w-5 h-5" />
                  </a>
                  <a
                    href="https://github.com/SSSahil15/DevPulse"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <GithubIcon className="w-5 h-5" />
                  </a>
                  <a
                    href="https://discord.gg/95NY3xxx8X"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <DiscordIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-4">Product</h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li>
                    <a href="/features" className="hover:text-blue-400 transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="/security" className="hover:text-blue-400 transition-colors">
                      Security
                    </a>
                  </li>
                  <li>
                    <a href="/changelog" className="hover:text-blue-400 transition-colors">
                      Changelog
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-4">Resources</h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li>
                    <a href="/docs" className="hover:text-blue-400 transition-colors">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a href="/reference" className="hover:text-blue-400 transition-colors">
                      API Reference
                    </a>
                  </li>
                  <li>
                    <a href="/blog" className="hover:text-blue-400 transition-colors">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="/community" className="hover:text-blue-400 transition-colors">
                      Community
                    </a>
                  </li>
                  <li>
                    <a href="/contributing" className="hover:text-blue-400 transition-colors">
                      Contributing
                    </a>
                  </li>
                  <li>
                    <a
                      href="/openapi.yaml"
                      download="openapi.yaml"
                      className="hover:text-blue-400 transition-colors"
                    >
                      Download OpenAPI Spec
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-4">Company</h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li>
                    <a href="/about" className="hover:text-blue-400 transition-colors">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="hover:text-blue-400 transition-colors">
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="hover:text-blue-400 transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="hover:text-blue-400 transition-colors">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-6 md:px-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 max-w-6xl mx-auto">
              <div>
                &copy; {new Date().getFullYear()} DevPulse Inc. All rights reserved. • v1.0.0
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>
          </footer>
        </main>

        {/* ── Right Sidebar (In-page TOC) ── */}
        <aside className="hidden xl:block w-64 shrink-0 pr-8 py-10 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto custom-scrollbar">
          {headings.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                On This Page
              </div>
              <nav className="space-y-2 border-l border-white/10">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => scrollToHeading(heading.id)}
                    className={`block w-full text-left pl-4 py-1 text-sm transition-all border-l-2 -ml-[1px] ${
                      activeHeadingId === heading.id
                        ? 'text-blue-400 border-blue-400 font-semibold'
                        : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
