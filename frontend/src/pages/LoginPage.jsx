import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, GitBranch, Shield, Zap, AlertCircle, ChevronRight, MessageSquare, CheckCircle2, Activity, LineChart, Layers } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "";

const STAT_CARDS = [
  { label: "Risk Score",           value: "72",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  { label: "Failure Probability",  value: "61%", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
  { label: "Critical CVEs",        value: "3",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
];

const FEATURES = [
  { icon: Zap,       title: "AI Risk Engine",       desc: "Predicts pipeline failures before they happen."   },
  { icon: Shield,    title: "Trivy Security",       desc: "Deep CVE scanning across your dependencies."      },
  { icon: Activity,  title: "Real-Time Sync",       desc: "Instant scan progress updates via WebSockets."    },
  { icon: Layers,    title: "Asynchronous Scans",   desc: "Heavy analysis offloaded to background workers."  },
  { icon: LineChart, title: "Deep Observability",   desc: "Full telemetry with Grafana, Loki, and OTel."     },
  { icon: GitBranch, title: "GitHub Integration",   desc: "Live CI webhook feed directly in your dashboard." },
];

function LoginPage({ sessionError }) {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isFeedbackSent, setIsFeedbackSent] = useState(false);
  const authError = searchParams.get("error");

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedbackText })
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }

    setIsFeedbackSent(true);
    setFeedbackText("");
    setTimeout(() => setIsFeedbackSent(false), 5000);
  }

  function handleLoginWithGitHub() {
    setIsLoading(true);
    // Redirect directly to the backend GitHub OAuth flow.
    window.location.href = `${BACKEND_URL}/auth/github`;
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px]" />
      </div>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
            <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" width="48" height="48" loading="eager" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">DevPulse</span>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#services" className="hover:text-white transition-colors">Our Services</a>
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
            <a href="#feedback" className="hover:text-white transition-colors">Feedback</a>
          </div>

          <span className="hidden sm:inline-block text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full font-mono">
            AI-Powered DevSecOps
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full mx-auto text-center space-y-8">

          {/* Hero Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-2xl ring-2 ring-white/10">
              <img
                src="/Logo.png"
                alt="DevPulse"
                className="w-full h-full object-cover"
                width="128"
                height="128"
                fetchpriority="high"
                loading="eager"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-[#4F46E5] text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-pulse" />
            Live Intelligence Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
            <span className="text-white">Confidence for</span>
            <br />
            <span style={{ background: "linear-gradient(90deg,#22D3EE,#3B82F6,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              every merge.
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            DevPulse connects to GitHub, scans your code for vulnerabilities, predicts failures, and turns noisy risk into a clean operational signal.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <button
              id="github-login-btn"
              onClick={handleLoginWithGitHub}
              disabled={isLoading}
              className="group relative flex items-center gap-3 font-bold text-sm px-8 py-4 rounded-2xl active:scale-95 disabled:opacity-60 text-white overflow-hidden premium-btn"
            >
              <span className="relative flex items-center gap-3">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                )}
                {isLoading ? "Redirecting to GitHub..." : "Continue with GitHub"}
                {!isLoading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
            <p className="text-xs text-slate-600">Direct GitHub OAuth · No passwords · No third-party middlemen</p>
          </div>

          {/* Errors */}
          {(authError || sessionError) && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 max-w-md mx-auto">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">
                {authError === "github_denied" ? "GitHub authorization was denied. Please try again." :
                 authError === "auth_failed" ? "Authentication failed. Please try again." :
                 sessionError || "Something went wrong. Please try again."}
              </p>
            </div>
          )}
        </div>

        {/* Stats preview */}
        <div className="relative z-10 mt-20 w-full max-w-3xl mx-auto">
          <p className="text-center text-xs text-slate-600 uppercase tracking-widest mb-6 font-semibold">What you'll see after login</p>
          <div className="grid grid-cols-3 gap-4">
            {STAT_CARDS.map(({ label, value, color, bg, border }) => (
              <div key={label} className={`${bg} ${border} border rounded-2xl p-6 text-center backdrop-blur-sm`}>
                <div className={`text-4xl font-black mb-1 ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Services */}
        <div id="services" className="relative z-10 mt-20 w-full max-w-4xl mx-auto scroll-mt-24">
          {/* h2 provides correct heading hierarchy: h1 → h2 → h3 */}
          <h2 className="sr-only">Our Services</h2>
          <p aria-hidden="true" className="text-center text-xs text-slate-600 uppercase tracking-widest mb-8 font-semibold">Our Services</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-slate-200">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About Us & Contact Us */}
        <div className="relative z-10 mt-16 mb-10 w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* About Us */}
          <div id="about" className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.03] transition-colors scroll-mt-24">
            <h2 className="font-bold text-lg mb-3 text-slate-200">About Us</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              DevPulse was engineered to solve the disconnect between CI/CD pipelines and security scanning. With our new asynchronous worker architecture and real-time WebSocket syncing, developers get instant, actionable intelligence directly inside their dashboard, turning noisy risk into a clear operational signal.
            </p>
          </div>

          {/* Contact Us */}
          <div id="contact" className="relative group bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.03] transition-colors flex flex-col justify-center scroll-mt-24 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <h2 className="relative z-10 font-bold text-lg mb-6 text-slate-200">Connect with the Creator</h2>
            
            <div className="relative z-10 flex flex-col gap-4">
              {/* Email Card */}
              <a href="mailto:ansarisahil3690@gmail.com" className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/30 hover:bg-blue-500/[0.05] transition-all group/email shadow-lg shadow-black/20">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover/email:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</div>
                  <div className="text-sm font-semibold text-slate-300 group-hover/email:text-blue-400 transition-colors">ansarisahil3690@gmail.com</div>
                </div>
              </a>

              {/* GitHub Card */}
              <a href="https://github.com/SSSahil15" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/30 hover:bg-purple-500/[0.05] transition-all group/github shadow-lg shadow-black/20">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover/github:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">GitHub Profile</div>
                  <div className="text-sm font-semibold text-slate-300 group-hover/github:text-purple-400 transition-colors">github.com/SSSahil15</div>
                </div>
              </a>

              {/* Discord Card */}
              <a href="https://discord.gg/gGaqBAVrGq" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] transition-all group/discord shadow-lg shadow-black/20">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover/discord:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.55,67.55,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.63,65.37c-5.36,0-9.83-4.9-9.83-10.94s4.39-10.94,9.83-10.94,9.88,4.9,9.83,10.94C52.46,60.47,48,65.37,42.63,65.37Zm41.9,0c-5.36,0-9.83-4.9-9.83-10.94s4.39-10.94,9.83-10.94,9.88,4.9,9.83,10.94C94.41,60.47,89.93,65.37,84.53,65.37Z"/></svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Discord Support</div>
                  <div className="text-sm font-semibold text-slate-300 group-hover/discord:text-indigo-400 transition-colors">Join our Server</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div id="feedback" className="relative z-10 mb-20 w-full max-w-4xl mx-auto scroll-mt-24">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-200">Send Feedback</h2>
                <p className="text-xs text-slate-500">We'd love to hear your thoughts on DevPulse</p>
              </div>
            </div>

            {isFeedbackSent ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-200 mb-2">Thank you!</h3>
                <p className="text-sm text-slate-400">Your feedback has been received. We appreciate your input.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="How can we improve DevPulse?"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all min-h-[120px] resize-y"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!feedbackText.trim()}
                    className="disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl active:scale-95 premium-btn"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">Built with React, Node.js, FastAPI &amp; Grafana · GitHub OAuth Direct</p>
      </footer>
    </div>
  );
}

export default LoginPage;
