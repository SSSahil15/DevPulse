import React, { useState } from 'react';
import {
  GitFork,
  GitPullRequest,
  ShieldCheck,
  BookOpen,
  Terminal,
  Heart,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Zap,
  Code2,
  Bug,
  Star,
  ArrowRight,
  AlertTriangle,
  Layers,
  TestTube2,
  Rocket,
} from 'lucide-react';
import { GithubIcon } from '../components/icons';
import SidebarPageLayout from '../components/SidebarPageLayout';

const GOOD_FIRST_ISSUES = [
  { title: 'Add loading skeleton to dashboard pipeline list', type: 'UI', difficulty: 'Easy' },
  { title: 'Improve error messages on scan failure', type: 'DX', difficulty: 'Easy' },
  { title: 'Write unit tests for AI remediation helpers', type: 'Testing', difficulty: 'Medium' },
  { title: 'Add dark/light theme toggle to StaticPageLayout', type: 'UI', difficulty: 'Medium' },
  {
    title: 'Implement rate-limit retry logic in API client',
    type: 'Backend',
    difficulty: 'Medium',
  },
  { title: 'Add Bitbucket webhook support', type: 'Integration', difficulty: 'Hard' },
];

const DIFF_COLORS = {
  Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  Hard: 'bg-red-500/10    text-red-400    border-red-500/20',
};

