import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Rocket,
  Sparkles,
  GitMerge,
  ShieldCheck,
  Zap,
  BarChart3,
  Globe,
  Cpu,
  Lock,
  Bell,
  ChevronRight,
  Filter,
} from 'lucide-react';
import SidebarPageLayout from '../components/SidebarPageLayout';
import ProposalModal from '../components/ProposalModal';

// ─── Roadmap Data ─────────────────────────────────────────────────────────────
const PHASES = [
  {
    phase: 'Q1 2025',
    label: 'Foundation',
    done: true,
    items: [
      {
        title: 'GitHub OAuth & JWT Auth',
        category: 'Core',
        status: 'shipped',
        icon: Lock,
        desc: 'Secure sign-in via GitHub with short-lived JWT tokens and refresh flows.',
      },
      {
        title: 'AI-Powered Vulnerability Scanner',
        category: 'AI',
        status: 'shipped',
        icon: ShieldCheck,
        desc: 'Run AI triage on SAST/SCA scan results; auto-classify severity and suggest patches.',
      },
      {
        title: 'Real-time Pipeline Monitoring',
        category: 'Core',
        status: 'shipped',
        icon: Zap,
        desc: 'Live WebSocket feed showing build status, step durations, and failure signals.',
      },
      {
        title: 'Shared Report Links',
        category: 'Core',
        status: 'shipped',
        icon: Globe,
        desc: 'Generate public, token-protected report URLs for stakeholders without accounts.',
      },
    ],
  },
  {
    phase: 'Q2 2025',
    label: 'Intelligence',
    done: true,
    items: [
      {
        title: 'Groq-Accelerated AI Remediation',
        category: 'AI',
        status: 'shipped',
        icon: Cpu,
        desc: 'Sub-second AI fix suggestions using Groq LPU inference for dependency vulnerabilities.',
      },
      {
        title: 'Observability Stack (OpenTelemetry)',
        category: 'Infra',
        status: 'shipped',
        icon: BarChart3,
        desc: 'Full distributed tracing with OTLP → Tempo, metrics via Prometheus, logs via Loki.',
      },
      {
        title: 'BullMQ Async Worker Queue',
        category: 'Infra',
        status: 'shipped',
        icon: GitMerge,
        desc: 'Decoupled scan jobs with retries, dead-letter queue, and progress events.',
      },
      {
        title: 'Sentry Error Tracking',
        category: 'Infra',
        status: 'shipped',
        icon: Bell,
        desc: 'Frontend + backend Sentry integration with release tracking and user context.',
      },
    ],
  },
  {
    phase: 'Q3 2025',
    label: 'Scale',
    done: false,
    items: [
      {
        title: 'AI Dependency Auto-Updates',
        category: 'AI',
        status: 'in-progress',
        icon: Sparkles,
        desc: 'AI drafts PRs to bump vulnerable dependencies, with changelog summaries and risk scores.',
      },
      {
        title: 'Native GitLab CI Integration',
        category: 'Core',
        status: 'in-progress',
        icon: GitMerge,
        desc: 'First-class GitLab support — webhooks, pipeline triggers, and MR annotations.',
      },
      {
        title: 'Custom Remediation Scripts',
        category: 'AI',
        status: 'planned',
        icon: Cpu,
        desc: 'Let teams define their own fix playbooks; AI selects the right one per vulnerability class.',
      },
      {
        title: 'Multi-Org Workspace Support',
        category: 'Core',
        status: 'planned',
        icon: Globe,
        desc: 'Switch between multiple GitHub orgs in a single DevPulse account.',
      },
    ],
  },
  {
    phase: 'Q4 2025',
    label: 'Enterprise',
    done: false,
    items: [
      {
        title: 'SSO / SAML Integration',
        category: 'Security',
        status: 'planned',
        icon: Lock,
        desc: 'Enterprise SSO via SAML 2.0 and OIDC, with JIT provisioning and role mapping.',
      },
      {
        title: 'Policy-as-Code Engine',
        category: 'Security',
        status: 'planned',
        icon: ShieldCheck,
        desc: 'Define security gates in YAML; block merges that violate your compliance rules.',
      },
      {
        title: 'Slack & MS Teams Notifications',
        category: 'Core',
        status: 'planned',
        icon: Bell,
        desc: 'Configurable alerts for scan failures, new CVEs, and SLA breaches in your chat tools.',
      },
      {
        title: 'Self-Hosted (On-Prem) Edition',
        category: 'Infra',
        status: 'planned',
        icon: Rocket,
        desc: 'Docker Compose & Helm chart for air-gapped deployments with full feature parity.',
      },
    ],
  },
];

