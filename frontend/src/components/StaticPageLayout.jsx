import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { GithubIcon, LinkedinIcon, DiscordIcon } from './icons';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const handleLoginWithGitHub = () => {
  window.location.href = `${API_BASE}/auth/github`;
};

export default function StaticPageLayout({ children }) {
  const [pageFeedback, setPageFeedback] = useState(null); // 'yes', 'no', or null

  // Reset feedback state on pathname change
  useEffect(() => {
    setPageFeedback(null);
  }, [window.location.pathname]);
  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col font-sans text-slate-300">
      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-xl sticky top-0">
        <a
          href="/"
          className="flex items-center gap-2 cursor-pointer group shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
            <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
              <img src="/Logo.png" alt="DevPulse Logo" className="w-5 h-5 object-contain" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
            DevPulse
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
          <a href="/features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="/security" className="hover:text-white transition-colors">
            Security
          </a>
          <a href="/docs" className="hover:text-white transition-colors">
            Docs
          </a>
          <a href="/reference" className="hover:text-white transition-colors">
            API
          </a>
          <a
            href="https://github.com/SSSahil15/DevPulse"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <GithubIcon className="w-4 h-4" /> GitHub
          </a>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLoginWithGitHub}
            className="text-sm font-bold text-white hover:text-blue-400 transition-colors hidden sm:block"
          >
            Login
          </button>
          <button
            onClick={handleLoginWithGitHub}
            className="bg-white text-black text-sm font-bold px-5 py-2 rounded-lg hover:bg-slate-200 transition-colors active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full">{children}</main>

      {/* Feedback Widget */}
      {['/roadmap'].includes(window.location.pathname) && (
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 pb-10 mt-10 text-slate-500 text-sm border-t border-white/5 pt-10 max-w-5xl mx-auto px-6">
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

      {/* Footer */}
      <footer className="relative z-10 bg-[#06080d] border-t border-white/5 pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <a href="/" className="flex items-center gap-2 cursor-pointer group mb-4 inline-flex">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-[1px]">
                <div className="w-full h-full bg-[#080b14] rounded-lg flex items-center justify-center group-hover:bg-transparent transition-colors">
                  <img src="/Logo.png" alt="DevPulse Logo" className="w-5 h-5 object-contain" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">DevPulse</span>
            </a>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 pr-4">
              The AI-powered DevSecOps platform for modern engineering teams. Ship faster, securely.
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

        <div className="max-w-5xl mx-auto px-6 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>&copy; {new Date().getFullYear()} DevPulse Inc. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}
