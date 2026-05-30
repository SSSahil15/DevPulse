import React, { useState, useEffect } from 'react';
import SidebarPageLayout from '../components/SidebarPageLayout';
import {
  Search,
  ArrowRight,
  Clock,
  User,
  Tag,
  TrendingUp,
  Calendar,
  ChevronRight,
  Flame,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '../components/icons';
import { codeToHtml } from 'shiki';

const CATEGORIES = ['Engineering', 'DevSecOps', 'AI & ML', 'Product', 'Observability'];

const BLOG_POSTS = [
  {
    id: 1,
    title: 'Building AI-powered deployment intelligence',
    excerpt:
      'How we trained our core risk engine to understand context-aware vulnerabilities before they hit production, reducing false positives by 85%.',
    category: 'AI & ML',
    tags: ['Machine Learning', 'Deployment', 'Risk'],
    author: {
      name: 'Sarah Chen',
      role: 'Head of AI Research',
      avatar: 'SC',
      specialty: 'AI & Threat Intel',
      socialLinks: { github: '#', twitter: '#' },
    },
    date: 'May 26, 2026',
    updatedDate: 'Updated 1 day ago',
    readTime: '8 min read',
    featured: true,
    imageGradient: 'from-purple-600 to-blue-600',
    body: [
      {
        type: 'paragraph',
        content:
          "Traditional static analysis is dead. When we set out to build the next generation of DevPulse, we knew that pattern matching wouldn't cut it anymore.",
      },
      { type: 'heading', id: 'the-problem', content: 'The False Positive Problem' },
      {
        type: 'paragraph',
        content:
          'Engineers suffer from alert fatigue. If a tool flags 100 vulnerabilities and 99 are false positives, the tool gets ignored. We needed a model that understands code flow, business logic, and deployment context.',
      },
      {
        type: 'code',
        language: 'python',
        code: `def analyze_deployment_risk(commit_hash):
    context = get_ast_context(commit_hash)
    model = DevPulseRiskEngine.load('v2-latest')
    
    # The magic happens here
    risk_score = model.predict(context.graph)
    return risk_score > THRESHOLD`,
      },
      {
        type: 'paragraph',
        content:
          'By utilizing AST parsing combined with our custom Graph Neural Network, we saw an 85% drop in false positives during our beta testing phase.',
      },
      { type: 'heading', id: 'next-steps', content: 'Next Steps for the AI Engine' },
      {
        type: 'paragraph',
        content:
          'We are currently training our V3 model on over 50 million open source commits to better understand edge-case vulnerabilities in Rust and Go.',
      },
    ],
  },
  {
    id: 2,
    title: 'Preventing CI/CD failures with machine learning',
    excerpt:
      'A deep dive into predictive pipeline analysis. Learn how we catch build failures and integration bugs before developers even push their code.',
    category: 'Engineering',
    tags: ['CI/CD', 'Infrastructure', 'ML'],
    author: {
      name: 'Alex Rivera',
      role: 'DevOps Lead',
      avatar: 'AR',
      specialty: 'Pipeline Architecture',
      socialLinks: { github: '#', linkedin: '#' },
    },
    date: 'May 22, 2026',
    updatedDate: 'Updated 4 days ago',
    readTime: '6 min read',
    featured: false,
    imageGradient: 'from-emerald-500 to-teal-700',
    body: [
      {
        type: 'paragraph',
        content:
          "Pipelines should be fast and reliable. Yet, we've all experienced the pain of a 45-minute build failing at the very last integration test.",
      },
      { type: 'heading', id: 'predictive-analysis', content: 'Predictive Analysis' },
      {
        type: 'paragraph',
        content:
          'We implemented a lightweight ML model that analyzes the git diff locally and predicts the probability of a pipeline failure before the commit is pushed.',
      },
      {
        type: 'code',
        language: 'bash',
        code: `$ devpulse check --predict

[!] High probability of failure in integration-test-suite.
Reason: Changes detected in auth middleware without corresponding updates to mock payloads.`,
      },
    ],
  },
];

const TRENDING_POSTS = [BLOG_POSTS[0], BLOG_POSTS[1]];

// --- Shiki Syntax Highlighter ---
const ShikiHighlighter = ({ code, language = 'bash' }) => {
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function highlight() {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language,
          theme: 'tokyo-night',
        });
        setHtml(highlighted);
      } catch (err) {
        console.error('Shiki highlighting failed:', err);
        setHtml(`<pre><code>${code}</code></pre>`);
      }
    }
    highlight();
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden border border-white/10 bg-[#1a1b26] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="text-xs font-mono text-slate-500">{language}</div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div
        className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed shiki-container"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// --- Table of Contents ---
const TableOfContents = ({ body }) => {
  const headings = body.filter((block) => block.type === 'heading');

  if (headings.length === 0) return null;

  return (
    <div className="bg-[#080b14] border border-white/10 rounded-xl p-5 shadow-xl mb-6">
      <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" /> On This Page
      </div>
      <nav className="space-y-2">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(heading.id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="block text-sm text-slate-400 hover:text-blue-400 transition-colors border-l-2 border-transparent hover:border-blue-500 pl-3 py-1"
          >
            {heading.content}
          </a>
        ))}
      </nav>
    </div>
  );
};

