import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Menu,
  X,
  Copy,
  Check,
  ChevronRight,
  Book,
  Terminal as TerminalIcon,
  Shield,
  Radio,
  Key,
  Cloud,
  Activity,
  ArrowLeft,
  ArrowRight,
  Server,
  Database,
  GitBranch,
  Zap,
  Box,
  Settings,
  PlayCircle,
  Loader2,
  Command,
  BarChart,
  AlertTriangle,
  FileText,
  ShieldAlert,
  AlertCircle,
  ArrowDown,
} from 'lucide-react';
import { GithubIcon as Github, LinkedinIcon, DiscordIcon } from '../components/icons';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { codeToHtml } from 'shiki';

// --- Shiki Syntax Highlighter ---
const ShikiHighlighter = ({ code, language = 'bash' }) => {
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const highlight = async () => {
      try {
        const result = await codeToHtml(code, {
          lang: language,
          theme: 'github-dark-dimmed',
        });
        if (isMounted) setHtml(result);
      } catch (e) {
        if (isMounted) setHtml(`<pre><code>${code}</code></pre>`);
      }
    };
    highlight();
    return () => {
      isMounted = false;
    };
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6">
      <div className="absolute -top-3 left-4 px-2 bg-[#080b14] text-xs font-mono text-slate-400 z-10">
        {language}
      </div>
      <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden relative">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-white transition-colors p-1"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div
          className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed shiki-container"
          dangerouslySetInnerHTML={{ __html: html || `<pre><code>${code}</code></pre>` }}
        />
      </div>
    </div>
  );
};