const TYPE_COLORS = {
  UI: 'bg-blue-500/10    text-blue-400    border-blue-500/20',
  DX: 'bg-purple-500/10  text-purple-400  border-purple-500/20',
  Testing: 'bg-teal-500/10    text-teal-400    border-teal-500/20',
  Backend: 'bg-orange-500/10  text-orange-400  border-orange-500/20',
  Integration: 'bg-pink-500/10    text-pink-400    border-pink-500/20',
};

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ id, icon: Icon, title, iconColor = 'text-blue-400', children }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 id={id} className="text-xl md:text-2xl font-black text-white">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────
function Step({ num, title, children }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-black text-blue-400">
        {num}
      </div>
      <div className="flex-1 pb-8 border-l border-white/8 pl-5 -ml-[1px]">
        <div className="text-white font-bold mb-2">{title}</div>
        <div className="text-slate-400 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ─── Code Wrapper ─────────────────────────────────────────────────────────────
function Code({ children }) {
  return (
    <code className="bg-[#121822] border border-white/10 text-emerald-400 px-2 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-[#0a0d14] border border-white/10 rounded-xl p-5 overflow-x-auto text-sm font-mono text-slate-300 my-4 leading-relaxed">
      {children}
    </pre>
  );
}

// ─── Info Box ─────────────────────────────────────────────────────────────────
function InfoBox({ type = 'info', children }) {
  const styles = {
    info: { bg: 'bg-blue-500/8   border-blue-500/25  ', text: 'text-blue-400', icon: Lightbulb },
    warn: {
      bg: 'bg-amber-500/8  border-amber-500/25 ',
      text: 'text-amber-400',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-emerald-500/8 border-emerald-500/25',
      text: 'text-emerald-400',
      icon: CheckCircle2,
    },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${s.bg} mb-5`}>
      <s.icon className={`w-4 h-4 shrink-0 mt-0.5 ${s.text}`} />
      <div className={`text-sm leading-relaxed ${s.text}`}>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContributingPage() {
  const sidebarLinks = [
    { id: 'welcome', title: 'Welcome', icon: Heart },
    { id: 'code-of-conduct', title: 'Code of Conduct', icon: ShieldCheck },
    { id: 'getting-started', title: 'Getting Started', icon: Terminal },
    { id: 'how-to-contribute', title: 'How to Contribute', icon: Layers },
    { id: 'pull-requests', title: 'PR Process', icon: GitPullRequest },
    { id: 'code-standards', title: 'Code Standards', icon: Code2 },
    { id: 'reporting-bugs', title: 'Reporting Bugs', icon: Bug },
    { id: 'feature-requests', title: 'Feature Requests', icon: Lightbulb },
    { id: 'recognition', title: 'Recognition', icon: Star },
  ];

  return (
    <SidebarPageLayout title="Contributing" sidebarLinks={sidebarLinks}>
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-semibold mb-6">
          <Heart className="w-3.5 h-3.5" /> Contributor Guidelines
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 leading-tight">
          Help us build{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            DevPulse
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
          Whether it's a bug fix, a new integration, or an improvement to the docs — every
          contribution matters. Here's everything you need to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href="https://github.com/SSSahil15/DevPulse"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg flex items-center gap-2"
          >
            <GithubIcon className="w-4 h-4" /> View on GitHub
          </a>
          <button
            onClick={() => {
              const el = document.getElementById('getting-started');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" /> Get Started
          </button>
        </div>
      </div>

      {/* Welcome */}
      <Section id="welcome" icon={Heart} title="Welcome, Contributor!" iconColor="text-pink-400">
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7 mb-6">
          <p className="text-slate-400 leading-relaxed mb-4">
            DevPulse is an open-source, AI-powered DevSecOps platform. We believe that security and
            developer experience should go hand-in-hand — and we're building that in public with the
            community.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Contributions of any size are welcome: typo fixes, new features, bug reports,
            documentation improvements, or even just sharing the project. Thank you for being here.
            🙌
          </p>
        </div>
        <InfoBox type="success">
          <strong>New here?</strong> Start with a "good first issue" — we've labeled them
          specifically so you can hit the ground running without needing deep context.
        </InfoBox>
      </Section>

      {/* Code of Conduct */}
      <Section
        id="code-of-conduct"
        icon={ShieldCheck}
        title="Code of Conduct"
        iconColor="text-purple-400"
      >
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7 space-y-4">
          <p className="text-slate-400 leading-relaxed">
            We are committed to providing a welcoming and inclusive environment for everyone. By
            participating, you agree to uphold the following:
          </p>
          {[
            'Be respectful and considerate in all communications.',
            'Constructive feedback only — attack the idea, never the person.',
            'Assume good intent. Everyone is at a different point in their journey.',
            'Harassment, discrimination, or exclusionary behaviour will not be tolerated.',
            'If you witness a violation, report it to the maintainers privately.',
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-400">{rule}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Getting Started */}
      <Section
        id="getting-started"
        icon={Terminal}
        title="Getting Started"
        iconColor="text-blue-400"
      >
        <InfoBox type="info">
          You'll need <strong>Node.js 20+</strong>, <strong>Python 3.11+</strong>,{' '}
          <strong>Docker</strong>, and <strong>Git</strong> installed before you begin.
        </InfoBox>

        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7 space-y-1">
          <Step num="1" title="Fork & clone the repository">
            Click <strong>Fork</strong> on GitHub, then clone your fork locally:
            <CodeBlock>{`git clone https://github.com/YOUR_USERNAME/DevPulse.git
cd DevPulse`}</CodeBlock>
          </Step>
          <Step num="2" title="Set up environment variables">
            Copy the example env files for each service:
            <CodeBlock>{`cp backend/.env.example backend/.env
cp ai/.env.example     ai/.env
cp frontend/.env.example frontend/.env`}</CodeBlock>
            Fill in the required values — at minimum <Code>DATABASE_URL</Code>,{' '}
            <Code>REDIS_URL</Code>, and a GitHub OAuth app.
          </Step>
          <Step num="3" title="Start all services">
            All backend services run in Docker; the frontend runs via npm:
            <CodeBlock>{`# Start backend, AI, Postgres, Redis, observability
docker compose -f docker-compose.yml \\
               -f docker-compose.observability.yml up -d --build

# Start frontend dev server
cd frontend && npm install && npm run dev`}</CodeBlock>
            The frontend will be available at <Code>http://localhost:5174</Code>.
          </Step>
          <Step num="4" title="Create a branch">
            Always work on a feature branch — never directly on <Code>main</Code>:
            <CodeBlock>{`git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description`}</CodeBlock>
          </Step>
        </div>
      </Section>

      {/* How to Contribute */}
      <Section
        id="how-to-contribute"
        icon={Layers}
        title="How to Contribute"
        iconColor="text-orange-400"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {[
            {
              icon: Bug,
              color: 'text-red-400',
              bg: 'bg-red-500/10 border-red-500/20',
              title: 'Fix Bugs',
              desc: 'Browse open issues tagged "bug" and submit a PR with a fix and a regression test.',
            },
            {
              icon: Lightbulb,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
              title: 'Build Features',
              desc: 'Pick up a planned roadmap item or propose your own. Open an issue first to discuss.',
            },
            {
              icon: BookOpen,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/20',
              title: 'Improve Docs',
              desc: 'Find something confusing or missing in the docs? We love clear, accurate documentation.',
            },
            {
              icon: TestTube2,
              color: 'text-teal-400',
              bg: 'bg-teal-500/10 border-teal-500/20',
              title: 'Write Tests',
              desc: 'Add unit, integration, or E2E tests for existing features. Coverage improvements are always welcome.',
            },
            {
              icon: Zap,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'Performance',
              desc: 'Found a slow query or a large bundle? Profile it, prove the improvement, and send the PR.',
            },
            {
              icon: MessageSquare,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Community Support',
              desc: 'Help answer questions in GitHub Discussions or Discord. Supporting others is contributing too.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`bg-[#0d1117] border ${item.bg} rounded-2xl p-5 hover:bg-white/[0.03] transition-colors`}
            >
              <item.icon className={`w-5 h-5 ${item.color} mb-3`} />
              <div className="font-bold text-white text-sm mb-1.5">{item.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Good First Issues */}
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Good First Issues
            </h3>
            <a
              href="https://github.com/SSSahil15/DevPulse/issues?q=label%3A%22good+first+issue%22"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="divide-y divide-white/5">
            {GOOD_FIRST_ISSUES.map((issue, i) => (
              <div
                key={i}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  {issue.title}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_COLORS[issue.type]}`}
                  >
                    {issue.type}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${DIFF_COLORS[issue.difficulty]}`}
                  >
                    {issue.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Pull Request Process */}
      <Section
        id="pull-requests"
        icon={GitPullRequest}
        title="Pull Request Process"
        iconColor="text-emerald-400"
      >
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7 space-y-1 mb-5">
          <Step num="1" title="Keep PRs focused">
            One feature or fix per PR. Large, multi-concern PRs are hard to review and slower to
            merge.
          </Step>
          <Step num="2" title="Fill out the PR template">
            Describe <em>what</em> changed and <em>why</em>. Link the related issue with{' '}
            <Code>Closes #123</Code>.
          </Step>
          <Step num="3" title="Ensure tests pass">
            Run the test suite before opening your PR:
            <CodeBlock>{`cd backend && npm test
cd ai      && pytest`}</CodeBlock>
          </Step>
          <Step num="4" title="Pass linting and type checks">
            <CodeBlock>{`cd frontend && npm run lint
cd backend  && npm run lint`}</CodeBlock>
          </Step>
          <Step num="5" title="Request a review">
            Assign at least one maintainer as a reviewer. Address feedback constructively — we
            iterate together.
          </Step>
          <Step num="6" title="Merge">
            A maintainer will squash-merge once the PR is approved and CI passes. 🎉
          </Step>
        </div>
        <InfoBox type="warn">
          PRs that add features without tests, or that break existing tests, will not be merged
          until fixed.
        </InfoBox>
      </Section>

      {/* Code Standards */}
      <Section id="code-standards" icon={Code2} title="Code Standards" iconColor="text-blue-400">
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7 space-y-6">
          {[
            {
              title: 'Frontend (React / Vite)',
              items: [
                'Use functional components with hooks — no class components.',
                'Keep components small and single-responsibility.',
                'Co-locate styles; use Tailwind utility classes consistently.',
                'Prefer named exports over default exports for components.',
                'Use react-router-dom for all navigation — no direct window.location except for external links.',
              ],
            },
            {
              title: 'Backend (Node.js / Express)',
              items: [
                'All async route handlers must use try/catch and pass errors to next().',
                'Use the centralised API response helpers (res.success / res.error).',
                'Never log sensitive data (tokens, passwords, PII).',
                'All DB queries go through the repository layer — no raw queries in controllers.',
                'Background jobs use BullMQ — never block the event loop.',
              ],
            },
            {
              title: 'AI Service (Python / FastAPI)',
              items: [
                'All endpoints must have a Pydantic request/response model.',
                'Handle Groq API rate limits and return graceful fallback responses.',
                'Keep prompts in dedicated prompt files, not inline in handlers.',
              ],
            },
          ].map((group, gi) => (
            <div key={gi}>
              <div className="text-sm font-black text-white mb-3">{group.title}</div>
              <div className="space-y-2">
                {group.items.map((item, ii) => (
                  <div key={ii} className="flex items-start gap-2.5">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Reporting Bugs */}
      <Section id="reporting-bugs" icon={Bug} title="Reporting Bugs" iconColor="text-red-400">
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7">
          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            A good bug report means we can reproduce and fix it faster. Include the following in
            every report:
          </p>
          {[
            { label: 'Environment', desc: 'OS, browser, Node/Python version, Docker version.' },
            {
              label: 'Steps to Reproduce',
              desc: 'A numbered, minimal list of actions that triggers the bug.',
            },
            { label: 'Expected Behaviour', desc: 'What should have happened.' },
            {
              label: 'Actual Behaviour',
              desc: 'What actually happened — include error messages and stack traces.',
            },
            {
              label: 'Screenshots / Logs',
              desc: 'Attach relevant logs from Docker, the console, or Sentry if available.',
            },
          ].map((field, i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
              <div className="w-40 shrink-0 text-xs font-bold text-white pt-0.5">{field.label}</div>
              <div className="text-sm text-slate-400">{field.desc}</div>
            </div>
          ))}
          <div className="mt-5">
            <a
              href="/community"
              className="inline-flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Report a Bug via Community Page <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </Section>

      {/* Feature Requests */}
      <Section
        id="feature-requests"
        icon={Lightbulb}
        title="Feature Requests"
        iconColor="text-amber-400"
      >
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-7">
          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            Before submitting a feature request, check the{' '}
            <a href="/roadmap" className="text-blue-400 hover:underline">
              Public Roadmap
            </a>{' '}
            to see if it's already planned. If not, we'd love to hear it.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Great feature requests include: a clear problem statement, who is affected, and a
            proposed solution. Bonus points for mockups or user stories.
          </p>
          <a
            href="/community"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Submit a Feature Proposal <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </Section>

      {/* Recognition */}
      <Section id="recognition" icon={Star} title="Recognition" iconColor="text-amber-400">
        <div className="bg-gradient-to-br from-[#0d1117] via-[#0d1117] to-blue-950/30 border border-blue-500/20 rounded-2xl p-7">
          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            Every contributor is valued. Here's how we recognise your work:
          </p>
          {[
            { icon: GitFork, text: 'Your name appears in the CHANGELOG for every merged PR.' },
            {
              icon: Star,
              text: 'Significant contributors earn a special role in the Discord server.',
            },
            {
              icon: CheckCircle2,
              text: 'Core contributors are invited to the private maintainers channel.',
            },
            { icon: Heart, text: 'We shout out contributors in our release notes and blog posts.' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
            >
              <item.icon className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm text-slate-400">{item.text}</span>
            </div>
          ))}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="https://github.com/SSSahil15/DevPulse"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors shadow-lg"
            >
              <GithubIcon className="w-4 h-4" /> Start Contributing
            </a>
            <a
              href="/community"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              <MessageSquare className="w-4 h-4" /> Join the Community
            </a>
          </div>
        </div>
      </Section>
    </SidebarPageLayout>
  );
}