const STATUS_CONFIG = {
  shipped: {
    label: 'Shipped',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400 animate-pulse',
    icon: Flame,
  },
  planned: {
    label: 'Planned',
    color: 'text-slate-400',
    bg: 'bg-slate-800/60',
    border: 'border-white/10',
    dot: 'bg-slate-500',
    icon: Clock,
  },
};

const CATEGORY_COLORS = {
  Core: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  AI: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Infra: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Security: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const ALL_FILTERS = ['All', 'Shipped', 'In Progress', 'Planned'];
const FILTER_MAP = {
  All: null,
  Shipped: 'shipped',
  'In Progress': 'in-progress',
  Planned: 'planned',
};

export default function RoadmapPage() {
  const [filter, setFilter] = useState('All');
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  const filterStatus = FILTER_MAP[filter];

  const sidebarLinks = [
    { id: 'q1-2025', title: 'Q1 2025 - Foundation', icon: CheckCircle2 },
    { id: 'q2-2025', title: 'Q2 2025 - Intelligence', icon: CheckCircle2 },
    { id: 'q3-2025', title: 'Q3 2025 - Scale', icon: Flame },
    { id: 'q4-2025', title: 'Q4 2025 - Enterprise', icon: Clock },
  ];

  return (
    <SidebarPageLayout title="Roadmap" sidebarLinks={sidebarLinks}>
      {/* ── Hero ── */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-blue-600/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-semibold mb-8">
            <Rocket className="w-4 h-4" /> Public Roadmap
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-5 leading-tight">
            Where DevPulse is{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
              headed
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            An open look at what we've shipped, what's in flight, and what's coming next. Vote on
            features and shape the direction of the platform.
          </p>

          {/* Summary pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = PHASES.flatMap((p) => p.items).filter((i) => i.status === key).length;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}
                >
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-sm font-bold ${cfg.color}`}>
                    {count} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          {ALL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                filter === f
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {PHASES.map((phase, pi) => {
          const items = filterStatus
            ? phase.items.filter((i) => i.status === filterStatus)
            : phase.items;
          if (items.length === 0) return null;
          return (
            <section
              key={pi}
              id={phase.phase.toLowerCase().replace(' ', '-')}
              className="scroll-mt-24 mb-16"
            >
              {/* Phase header */}
              <div className="flex items-center gap-4 mb-8">
                <h2
                  id={phase.phase.toLowerCase().replace(' ', '-')}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border font-black text-sm ${
                    phase.done
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : pi === PHASES.findIndex((p) => !p.done)
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-slate-800/60 border-white/10 text-slate-400'
                  }`}
                >
                  {phase.done ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : pi === PHASES.findIndex((p) => !p.done) ? (
                    <Flame className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {phase.phase}
                </h2>
                <div>
                  <div className="text-lg font-black text-white">{phase.label}</div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((item, ii) => {
                  const st = STATUS_CONFIG[item.status];
                  const StatusIcon = st.icon;
                  return (
                    <div
                      key={ii}
                      className={`group relative bg-[#0d1117] border rounded-2xl p-6 transition-all duration-200 hover:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-xl ${
                        item.status === 'in-progress'
                          ? 'border-blue-500/30 shadow-blue-500/5 shadow-lg'
                          : 'border-white/8'
                      }`}
                    >
                      {item.status === 'in-progress' && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                      )}

                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div
                          className={`p-2.5 rounded-xl border ${CATEGORY_COLORS[item.category]} bg-opacity-10`}
                        >
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${CATEGORY_COLORS[item.category]}`}
                          >
                            {item.category}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${st.bg} border ${st.border}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${st.color}`}
                            >
                              {st.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-base font-black text-white mb-2 leading-snug group-hover:text-blue-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>

                      {item.status === 'planned' && (
                        <button className="mt-4 text-xs font-bold text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors">
                          Vote for this feature <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <div className="max-w-4xl mx-auto px-6 mt-24 text-center">
        <div className="p-10 md:p-14 rounded-[2rem] bg-gradient-to-br from-[#0d1117] via-blue-900/20 to-purple-900/20 border border-blue-500/20 shadow-2xl">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-5" />
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Have a feature idea?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            The roadmap is shaped by the community. Submit a proposal and if it gets traction, it
            lands here.
          </p>
          <button
            onClick={() => setIsProposalModalOpen(true)}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-sm"
          >
            Submit a Proposal <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isProposalModalOpen && <ProposalModal onClose={() => setIsProposalModalOpen(false)} />}
    </SidebarPageLayout>
  );
}
