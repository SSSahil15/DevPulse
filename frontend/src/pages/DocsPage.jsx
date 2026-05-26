import React, { useState, useEffect } from 'react';
import { Search, Menu, X, Copy, Check, ChevronRight, Book, Terminal, Shield, Radio, Key, Cloud, Activity, ArrowLeft } from 'lucide-react';
import { GithubIcon as Github } from '../components/icons';
import { Link } from 'react-router-dom';

const CodeBlock = ({ code, language = 'bash' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6">
      <div className="absolute -top-3 left-4 px-2 bg-[#080b14] text-xs font-mono text-slate-400">
        {language}
      </div>
      <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
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
        <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const DOC_SECTIONS = [
  {
    id: 'getting-started',
    icon: Book,
    title: 'Getting Started',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Getting Started</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          DevPulse is an AI-powered DevSecOps platform that automatically detects and remediates security vulnerabilities in your codebase before they reach production.
        </p>
        
        <h2 className="text-2xl font-bold text-white mt-12 mb-4">Core Concepts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0d1117] border border-white/5 p-5 rounded-xl">
            <Shield className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Continuous Scanning</h3>
            <p className="text-sm text-slate-400">Every push is analyzed using static analysis and AI threat detection.</p>
          </div>
          <div className="bg-[#0d1117] border border-white/5 p-5 rounded-xl">
            <Activity className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Autonomous Remediation</h3>
            <p className="text-sm text-slate-400">When a flaw is found, DevPulse generates a pull request with the fix.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'installation',
    icon: Terminal,
    title: 'Installation',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Installation</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          You can deploy the DevPulse agent directly into your CI/CD pipeline using our CLI or Docker image.
        </p>
        
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Using NPM</h2>
        <p className="text-slate-400">Install the CLI globally to run local scans.</p>
        <CodeBlock code="npm install -g @devpulse/cli" language="bash" />
        
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Using Docker</h2>
        <p className="text-slate-400">Run the agent inside a containerized environment.</p>
        <CodeBlock code="docker pull devpulse/agent:latest
docker run -v $(pwd):/app -e DEVPULSE_API_KEY=xxx devpulse/agent scan" language="bash" />
      </div>
    )
  },
  {
    id: 'github-integration',
    icon: Github,
    title: 'GitHub Integration',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">GitHub Integration</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          The tightest integration is via our GitHub App, which allows DevPulse to comment on PRs and push fixes directly.
        </p>
        
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">GitHub Actions</h2>
        <p className="text-slate-400">Add this workflow to your repository at <code className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-sm">.github/workflows/devpulse.yml</code>.</p>
        <CodeBlock code={`name: DevPulse Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run DevPulse
        uses: devpulse/action@v1
        with:
          api-token: \${{ secrets.DEVPULSE_TOKEN }}`} language="yaml" />
      </div>
    )
  },
  {
    id: 'ai-risk-engine',
    icon: Shield,
    title: 'AI Risk Engine',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">AI Risk Engine</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Our proprietary predictive risk engine analyzes code changes in the context of your entire repository.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mt-6">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> The AI engine requires read access to your source code. We do not train our public models on your private code.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'websocket-events',
    icon: Radio,
    title: 'WebSocket Events',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">WebSocket Events</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Subscribe to real-time telemetry from your scans.
        </p>
        
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Connecting</h2>
        <CodeBlock code={`const ws = new WebSocket('wss://api.devpulse.com/v1/stream?token=xxx');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};`} language="javascript" />

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Payload Example</h2>
        <CodeBlock code={`{
  "event": "scan.progress",
  "data": {
    "repoId": "12345",
    "filesScanned": 150,
    "totalFiles": 1200,
    "currentVulnerabilities": 2
  }
}`} language="json" />
      </div>
    )
  },
  {
    id: 'api-authentication',
    icon: Key,
    title: 'API Authentication',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">API Authentication</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Interact with DevPulse programmatically using our REST API.
        </p>
        
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Bearer Tokens</h2>
        <p className="text-slate-400">Include your API key in the Authorization header.</p>
        <CodeBlock code={`curl -X GET https://api.devpulse.com/v1/scans \\
  -H "Authorization: Bearer dp_live_xxxxxxxxxxxxxxxxxxxx"`} language="bash" />
      </div>
    )
  },
  {
    id: 'deployment-guide',
    icon: Cloud,
    title: 'Deployment Guide',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Deployment Guide</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Ensure zero-downtime integration of DevPulse gatekeepers in your deployment strategies.
        </p>
        <p className="text-slate-400">
          DevPulse can be configured to block deployments if critical vulnerabilities are detected.
        </p>
      </div>
    )
  },
  {
    id: 'observability-setup',
    icon: Activity,
    title: 'Observability Setup',
    content: (
      <div className="space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Observability Setup</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Export DevPulse metrics to Datadog, Prometheus, or Grafana.
        </p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Prometheus Endpoint</h2>
        <CodeBlock code={`scrape_configs:
  - job_name: 'devpulse'
    bearer_token: 'dp_live_xxx'
    static_configs:
      - targets: ['api.devpulse.com']
    metrics_path: '/v1/metrics'`} language="yaml" />
      </div>
    )
  }
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-close sidebar on mobile when section changes
  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const filteredSections = DOC_SECTIONS.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentContent = DOC_SECTIONS.find(s => s.id === activeSection)?.content || (
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
                <img src="/Logo.png" alt="DevPulse Logo" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">DevPulse <span className="text-slate-500 font-normal">Docs</span></span>
          </a>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search docs..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <a href="/" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to App
          </a>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-[61px] left-0 z-50 h-[calc(100vh-61px)] w-72 bg-[#080b14] md:bg-transparent border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="md:hidden mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search docs..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-3">Contents</div>
            
            {filteredSections.length === 0 ? (
              <div className="text-sm text-slate-500 ml-3">No results found.</div>
            ) : (
              filteredSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    activeSection === section.id 
                      ? 'bg-blue-500/10 text-blue-400 font-semibold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-blue-400' : 'text-slate-500'}`} />
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
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 lg:px-20 animate-in fade-in duration-500">
          <div className="max-w-3xl">
            {currentContent}
            
            {/* Footer Pagination (Simple Mock) */}
            <div className="mt-20 pt-8 border-t border-white/10 flex justify-between items-center text-sm">
              <div className="text-slate-500">
                Was this page helpful? 
                <button className="ml-3 hover:text-white transition-colors">Yes</button>
                <span className="mx-2 text-white/20">|</span>
                <button className="hover:text-white transition-colors">No</button>
              </div>
              <a href="#" className="text-blue-400 hover:underline">Edit this page on GitHub</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