// --- Author Profile Card ---
const AuthorProfileCard = ({ author }) => (
  <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5 shadow-xl">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-lg font-bold text-white border-2 border-[#0d1117] shadow-lg">
        {author.avatar}
      </div>
      <div>
        <div className="text-white font-bold">{author.name}</div>
        <div className="text-blue-400 text-xs font-medium">{author.role}</div>
      </div>
    </div>
    <div className="text-sm text-slate-400 mb-4">
      Specialty: <span className="text-slate-300">{author.specialty}</span>
    </div>
    <div className="flex items-center gap-3">
      {author.socialLinks?.github && (
        <a
          href={author.socialLinks.github}
          className="p-2 bg-white/5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <GithubIcon className="w-4 h-4" />
        </a>
      )}
      {author.socialLinks?.twitter && (
        <a
          href={author.socialLinks.twitter}
          className="p-2 bg-white/5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <TwitterIcon className="w-4 h-4" />
        </a>
      )}
      {author.socialLinks?.linkedin && (
        <a
          href={author.socialLinks.linkedin}
          className="p-2 bg-white/5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <LinkedinIcon className="w-4 h-4" />
        </a>
      )}
    </div>
  </div>
);

// --- Article Modal ---
const ArticleModal = ({ post, onClose }) => {
  if (!post) return null;

  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.id !== post.id,
  ).slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-full bg-[#080b14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs font-bold uppercase tracking-wider">
              {post.category}
            </span>
            <span className="text-slate-400 text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {post.readTime}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10">
            {/* Main Article */}
            <div className="lg:col-span-8">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                {post.title}
              </h1>
              <p className="text-xl text-slate-400 mb-10 leading-relaxed">{post.excerpt}</p>

              <div className="prose prose-invert prose-blue max-w-none">
                {post.body &&
                  post.body.map((block, idx) => {
                    switch (block.type) {
                      case 'paragraph':
                        return (
                          <p key={idx} className="text-slate-300 text-lg leading-relaxed mb-6">
                            {block.content}
                          </p>
                        );
                      case 'heading':
                        return (
                          <h2
                            key={idx}
                            id={block.id}
                            className="text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24"
                          >
                            {block.content}
                          </h2>
                        );
                      case 'code':
                        return (
                          <ShikiHighlighter key={idx} code={block.code} language={block.language} />
                        );
                      default:
                        return null;
                    }
                  })}
              </div>

              {/* Related Articles inside the content column footer */}
              {relatedPosts.length > 0 && (
                <div className="mt-16 pt-10 border-t border-white/10">
                  <h3 className="text-xl font-bold text-white mb-6">Related Articles</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {relatedPosts.map((rp) => (
                      <div
                        key={rp.id}
                        className="bg-[#0d1117] border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-colors"
                      >
                        <div className="text-xs text-blue-400 font-bold mb-2">{rp.category}</div>
                        <h4 className="text-white font-semibold mb-2">{rp.title}</h4>
                        <div className="text-slate-500 text-xs">{rp.readTime}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar in Modal */}
            <div className="lg:col-span-4 space-y-6">
              <AuthorProfileCard author={post.author} />
              {post.body && <TableOfContents body={post.body} />}
              <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5 text-center">
                <div className="text-slate-400 text-sm">
                  {post.updatedDate || `Published ${post.date}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState(null);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = BLOG_POSTS.filter((p) => p.category === cat).length;
    return acc;
  }, {});
  const featuredPost = BLOG_POSTS.find((p) => p.featured);
  const regularPosts = BLOG_POSTS.filter(
    (p) =>
      !p.featured &&
      (activeCategory === 'All' || p.category === activeCategory) &&
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))),
  );

  const customLeftSidebar = (
    <div className="space-y-6">
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/8">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Categories
          </h4>
        </div>
        <div className="p-2">
          <button
            onClick={() => setActiveCategory('All')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors font-medium ${activeCategory === 'All' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <span>All Articles</span>
            <span className="text-xs bg-white/5 px-2 py-0.5 rounded-md text-slate-500">
              {BLOG_POSTS.length}
            </span>
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors font-medium ${activeCategory === category ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-2">
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${activeCategory === category ? 'opacity-100 rotate-90' : 'opacity-0'}`}
                />
                {category}
              </span>
              <span className="text-xs bg-white/5 px-2 py-0.5 rounded-md text-slate-500">
                {categoryCounts[category]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const customRightSidebar = (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-xl"
        />
      </div>

      {/* Trending */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Trending</h4>
        </div>
        <div className="divide-y divide-white/5">
          {TRENDING_POSTS.map((post, idx) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="w-full text-left px-5 py-4 flex gap-4 items-start hover:bg-white/[0.03] transition-colors group"
            >
              <div className="text-2xl font-black text-white/8 group-hover:text-white/15 transition-colors shrink-0 leading-none pt-0.5">
                0{idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug mb-1.5 line-clamp-2">
                  {post.title}
                </h5>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-3 h-3" /> {post.readTime}
                  <span>·</span>
                  <span className="text-emerald-500/70">{post.category}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <SidebarPageLayout
      title="Blog"
      customLeftSidebar={customLeftSidebar}
      customRightSidebar={customRightSidebar}
    >
      <div className="text-slate-300 font-sans pb-24">
        {/* Header Section */}
        <div className="relative pt-24 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              DevPulse{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Engineering
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Deep dives into AI, distributed systems, DevSecOps, and the architecture powering the
              next generation of CI/CD.
            </p>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto">
          {/* Main Content Area */}
          <div className="space-y-12">
            {/* Featured Article */}
            {activeCategory === 'All' && !searchQuery && featuredPost && (
              <div
                className="group cursor-pointer animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
                onClick={() => setSelectedPost(featuredPost)}
              >
                <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[2/1] bg-slate-800">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${featuredPost.imageGradient} opacity-40 group-hover:opacity-50 transition-opacity duration-500`}
                  />
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
                      <div className="text-white font-medium text-sm">
                        {featuredPost.author.name}
                      </div>
                      <div className="text-slate-500 text-xs">{featuredPost.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                    Read article{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}

            {/* Post Feed */}
            <div className="space-y-10">
              <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">
                Latest Articles
              </h3>

              {regularPosts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No articles found matching your criteria.
                </div>
              ) : (
                regularPosts.map((post, idx) => (
                  <article
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="group cursor-pointer grid grid-cols-1 md:grid-cols-4 gap-6 items-center animate-in fade-in slide-in-from-bottom-8 duration-700"
                    style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                  >
                    <div
                      className={`md:col-span-1 aspect-square md:aspect-[4/3] rounded-xl bg-gradient-to-br ${post.imageGradient} opacity-60 group-hover:opacity-80 transition-opacity duration-300 relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-3 text-xs mb-3 font-medium">
                        <span className="text-emerald-400 uppercase tracking-wider">
                          {post.category}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-300 flex items-center gap-1"
                            >
                              <Tag className="w-3 h-3 text-slate-500" /> {tag}
                            </span>
                          ))}
                        </div>
                        <div
                          className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0"
                          title={post.author.name}
                        >
                          {post.author.avatar}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <ArticleModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </SidebarPageLayout>
  );
}
