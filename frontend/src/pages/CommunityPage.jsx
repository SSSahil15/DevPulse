import React from 'react';
import { MessageSquare, GitPullRequest, Map, Bug, Users, ArrowRight, Heart, Star, Activity, Terminal } from 'lucide-react';
import { GithubIcon } from '../components/icons';
import StaticPageLayout from '../components/StaticPageLayout';

const STATS = [
  { label: "Active Members", value: "12,400+", icon: Users, color: "text-blue-400" },
  { label: "GitHub Stars", value: "4.8k", icon: Star, color: "text-emerald-400" },
  { label: "Pull Requests", value: "850+", icon: GitPullRequest, color: "text-purple-400" },
  { label: "Discussions", value: "2.1k", icon: MessageSquare, color: "text-orange-400" }
];

const LEADERBOARD = [
  { name: "Sarah Chen", role: "Security Researcher", commits: 342, avatar: "SC" },
  { name: "Alex Rivera", role: "DevOps Engineer", commits: 128, avatar: "AR" },
  { name: "David Kim", role: "Backend Dev", commits: 95, avatar: "DK" },
  { name: "Maya Patel", role: "Frontend Lead", commits: 82, avatar: "MP" },
];

const DISCUSSIONS = [
  { title: "Proposal: Native Kubernetes Operator for DevPulse", author: "Alex Rivera", comments: 45, type: "Feature Request" },
  { title: "RFC: Expanding AI remediation to Go syntax", author: "Sarah Chen", comments: 32, type: "Architecture" },
  { title: "How to configure custom webhook payloads?", author: "James Wilson", comments: 12, type: "Q&A" },
];

const ROADMAP = [
  { title: "AI-Powered Dependency Auto-Updates", status: "In Progress", votes: 432 },
  { title: "Native GitLab CI Integration", status: "Planned", votes: 385 },
  { title: "Custom Remediation Scripts", status: "Under Review", votes: 215 },
];

export default function CommunityPage() {
  return (
    <StaticPageLayout>
      <div className="bg-[#080b14] min-h-screen text-slate-300 font-sans pb-24">
        
        {/* Hero Section */}
        <div className="relative pt-24 pb-20">
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-semibold mb-8">
              <Heart className="w-4 h-4" /> Open Source & Community-Driven
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6">
              Build the future of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">AI-powered DevSecOps</span> together.
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join thousands of developers, security researchers, and DevOps engineers shaping the next generation of CI/CD pipeline intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                <MessageSquare className="w-5 h-5" /> Join Discord
              </button>
              <a href="https://github.com/SSSahil15/repo-for-testing" target="_blank" rel="noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-[#0d1117] hover:bg-white/5 text-white rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2">
                <GithubIcon className="w-5 h-5" /> GitHub Discussions
              </a>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-[#0d1117] border border-white/10 rounded-2xl p-8 text-center hover:bg-white/5 transition-colors shadow-lg">
                <div className="flex justify-center mb-4">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-xs md:text-sm font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content & Sidebar */}
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-10 mb-24">
          
          {/* Main Content Area */}
          <div className="w-full lg:w-2/3 space-y-10">
            
            {/* Active Discussions */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-10 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <GithubIcon className="w-6 h-6 text-slate-400" /> Top Discussions
                </h2>
                <a href="#" className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="space-y-4">
                {DISCUSSIONS.map((disc, i) => (
                  <div key={i} className="p-5 bg-[#121822] border border-white/5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="mb-3">
                          <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {disc.type}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                          {disc.title}
                        </h3>
                        <div className="text-sm text-slate-400 mt-2">
                          Started by <span className="text-slate-300">{disc.author}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm font-medium bg-black/20 px-3 py-1.5 rounded-lg shrink-0">
                        <MessageSquare className="w-4 h-4" /> {disc.comments}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Requests & Issue Reporting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#0d1117] to-blue-900/20 border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/40 transition-colors cursor-pointer">
                <Terminal className="w-8 h-8 text-blue-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">Request a Feature</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Have an idea to make DevPulse better? Submit a feature request and gather community votes.
                </p>
                <div className="text-blue-400 text-sm font-bold flex items-center gap-1">
                  Submit Proposal <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#0d1117] to-red-900/20 border border-red-500/20 rounded-2xl p-8 hover:border-red-500/40 transition-colors cursor-pointer">
                <Bug className="w-8 h-8 text-red-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">Report an Issue</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Found a bug or security vulnerability? Report it directly to our maintainers to get it fixed.
                </p>
                <div className="text-red-400 text-sm font-bold flex items-center gap-1">
                  Open Issue <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-1/3 space-y-10">
            
            {/* Roadmap */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Map className="w-5 h-5 text-emerald-400" /> Public Roadmap
              </h2>
              <div className="space-y-4">
                {ROADMAP.map((item, i) => (
                  <div key={i} className="p-4 bg-[#121822] border border-white/5 rounded-xl">
                    <h4 className="text-sm font-bold text-white mb-4 leading-snug">{item.title}</h4>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={`px-2.5 py-1 rounded uppercase tracking-wider ${
                        item.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-400' : 
                        item.status === 'Under Review' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 -rotate-90" /> {item.votes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 bg-[#121822] hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors">
                View Full Roadmap
              </button>
            </div>

            {/* Top Contributors */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Activity className="w-5 h-5 text-purple-400" /> Top Contributors
              </h2>
              <div className="space-y-5">
                {LEADERBOARD.map((user, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#121822] border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {user.name} 
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{user.role}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400">{user.commits}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Commits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* CTA Footer */}
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="p-10 md:p-16 rounded-[2rem] bg-gradient-to-br from-[#0d1117] via-blue-900/20 to-purple-900/20 border border-blue-500/20 relative overflow-hidden shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 relative z-10">Ready to contribute?</h2>
            <p className="text-lg text-slate-400 mb-10 relative z-10 max-w-2xl mx-auto leading-relaxed">
              Check out our contributor guidelines and pick up your first "good first issue". We can't wait to see what you build.
            </p>
            <button className="relative z-10 px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-colors shadow-xl text-lg">
              Read Contributor Guidelines
            </button>
          </div>
        </div>

      </div>
    </StaticPageLayout>
  );
}
