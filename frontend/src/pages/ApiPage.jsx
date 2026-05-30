import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  X,
  Copy,
  Check,
  ChevronRight,
  Code2,
  Shield,
  Activity,
  GitBranch,
  Terminal,
  ArrowLeft,
  Radio,
} from 'lucide-react';
import { GithubIcon as Github, LinkedinIcon, DiscordIcon } from '../components/icons';

const CodeBlock = ({ code, language = 'json', title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {title && (
        <div className="absolute -top-3 left-4 px-2 bg-[#080b14] text-xs font-mono text-slate-400">
          {title}
        </div>
      )}
      <div className="bg-[#080b14] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
              {language}
            </span>
            <button
              onClick={handleCopy}
              className="text-slate-500 hover:text-white transition-colors p-1"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-300 leading-relaxed max-h-[400px]">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const EndpointBlock = ({
  method,
  path,
  description,
  requestData,
  responseData,
  status = '200 OK',
}) => {
  const methodColors = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PUT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="mb-16">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`px-2.5 py-1 rounded font-bold text-xs uppercase tracking-wider border ${methodColors[method] || 'bg-slate-800 text-slate-300'}`}
            >
              {method}
            </span>
            <code className="text-white font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/10 break-all">
              {path}
            </code>
          </div>
          <p className="text-slate-400 text-base leading-relaxed mb-6">{description}</p>
        </div>

        <div className="w-full lg:w-[450px] shrink-0 space-y-4">
          {requestData && <CodeBlock code={requestData} language="json" title="Request Body" />}
          <CodeBlock code={responseData} language="json" title={`Response (${status})`} />
        </div>
      </div>
      <div className="w-full h-px bg-white/5 mt-12" />
    </div>
  );
};

const API_SECTIONS = [
  {
    id: 'authentication',
    icon: Shield,
    title: 'Authentication',
    content: (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
          Authentication
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          All endpoints are authenticated using Bearer tokens. You can obtain a token by exchanging
          a GitHub OAuth code.
        </p>

        <EndpointBlock
          method="POST"
          path="/v1/auth/github"
          description="Exchange a GitHub OAuth code for a DevPulse access token and refresh token."
          requestData={`{\n  "code": "gho_xxxxxxxxxxxxxxx"\n}`}
          responseData={`{\n  "access_token": "dp_live_xxx",\n  "expires_in": 3600,\n  "user": {\n    "id": "12345",\n    "login": "octocat"\n  }\n}`}
        />
      </div>
    ),
  },
  {
    id: 'repositories',
    icon: GitBranch,
    title: 'Repositories',
    content: (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
          Repositories
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Manage and list connected GitHub repositories that DevPulse is actively monitoring.
        </p>

        <EndpointBlock
          method="GET"
          path="/v1/repos"
          description="List all repositories accessible by the authenticated user that have the DevPulse App installed."
          responseData={`{\n  "data": [\n    {\n      "id": "repo_1",\n      "name": "api-gateway",\n      "risk_score": 85,\n      "last_scan": "2026-05-26T12:00:00Z"\n    }\n  ],\n  "meta": { "total": 1 }\n}`}
        />

        <EndpointBlock
          method="GET"
          path="/v1/repos/:id"
          description="Retrieve detailed information about a specific repository, including its active webhooks and security posture."
          responseData={`{\n  "id": "repo_1",\n  "name": "api-gateway",\n  "default_branch": "main",\n  "is_monitored": true\n}`}
        />
      </div>
    ),
  },
  {
    id: 'risk-analysis',
    icon: Activity,
    title: 'Risk Analysis',
    content: (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
          Risk Analysis
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Trigger manual scans and retrieve the results of static analysis and AI threat models.
        </p>

        <EndpointBlock
          method="POST"
          path="/v1/analyze"
          description="Manually trigger a vulnerability scan for a specific repository."
          requestData={`{\n  "repositoryFullName": "SSSahil15/DevPulse",\n  "repoUrl": "https://github.com/SSSahil15/DevPulse"\n}`}
          responseData={`{\n  "message": "Analysis started in background.",\n  "jobId": "job_9a2f1c8e0b4d2a6f",\n  "room": "scan_SSSahil15/DevPulse"\n}`}
          status="202 Accepted"
        />

        <EndpointBlock
          method="GET"
          path="/v1/pipeline/jobs/:jobId"
          description="Poll for the status of a specific scan job."
          responseData={`{\n  "jobId": "job_9a2f1c8e0b4d2a6f",\n  "status": "completed",\n  "findings": [\n    {\n      "id": "vuln_1",\n      "severity": "critical",\n      "cwe": "CWE-89",\n      "file": "src/db.js",\n      "line": 42\n    }\n  ]\n}`}
        />
      </div>
    ),
  },
  {
    id: 'telemetry',
    icon: Radio,
    title: 'Telemetry',
    content: (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
          Telemetry (WebSocket)
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Connect to our WebSocket endpoint for live streaming of scan events, agent actions, and
          infrastructure metrics.
        </p>

        <EndpointBlock
          method="GET"
          path="wss://api.devpulse.dev/v1/telemetry/live"
          description="Establish a WebSocket connection. Requires token to be passed via query parameter for browser environments."
          requestData={`// Query Parameters\n?token=dp_live_xxx`}
          responseData={`// Server Push Example\n{\n  "event": "scan.progress",\n  "scan_id": "scan_999",\n  "progress_percent": 45,\n  "current_file": "src/auth.js"\n}`}
          status="101 Switching Protocols"
        />
      </div>
    ),
  },
  {
    id: 'ai-copilot',
    icon: Terminal,
    title: 'AI Copilot',
    content: (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
          AI Copilot
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Interact directly with the DevPulse AI remediation engine to generate automated fixes for
          vulnerabilities.
        </p>

        <EndpointBlock
          method="POST"
          path="/v1/ai/chat"
          description="Submit a natural language query to the AI Copilot regarding codebase health."
          requestData={`{\n  "query": "How do I fix the SQL injection vulnerability?",\n  "context": {},\n  "history": []\n}`}
          responseData={`{\n  "response": "To fix the SQL injection, use parameterized queries instead of string concatenation...",\n  "suggested_patch": "--- a/src/db.js\\n+++ b/src/db.js\\n..."\n}`}
        />
      </div>
    ),
  },
];

