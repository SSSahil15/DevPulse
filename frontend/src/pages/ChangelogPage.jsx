import React, { useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout';
import { Search, ExternalLink, Sparkles } from 'lucide-react';

const RELEASES = [
  {
    version: 'v1.3.0',
    date: 'May 20, 2026',
    githubLink: 'https://github.com/SSSahil15/repo-for-testing/releases/tag/v1.3.0',
    latest: true,
    updates: [
      { type: 'Added', text: 'AI remediation engine to automatically generate fix PRs.' },
      { type: 'Added', text: 'Live telemetry dashboard using WebSockets.' },
      { type: 'Improved', text: 'GitHub sync performance for large monorepos.' }
    ]
  },
  {
    version: 'v1.2.0',
    date: 'May 6, 2026',
    githubLink: 'https://github.com/SSSahil15/repo-for-testing/releases/tag/v1.2.0',
    updates: [
      { type: 'Added', text: 'Deployment analytics and failure rate tracking.' },
      { type: 'Added', text: 'CVE scanning integration in CI/CD pipelines.' },
      { type: 'Added', text: 'Observability support for infrastructure health.' }
    ]
  },
  {
    version: 'v1.1.0',
    date: 'April 22, 2026',
    githubLink: 'https://github.com/SSSahil15/repo-for-testing/releases/tag/v1.1.0',
    updates: [
      { type: 'Added', text: 'Initial AI risk engine for vulnerability prediction.' },
      { type: 'Added', text: 'OAuth integration for GitHub authentication.' },
      { type: 'Improved', text: 'Repository monitoring and polling.' }
    ]
  }
];

const BADGE_COLORS = {
  Added: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Improved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Fixed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Security: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function ChangelogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Added', 'Improved', 'Fixed', 'Security'];

  const filteredReleases = RELEASES.map(release => {
    const filteredUpdates = release.updates.filter(update => {
      const matchesSearch = update.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || update.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
    return { ...release, updates: filteredUpdates };
  }).filter(release => release.updates.length > 0);

  return (
    <StaticPageLayout>
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-[#4F46E5] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Product Updates
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Changelog</h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl">
          See what's new in DevPulse. We ship improvements every week to make your DevSecOps seamless.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-12">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search releases..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                activeFilter === f 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-[#0d1117] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-16 relative before:absolute before:inset-0 before:ml-5 md:before:ml-[8.5rem] before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/10 before:to-transparent">
        {filteredReleases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No updates found matching your filters.
          </div>
        ) : (
          filteredReleases.map((release, index) => (
            <div key={release.version} className="relative flex flex-col md:flex-row gap-6 md:gap-12 group animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}>
              
              {/* Timeline dot */}
              <div className="absolute left-5 md:left-[8.5rem] w-3 h-3 bg-[#080b14] border-2 border-blue-500 rounded-full -translate-x-1.5 md:translate-x-[-1px] mt-1.5 md:mt-2 ring-4 ring-[#080b14]" />

              <div className="md:w-32 shrink-0 pt-1 pl-12 md:pl-0 text-left md:text-right">
                <div className="text-sm font-semibold text-slate-500 group-hover:text-slate-400 transition-colors">
                  {release.date}
                </div>
              </div>

              <div className="flex-1 bg-[#0d1117] border border-white/5 group-hover:border-white/10 rounded-2xl p-6 md:p-8 transition-colors shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white tracking-tight">{release.version}</h3>
                    {release.latest && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        Latest
                      </span>
                    )}
                  </div>
                  <a 
                    href={release.githubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-white transition-colors bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 px-3 py-1.5 rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub
                  </a>
                </div>

                <ul className="space-y-4">
                  {release.updates.map((update, i) => (
                    <li key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 text-slate-300">
                      <span className={`shrink-0 inline-flex items-center justify-center border text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider w-fit sm:mt-0.5 ${BADGE_COLORS[update.type] || 'bg-white/5 text-slate-400 border-white/10'}`}>
                        {update.type}
                      </span>
                      <span className="leading-relaxed">
                        {update.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </StaticPageLayout>
  );
}
