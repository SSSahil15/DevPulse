import React, { useState, useEffect } from 'react';
import { Search, Menu, ArrowLeft, X, Check } from 'lucide-react';
import { GithubIcon, LinkedinIcon, DiscordIcon } from './icons';

export default function SidebarPageLayout({
  children,
  sidebarLinks,
  title,
  customLeftSidebar,
  customRightSidebar,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [pageFeedback, setPageFeedback] = useState(null); // 'yes', 'no', or null

  // Reset feedback state when page changes
  useEffect(() => {
    setPageFeedback(null);
  }, [title]);

  // Hotkeys
  useEffect(() => {
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

  // Scrollspy & headings
  useEffect(() => {
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
  }, [children]); // Re-run if children change

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
              DevPulse <span className="text-slate-500 font-normal">{title}</span>
            </span>
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="community-search"
              type="text"
              placeholder={`Search ${title?.toLowerCase() || ''} (Press '/')`}
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
            {customLeftSidebar ? (
              customLeftSidebar
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 px-3">
                  Navigation
                </div>
                {sidebarLinks &&
                  sidebarLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => scrollToHeading(link.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group text-slate-400 hover:text-white hover:bg-white/5 text-left`}
                      title={link.title}
                    >
                      <link.icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-400" />
                      <span className="truncate group-hover:whitespace-normal group-hover:break-words">
                        {link.title}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 min-w-0 flex flex-col w-full relative">
          <div className="py-10 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto w-full flex-1">
            {children}
          </div>

          {/* Feedback Widget */}
          {['Contributing', 'Security', 'Roadmap', 'Changelog', 'Blog'].includes(title) && (
            <div className="flex flex-col items-center justify-center gap-4 pb-10 mt-10 text-slate-500 text-sm border-t border-white/5 pt-10 mx-6 md:mx-12 lg:mx-16">
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
          )}

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

            <div className="px-6 md:px-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 max-w-4xl mx-auto">
              <div>&copy; {new Date().getFullYear()} DevPulse Inc. All rights reserved.</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>
          </footer>
        </main>

        {/* ── Right Sidebar (In-page TOC or Custom) ── */}
        <aside className="hidden xl:block w-64 shrink-0 pr-8 py-10 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto custom-scrollbar">
          {customRightSidebar
            ? customRightSidebar
            : headings.length > 0 && (
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