// --- Interactive Terminal ---
const InteractiveTerminal = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = [
      1000, // type command
      500, // syncing
      800, // analyzed
      1200, // vulnerabilities
      1500, // pr generated
    ];
    let totalTime = 0;
    const timeouts = sequence.map((delay, index) => {
      totalTime += delay;
      return setTimeout(() => setStep(index + 1), totalTime);
    });

    // Reset loop
    const resetTimeout = setTimeout(() => setStep(0), totalTime + 4000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(resetTimeout);
    };
  }, [step === 0]); // Re-trigger when reset to 0

  return (
    <div className="bg-[#0a0d14] border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-sm mb-12">
      <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/30" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
          <div className="w-3 h-3 rounded-full bg-green-500/30" />
        </div>
        <div className="mx-auto text-slate-500 text-xs flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5" /> local ~ devpulse
        </div>
      </div>
      <div className="p-5 space-y-3 min-h-[220px]">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">➜</span>
          <span className="text-blue-400">~</span>
          {step > 0 && <span className="text-white typewriter-effect">devpulse scan .</span>}
          {step === 0 && (
            <span className="w-2 h-4 bg-slate-400 animate-pulse inline-block align-middle" />
          )}
        </div>

        {step > 1 && (
          <div className="flex items-center gap-3 text-slate-300 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Repository synced</span>
          </div>
        )}

        {step > 2 && (
          <div className="flex items-center gap-3 text-slate-300 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>1,204 files analyzed in 4.2s</span>
          </div>
        )}

        {step > 3 && (
          <div className="flex items-center gap-3 text-amber-400 animate-in fade-in slide-in-from-bottom-2">
            <Radio className="w-4 h-4 text-amber-500" />
            <span>3 vulnerabilities found (1 Critical, 2 Medium)</span>
          </div>
        )}

        {step > 4 && (
          <div className="flex items-start gap-3 text-emerald-400 animate-in fade-in slide-in-from-bottom-2 mt-4 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
            <Zap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">AI remediation PR generated!</div>
              <div className="text-emerald-500/80 text-xs mt-1">github.com/org/repo/pull/142</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Endpoint Card ---
const Endpoint = ({ method, path }) => {
  const colors = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <div className="flex items-center gap-3 font-mono bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 mb-6 w-full overflow-x-auto">
      <span
        className={`px-2 py-1 rounded text-xs font-black tracking-widest uppercase shrink-0 ${colors[method] || colors.GET}`}
      >
        {method}
      </span>
      <span className="text-white font-bold whitespace-nowrap">{path}</span>
    </div>
  );
};

// --- Architecture Diagram ---
const ArchitectureDiagram = () => (
  <div className="my-12 p-8 bg-gradient-to-br from-[#0d1117] to-slate-900/50 border border-white/10 rounded-2xl overflow-hidden relative">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <h3 className="text-xl font-bold text-white mb-8 relative z-10">System Architecture</h3>

    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 relative z-10">
      <div className="flex flex-col items-center gap-2 group w-full md:w-auto">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#080b14] border border-white/10 flex items-center justify-center shadow-xl group-hover:border-blue-500/50 group-hover:shadow-blue-500/20 transition-all">
          <Github className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-slate-400">GitHub</span>
      </div>

      <div className="md:hidden">
        <ArrowDown className="w-4 h-4 text-blue-500/50" />
      </div>
      <div className="hidden md:flex flex-col items-center flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
          Webhook
        </div>
        <div className="w-full h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 relative">
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 group w-full md:w-auto">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-blue-900/20 border border-blue-500/30 flex items-center justify-center shadow-xl group-hover:border-blue-400 transition-all">
          <Server className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-slate-400">Queue</span>
      </div>

      <div className="md:hidden">
        <ArrowDown className="w-4 h-4 text-purple-500/50" />
      </div>
      <div className="hidden md:flex flex-col items-center flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
          Process
        </div>
        <div className="w-full h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0" />
      </div>

      <div className="flex flex-col items-center gap-2 group w-full md:w-auto">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-purple-900/20 border border-purple-500/30 flex items-center justify-center shadow-xl group-hover:border-purple-400 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent animate-pulse" />
          <Activity className="w-8 h-8 md:w-10 md:h-10 text-purple-400 relative z-10" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-purple-300">AI Risk</span>
      </div>

      <div className="md:hidden">
        <ArrowDown className="w-4 h-4 text-emerald-500/50" />
      </div>
      <div className="hidden md:flex flex-col items-center flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
          Results
        </div>
        <div className="w-full h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
      </div>

      <div className="flex flex-col items-center gap-2 group w-full md:w-auto">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center shadow-xl group-hover:border-emerald-400 transition-all">
          <Box className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-slate-400">Dashboard</span>
      </div>
    </div>
  </div>
);

// --- Content Data ---
const DOC_SECTIONS = [
  {
    id: 'quickstart',
    category: 'Getting Started',
    icon: Zap,
    title: 'Quickstart (Current State)',
    badge: { text: 'Real', color: 'emerald' },
    searchText:
      'quickstart install setup clone run docker npm environment variables local development',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Project Quickstart
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Currently, DevPulse is a fully functional <strong>Frontend UI prototype</strong> built
          with React, Vite, and Tailwind CSS. Here is how to run the actual project locally.
        </p>

        <InteractiveTerminal />

        <h2 id="install" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          1. Clone the Repository
        </h2>
        <p className="text-slate-400 mb-4">
          Ensure you have Git installed, then clone the DevPulse monorepo.
        </p>
        <ShikiHighlighter
          code="git clone https://github.com/SSSahil15/DevPulse.git devpulse
cd devpulse"
          language="bash"
        />

        <h2 id="env-setup" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          2. Environment Setup
        </h2>
        <p className="text-slate-400 mb-4">
          Create the necessary <code className="bg-white/10 px-1.5 py-0.5 rounded">.env</code> files
          for the services. Currently, the frontend requires Discord webhooks for the community page
          integrations.
        </p>
        <ShikiHighlighter
          code="# In devpulse/frontend/.env
VITE_DISCORD_PROPOSAL_WEBHOOK_URL=your_discord_webhook_url
VITE_DISCORD_WEBHOOK_URL=your_discord_webhook_url"
          language="bash"
        />

        <h2 id="run-docker" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          3a. Run via Docker Compose (Recommended)
        </h2>
        <p className="text-slate-400 mb-4">
          The easiest way to start the entire stack (Frontend, FastAPI Backend, Redis Queue) is
          using Docker.
        </p>
        <ShikiHighlighter code="docker-compose up -d --build" language="bash" />
        <p className="text-sm text-slate-500 mt-2">
          The frontend will be available at{' '}
          <code className="text-slate-400">http://localhost:5173</code> and the API at{' '}
          <code className="text-slate-400">http://localhost:8000</code>.
        </p>

        <h2 id="run-npm" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          3b. Run Locally via NPM
        </h2>
        <p className="text-slate-400 mb-4">
          If you prefer running the services natively without Docker, start the frontend and backend
          manually in separate terminals.
        </p>
        <ShikiHighlighter
          code="# Terminal 1: Frontend
cd frontend
npm install
npm run dev

# Terminal 2: Backend (FastAPI / Redis)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload"
          language="bash"
        />

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl mt-8 flex gap-4 items-start">
          <Check className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">Live Integrations Active</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Once running, you can visit the <strong>/community</strong> page to test the live
              Discord Webhook integrations for Feature Proposals and Bug Reports.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'current-features',
    category: 'Core Concepts',
    icon: Box,
    title: 'Current Active Features',
    searchText:
      'current active features community discord webhooks roadmap blog documentation fuse.js shiki syntax',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Active Features
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          The following features are fully implemented and interactable in the current DevPulse
          frontend.
        </p>

        <h2
          id="community-webhooks"
          className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24"
        >
          Community Discord Webhooks
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          The{' '}
          <a href="/community" className="text-blue-400 hover:underline">
            Community Page
          </a>{' '}
          features modals for submitting feature proposals and reporting bugs. These forms are wired
          to `fetch` calls that send rich embedded payloads directly to our Discord channels using
          the `VITE_DISCORD_PROPOSAL_WEBHOOK_URL` and `VITE_DISCORD_WEBHOOK_URL` environment
          variables.
        </p>

        <h2 id="public-roadmap" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Public Roadmap
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          The{' '}
          <a href="/roadmap" className="text-blue-400 hover:underline">
            Roadmap Page
          </a>{' '}
          provides a categorized timeline (Q1-Q4) of our planned features, including status
          filtering (Shipped, In Progress, Planned).
        </p>

        <h2 id="engineering-blog" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Engineering Blog
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          The{' '}
          <a href="/blog" className="text-blue-400 hover:underline">
            Blog Page
          </a>{' '}
          contains a fully interactive article system with category filtering, trending post
          tracking, and full-screen reading modals for deep technical deep-dives.
        </p>

        <h2
          id="documentation-engine"
          className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24"
        >
          Interactive Documentation
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          This exact documentation page you are reading features:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4 mb-8">
          <li>
            <strong>Shiki</strong> syntax highlighting
          </li>
          <li>
            <strong>Fuse.js</strong> fuzzy search across all sections
          </li>
          <li>Scrollspy-powered sticky Table of Contents</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'future-architecture',
    category: 'Future Update Plan',
    icon: Database,
    title: 'System Architecture',
    badge: { text: 'Planned', color: 'blue' },
    searchText:
      'system architecture planned workflow ingestion static analysis ast ai contextualization remediation draft pr',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Planned Architecture
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Once the backend services are built, DevPulse will process code, detect vulnerabilities,
          and generate remediation PRs securely.
        </p>

        <ArchitectureDiagram />

        <h2 id="workflow" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          The Analysis Workflow (Upcoming)
        </h2>
        <ol className="list-decimal list-inside space-y-3 text-slate-400 ml-4 mb-8">
          <li>
            <strong className="text-white">Ingestion:</strong> The payload is received via webhook
            and queued in Redis.
          </li>
          <li>
            <strong className="text-white">Static Analysis (AST):</strong> Fast, rules-based
            scanners run locally to identify structural flaws.
          </li>
          <li>
            <strong className="text-white">AI Contextualization:</strong> Findings are sent to the
            AI Risk Engine to filter false positives based on code context.
          </li>
          <li>
            <strong className="text-white">Remediation:</strong> If enabled, safe patches are
            generated and pushed as a draft PR.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: 'future-deployment',
    category: 'Future Update Plan',
    icon: Cloud,
    title: 'Deployment Guides',
    badge: { text: 'Planned', color: 'blue' },
    searchText:
      'future deployment guides docker compose kubernetes helm resources limits retries scale',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Future Deployment
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          How to deploy the DevPulse agent and backend services across different infrastructure
          providers (Not yet implemented).
        </p>

        <h2 id="docker-compose" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Docker Compose
        </h2>
        <ShikiHighlighter
          code={`version: '3.8'
services:
  agent:
    image: devpulse/agent:latest
    environment:
      - DEVPULSE_API_KEY=\${API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data`}
          language="yaml"
        />

        <h2 id="kubernetes" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Kubernetes (Helm)
        </h2>
        <ShikiHighlighter
          code={`helm repo add devpulse https://charts.devpulse.com
helm install my-agent devpulse/agent \
  --set auth.apiKey=YOUR_API_KEY \
  --namespace devsecops --create-namespace`}
          language="bash"
        />

        <h2 id="resource-limits" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Resource Limits & Retries
        </h2>
        <p className="text-slate-400 mb-4">
          When deploying the agent in a high-throughput environment, ensure sufficient memory
          allocation for AST processing.
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4 mb-8">
          <li>
            <strong>Memory:</strong> Minimum 2GB RAM required per agent replica.
          </li>
          <li>
            <strong>CPU:</strong> 1 vCPU is sufficient for most workloads.
          </li>
          <li>
            <strong>Retries:</strong> Network timeouts to the core AI engine will automatically
            retry with exponential backoff (max 5 retries).
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'future-rest-api',
    category: 'Future Update Plan',
    icon: Server,
    title: 'REST Endpoints',
    badge: { text: 'Planned', color: 'blue' },
    searchText:
      'future rest api endpoints trigger scan rate limits error codes 401 429 500 empty state',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Planned REST Endpoints
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Programmatic access to trigger scans, fetch reports, and manage repositories.
        </p>

        <h2 id="trigger-scan" className="text-2xl font-bold text-white mt-12 mb-6 scroll-mt-24">
          Trigger Manual Scan
        </h2>
        <Endpoint method="POST" path="/v1/scans" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">Request Payload</h4>
            <ShikiHighlighter
              code={`{
  "repository_id": "repo_8f72a1",
  "branch": "main",
  "commit_sha": "a1b2c3d4e5f6",
  "auto_remediate": true
}`}
              language="json"
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">
              Success Response (202 Accepted)
            </h4>
            <ShikiHighlighter
              code={`{
  "scan_id": "scan_99x81",
  "status": "queued",
  "estimated_time_sec": 45
}`}
              language="json"
            />
          </div>
        </div>

        <h2 id="get-scan" className="text-2xl font-bold text-white mt-12 mb-6 scroll-mt-24">
          Get Scan Results
        </h2>
        <Endpoint method="GET" path="/v1/scans/:scan_id" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">Empty State (No Findings)</h4>
            <ShikiHighlighter
              code={`{
  "scan_id": "scan_99x81",
  "status": "completed",
  "vulnerabilities": []
}`}
              language="json"
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">Findings State</h4>
            <ShikiHighlighter
              code={`{
  "scan_id": "scan_99x81",
  "status": "completed",
  "vulnerabilities": [
    {
      "id": "vuln_1",
      "severity": "high",
      "file": "app/auth.js"
    }
  ]
}`}
              language="json"
            />
          </div>
        </div>

        <h2 id="api-errors" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Error Responses & Rate Limits
        </h2>
        <p className="text-slate-400 mb-4">
          The API enforces a strict rate limit of 100 requests per minute per authenticated IP.
        </p>
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2">401 Unauthorized</h3>
            <ShikiHighlighter
              code={`{
  "error": "unauthorized",
  "message": "Invalid or expired Bearer token"
}`}
              language="json"
            />
          </div>
          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2">429 Too Many Requests</h3>
            <ShikiHighlighter
              code={`{
  "error": "rate_limit_exceeded",
  "message": "Quota exceeded. Retry in 45 seconds.",
  "retry_after": 45
}`}
              language="json"
            />
          </div>
          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2">500 Internal Server Error</h3>
            <ShikiHighlighter
              code={`{
  "error": "internal_failure",
  "message": "AI Risk Engine failed to respond",
  "request_id": "req_8841a"
}`}
              language="json"
            />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'future-websockets',
    category: 'Future Update Plan',
    icon: Radio,
    title: 'WebSocket Events',
    badge: { text: 'Planned', color: 'blue' },
    searchText:
      'future websockets events streaming telemetry progress finding completed failed disconnected empty',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Planned WebSocket Events
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Subscribe to real-time telemetry from your scans to build custom live dashboards.
        </p>

        <h2 id="event-types" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Event Types
        </h2>

        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> scan.progress
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Emitted every 2 seconds during an active scan.
            </p>
            <ShikiHighlighter
              code={`{
  "event": "scan.progress",
  "data": {
    "scan_id": "scan_99x81",
    "files_scanned": 450,
    "total_files": 1200,
    "current_phase": "ast_analysis"
  }
}`}
              language="json"
            />
          </div>

          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> scan.finding
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Emitted instantly when a vulnerability is discovered.
            </p>
            <ShikiHighlighter
              code={`{
  "event": "scan.finding",
  "data": {
    "scan_id": "scan_99x81",
    "severity": "high",
    "rule": "sql-injection",
    "file": "api/users.js"
  }
}`}
              language="json"
            />
          </div>

          <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> agent.disconnected
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Emitted if the polling agent loses heartbeat.
            </p>
            <ShikiHighlighter
              code={`{
  "event": "agent.disconnected",
  "data": {
    "agent_id": "agent_worker_1",
    "last_seen": "2026-07-12T14:22:10Z"
  }
}`}
              language="json"
            />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'telemetry',
    category: 'Future Update Plan',
    icon: BarChart,
    title: 'Analytics & Telemetry',
    badge: { text: 'Planned', color: 'blue' },
    searchText: 'analytics telemetry metrics prometheus datadog grafana dashboard sla mttf mttr',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Analytics & Telemetry
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          DevPulse is designed to natively export observability metrics to Prometheus, Datadog, or
          Grafana via OpenTelemetry.
        </p>

        <h2 id="emitted-metrics" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Emitted Metrics
        </h2>
        <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4 mb-8">
          <li>
            <code className="text-blue-400 font-mono text-sm">devpulse_scan_duration_ms</code>:
            Histogram of scan times.
          </li>
          <li>
            <code className="text-blue-400 font-mono text-sm">devpulse_vulnerabilities_total</code>:
            Counter grouped by severity.
          </li>
          <li>
            <code className="text-blue-400 font-mono text-sm">
              devpulse_remediation_success_rate
            </code>
            : Gauge of PR merge success.
          </li>
          <li>
            <code className="text-blue-400 font-mono text-sm">devpulse_api_rate_limit_hits</code>:
            Counter for 429s.
          </li>
        </ul>

        <div className="bg-[#0d1117] border border-white/10 p-5 rounded-xl mt-8 flex gap-4 items-start">
          <Activity className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">No Telemetry Available (Empty State)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              If your DevPulse instance has just been spun up, the metrics endpoint `/v1/metrics`
              will safely return a 204 No Content until the first scan completes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'security-disclosure',
    category: 'Security',
    icon: ShieldAlert,
    title: 'Security Disclosure',
    searchText: 'security disclosure responsible bounty cve handling reporting vulnerability patch',
    content: (
      <div className="space-y-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Security Disclosure
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          We take the security of DevPulse seriously. If you believe you have found a vulnerability
          in the DevPulse platform itself, please follow our responsible disclosure guidelines.
        </p>

        <h2 id="reporting" className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
          Reporting a Vulnerability
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          Please do not file public issues for security vulnerabilities. Instead, send an email to{' '}
          <a href="mailto:security@devpulse.com" className="text-blue-400 hover:underline">
            security@devpulse.com
          </a>
          . We will acknowledge receipt within 24 hours.
        </p>

        <h2
          id="disclosure-program"
          className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24"
        >
          Responsible Disclosure Program
        </h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          We welcome security researchers and developers to responsibly disclose vulnerabilities
          discovered in DevPulse.
        </p>
        <p className="text-slate-400 leading-relaxed mb-4">
          If you identify a security issue, please report it privately with detailed reproduction
          steps and proof-of-concept information. We are committed to reviewing and addressing
          legitimate reports as quickly as possible.
        </p>
        <p className="text-slate-400 leading-relaxed mb-4">
          While we currently do not offer monetary rewards, valid contributions may receive:
        </p>
        <ul className="list-disc pl-5 mb-8 text-slate-400 space-y-2">
          <li>Public acknowledgment</li>
          <li>Contributor recognition</li>
          <li>Early access features</li>
          <li>Priority community status</li>
          <li>Future bounty eligibility</li>
        </ul>

        <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl mt-8 flex gap-4 items-start">
          <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">Out of Scope</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Social engineering, phishing, denial-of-service attacks, physical attacks, spam, and
              vulnerabilities requiring unrealistic user interaction are considered out of scope.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

// Flatten categories for sidebar
const CATEGORIES = [...new Set(DOC_SECTIONS.map((s) => s.category))];

// --- Main Docs Component ---
export default function DocsPage() {
  const [activeSectionId, setActiveSectionId] = useState(DOC_SECTIONS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pageFeedback, setPageFeedback] = useState(null); // 'yes', 'no', or null

  // Reset feedback state when active section changes
  useEffect(() => {
    setPageFeedback(null);
  }, [activeSectionId]);

  // Global Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle Command Palette (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Focus Search (/)
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && !isCommandPaletteOpen) {
        e.preventDefault();
        const searchInput = document.getElementById('docs-search');
        if (searchInput) searchInput.focus();
      }
    };

    const handleScrollProgress = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollProgress, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollProgress);
    };
  }, [isCommandPaletteOpen]);

  // Table of Contents state
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  // Fuse search
  const fuse = useMemo(
    () =>
      new Fuse(DOC_SECTIONS, {
        keys: ['title', 'category', 'searchText'],
        threshold: 0.3,
        includeScore: true,
      }),
    [],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery) return DOC_SECTIONS;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [searchQuery, fuse]);

  const currentSection = DOC_SECTIONS.find((s) => s.id === activeSectionId) || DOC_SECTIONS[0];
  const currentIndex = DOC_SECTIONS.findIndex((s) => s.id === activeSectionId);
  const prevSection = currentIndex > 0 ? DOC_SECTIONS[currentIndex - 1] : null;
  const nextSection =
    currentIndex < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[currentIndex + 1] : null;

  // Extract headings for TOC
  useEffect(() => {
    const extractHeadings = () => {
      const headingElements = Array.from(document.querySelectorAll('main h2[id]'));
      setHeadings(
        headingElements.map((h) => ({
          id: h.id,
          text: h.textContent.replace(/^(GET|POST|PUT|DELETE)\s/, ''), // clean up API pills for TOC
        })),
      );
    };
    // small delay to allow react to render the new section
    setTimeout(extractHeadings, 50);
  }, [activeSectionId]);

  // Scrollspy for TOC
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = Array.from(document.querySelectorAll('main h2[id]'));
      let currentId = '';
      for (const heading of headingElements) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 120) {
          // offset for sticky header
          currentId = heading.id;
        } else {
          break;
        }
      }
      if (currentId) setActiveHeadingId(currentId);
      else if (headings.length > 0) setActiveHeadingId(headings[0].id);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // Handle navigation
  const navigateTo = (id) => {
    setActiveSectionId(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
    setSearchQuery('');
  };

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(id);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col font-sans text-slate-300">
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
              DevPulse <span className="text-slate-500 font-normal">Docs</span>
            </span>
          </a>

          {/* Version Selector */}
          <div className="hidden sm:flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            v1.3 <ChevronRight className="w-3.5 h-3.5 rotate-90" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search docs (Press '/')"
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

      {/* ── Install Hero Banner ── */}
      <div className="border-b border-white/5 bg-[#0a0d14] py-3 px-6 text-center text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-3">
        <span className="text-slate-400">Install the CLI to start scanning:</span>
        <code className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 flex items-center gap-3 group">
          npm install -g @devpulse/cli
          <button
            onClick={() => navigator.clipboard.writeText('npm install -g @devpulse/cli')}
            className="text-blue-500/50 group-hover:text-blue-400 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </code>
      </div>

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
          fixed md:sticky top-[125px] left-0 z-50 h-[calc(100vh-125px)] w-72 bg-[#080b14] md:bg-transparent border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300 custom-scrollbar
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        >
          <div className="md:hidden mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search docs..."
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
            {searchQuery && searchResults.length === 0 ? (
              <div className="text-sm text-slate-500">No results found for "{searchQuery}"</div>
            ) : null}

            {CATEGORIES.map((category) => {
              const catSections = searchResults.filter((s) => s.category === category);
              if (catSections.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 px-3">
                    {category}
                  </div>
                  {catSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => navigateTo(section.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                        activeSectionId === section.id
                          ? 'bg-blue-500/10 text-blue-400 font-semibold shadow-[inset_2px_0_0_0_#3b82f6]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={section.title}
                    >
                      <div className="flex items-center gap-3 min-w-0 text-left">
                        <section.icon
                          className={`w-4 h-4 shrink-0 ${activeSectionId === section.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                        />
                        <span className="truncate group-hover:whitespace-normal group-hover:break-words">
                          {section.title}
                        </span>
                      </div>
                      {section.badge && (
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                            section.badge.color === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {section.badge.text}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 lg:px-16 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-8">
            <span>Docs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{currentSection.category}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-300">{currentSection.title}</span>
          </div>

          <div className="prose-custom">{currentSection.content}</div>

          {/* ── Footer Navigation ── */}
          <div className="mt-20 pt-8 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
              {prevSection ? (
                <button
                  onClick={() => navigateTo(prevSection.id)}
                  className="w-full sm:w-1/2 flex flex-col items-start p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />{' '}
                    Previous
                  </span>
                  <span className="text-white font-medium">{prevSection.title}</span>
                </button>
              ) : (
                <div className="w-full sm:w-1/2" />
              )}

              {nextSection ? (
                <button
                  onClick={() => navigateTo(nextSection.id)}
                  className="w-full sm:w-1/2 flex flex-col items-end p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all text-right group"
                >
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    Next{' '}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-white font-medium">{nextSection.title}</span>
                </button>
              ) : (
                <div className="w-full sm:w-1/2" />
              )}
            </div>

            {/* Powered By */}
            <div className="flex flex-col items-center justify-center gap-4 pb-10 text-slate-500 text-sm">
              <div className="flex items-center gap-4 h-6">
                {pageFeedback === null ? (
                  <>
                    <span>Was this page helpful?</span>
                    <button
                      onClick={() => setPageFeedback('yes')}
                      className="hover:text-emerald-400 font-bold transition-colors px-2 py-0.5 rounded hover:bg-emerald-500/10"
                    >
                      Yes
                    </button>
                    <span className="text-white/10">|</span>
                    <button
                      onClick={() => setPageFeedback('no')}
                      className="hover:text-red-400 font-bold transition-colors px-2 py-0.5 rounded hover:bg-red-500/10"
                    >
                      No
                    </button>
                  </>
                ) : pageFeedback === 'yes' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium animate-in fade-in zoom-in-95 duration-200">
                    <Check className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>Thank you! We're glad you found this helpful.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 font-medium animate-in fade-in zoom-in-95 duration-200">
                    <span>Thank you! We'll work on making this page better.</span>
                  </div>
                )}
              </div>
              <div className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
                Powered by: <span className="text-slate-400">FastAPI</span> •{' '}
                <span className="text-slate-400">Redis</span> •{' '}
                <span className="text-slate-400">Trivy</span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <footer className="w-full bg-[#06080d] border-t border-white/5 pt-16 pb-8 mt-auto z-10">
            <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 max-w-4xl mx-auto">
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
                    <Github className="w-5 h-5" />
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

            <div className="px-6 md:px-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 max-w-4xl mx-auto">
              <div>&copy; {new Date().getFullYear()} DevPulse Inc. All rights reserved.</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>
          </footer>
        </main>

        {/* ── Right Sidebar (In-page TOC) ── */}
        <aside className="hidden xl:block w-64 shrink-0 pr-8 py-10 sticky top-[125px] h-[calc(100vh-125px)] overflow-y-auto custom-scrollbar">
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
