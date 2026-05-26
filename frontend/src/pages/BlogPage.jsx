import React, { useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout';
import { Search, ArrowRight, Clock, User, Tag, TrendingUp, Calendar, ChevronRight } from 'lucide-react';

const CATEGORIES = ["Engineering", "DevSecOps", "AI & ML", "Product", "Observability"];

const BLOG_POSTS = [
  {
    id: 1,
    title: "Building AI-powered deployment intelligence",
    excerpt: "How we trained our core risk engine to understand context-aware vulnerabilities before they hit production, reducing false positives by 85%.",
    category: "AI & ML",
    tags: ["Machine Learning", "Deployment", "Risk"],
    author: { name: "Sarah Chen", role: "Head of AI Research", avatar: "SC" },
    date: "May 26, 2026",
    readTime: "8 min read",
    featured: true,
    imageGradient: "from-purple-600 to-blue-600"
  },
  {
    id: 2,
    title: "Preventing CI/CD failures with machine learning",
    excerpt: "A deep dive into predictive pipeline analysis. Learn how we catch build failures and integration bugs before developers even push their code.",
    category: "Engineering",
    tags: ["CI/CD", "Infrastructure", "ML"],
    author: { name: "Alex Rivera", role: "DevOps Lead", avatar: "AR" },
    date: "May 22, 2026",
    readTime: "6 min read",
    featured: false,
    imageGradient: "from-emerald-500 to-teal-700"
  },
  {
    id: 3,
    title: "Real-time DevSecOps telemetry",
    excerpt: "Why traditional polling is dead. Moving to a fully WebSocket-based architecture for instant security telemetry across thousands of microservices.",
    category: "DevSecOps",
    tags: ["WebSockets", "Security", "Scale"],
    author: { name: "David Kim", role: "Security Engineer", avatar: "DK" },
    date: "May 18, 2026",
    readTime: "12 min read",
    featured: false,
    imageGradient: "from-blue-500 to-indigo-700"
  },
  {
    id: 4,
    title: "Autonomous remediation pipelines",
    excerpt: "The architecture behind DevPulse Copilot. How we safely orchestrate AST, automatically generate patches, and run isolated verification tests.",
    category: "Engineering",
    tags: ["Copilot", "Automation", "AST"],
    author: { name: "Maya Patel", role: "Principal Architect", avatar: "MP" },
    date: "May 14, 2026",
    readTime: "10 min read",
    featured: false,
    imageGradient: "from-orange-500 to-red-600"
  },
  {
    id: 5,
    title: "Scaling observability systems",
    excerpt: "Lessons learned from processing petabytes of log data. Our migration journey from ELK to a custom ClickHouse-based analytical backend.",
    category: "Observability",
    tags: ["Data Engineering", "ClickHouse", "Scale"],
    author: { name: "James Wilson", role: "Data Engineer", avatar: "JW" },
    date: "May 10, 2026",
    readTime: "15 min read",
    featured: false,
    imageGradient: "from-pink-500 to-rose-700"
  }
];

const TRENDING_POSTS = [BLOG_POSTS[1], BLOG_POSTS[3], BLOG_POSTS[4]];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const featuredPost = BLOG_POSTS.find(p => p.featured);
  const regularPosts = BLOG_POSTS.filter(p => !p.featured && 
    (activeCategory === "All" || p.category === activeCategory) &&
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <StaticPageLayout>
      <div className="bg-[#080b14] min-h-screen text-slate-300 font-sans pb-24">
        
        {/* Header Section */}
        <div className="relative pt-24 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              DevPulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Engineering</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Deep dives into AI, distributed systems, DevSecOps, and the architecture powering the next generation of CI/CD.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Featured Article */}
            {activeCategory === "All" && !searchQuery && featuredPost && (
              <div className="group cursor-pointer animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[2/1] bg-slate-800">
                  <div className={`absolute inset-0 bg-gradient-to-br ${featuredPost.imageGradient} opacity-40 group-hover:opacity-50 transition-opacity duration-500`} />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase mb-4 border border-blue-500/30">
                      Featured
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                      {featuredPost.title}
                    </h2>
                  </div>
                </div>
                
                <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                      {featuredPost.author.avatar}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{featuredPost.author.name}</div>
                      <div className="text-slate-500 text-xs">{featuredPost.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                    Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}

            {/* Post Feed */}
            <div className="space-y-10">
              <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Latest Articles</h3>
              
              {regularPosts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No articles found matching your criteria.
                </div>
              ) : (
                regularPosts.map((post, idx) => (
                  <article key={post.id} className="group cursor-pointer grid grid-cols-1 md:grid-cols-4 gap-6 items-center animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${(idx + 3) * 100}ms`}}>
                    <div className={`md:col-span-1 aspect-square md:aspect-[4/3] rounded-xl bg-gradient-to-br ${post.imageGradient} opacity-60 group-hover:opacity-80 transition-opacity duration-300 relative overflow-hidden`}>
                       <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-3 text-xs mb-3 font-medium">
                        <span className="text-emerald-400 uppercase tracking-wider">{post.category}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-300 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-slate-500" /> {tag}
                            </span>
                          ))}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0" title={post.author.name}>
                          {post.author.avatar}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors shadow-xl"
              />
            </div>

            {/* Categories */}
            <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 shadow-xl">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Categories</h4>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveCategory("All")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${activeCategory === "All" ? "bg-blue-500/10 text-blue-400 font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  All Articles
                </button>
                {CATEGORIES.map(category => (
                  <button 
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${activeCategory === category ? "bg-blue-500/10 text-blue-400 font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  >
                    {category}
                    <ChevronRight className={`w-4 h-4 ${activeCategory === category ? "opacity-100" : "opacity-0"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                <TrendingUp className="w-4 h-4" /> Trending
              </div>
              <div className="space-y-6">
                {TRENDING_POSTS.map((post, idx) => (
                  <div key={post.id} className="group cursor-pointer flex gap-4">
                    <div className="text-3xl font-black text-white/5 group-hover:text-white/10 transition-colors">
                      0{idx + 1}
                    </div>
                    <div>
                      <h5 className="text-white font-semibold leading-tight group-hover:text-blue-400 transition-colors mb-2">
                        {post.title}
                      </h5>
                      <div className="text-xs text-slate-500">{post.readTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}