export default function ApiPage() {
  const [activeSection, setActiveSection] = useState(API_SECTIONS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-close sidebar on mobile when section changes
  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const [pageFeedback, setPageFeedback] = useState(null); // 'yes', 'no', or null

  // Reset feedback state when active section changes
  useEffect(() => {
    setPageFeedback(null);
  }, [activeSection]);

  const filteredSections = API_SECTIONS.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentContent = API_SECTIONS.find((s) => s.id === activeSection)?.content || (
    <div className="text-center py-20 text-slate-500">Section not found.</div>
  );

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col font-sans text-slate-300">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-3 border-b border-white/10 bg-[#080b14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <a href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
              <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
                <Code2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              DevPulse <span className="text-slate-500 font-normal">API Reference</span>
            </span>
            <span className="text-xl font-bold tracking-tight text-white sm:hidden">API</span>
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search API..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <a
            href="/docs"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors border-l border-white/10 pl-4"
          >
            Read the Docs
          </a>
          <a
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors border-l border-white/10 pl-4"
          >
            <ArrowLeft className="w-4 h-4" /> App
          </a>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
          fixed md:sticky top-[61px] left-0 z-50 h-[calc(100vh-61px)] w-72 bg-[#080b14] md:bg-transparent border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        >
          <div className="md:hidden mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search API..."
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

          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-3">
              Endpoints
            </div>

            {filteredSections.length === 0 ? (
              <div className="text-sm text-slate-500 ml-3">No results found.</div>
            ) : (
              filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-500/10 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <section.icon
                    className={`w-4 h-4 ${activeSection === section.id ? 'text-blue-400' : 'text-slate-500'}`}
                  />
                  {section.title}
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 lg:px-20 bg-[#0d1117]/50">
          <div className="max-w-6xl mx-auto">
            {currentContent}

            {/* Feedback Widget */}
            <div className="flex flex-col items-center justify-center gap-4 pb-10 mt-20 text-slate-500 text-sm border-t border-white/5 pt-10">
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
            </div>

            {/* Footer */}
            <footer className="w-full bg-[#06080d] border-t border-white/5 pt-16 pb-8 mt-10 z-10">
              <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 max-w-6xl mx-auto">
                <div className="col-span-1 md:col-span-1">
                  <a
                    href="/"
                    className="flex items-center gap-2 cursor-pointer group mb-4 inline-flex"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
                      <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
                        <img
                          src="/Logo.png"
                          alt="DevPulse Logo"
                          className="w-5 h-5 object-contain"
                        />
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
          </div>
        </main>
      </div>
    </div>
  );
}
