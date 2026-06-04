import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  CheckCircle2,
  ShieldAlert,
  UserCircle,
  AlertTriangle,
  Lightbulb,
  XOctagon,
  Terminal,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { GithubIcon } from '../components/icons';
import StaticPageLayout from '../components/StaticPageLayout';

// ─── Legal Contact Modal ───────────────────────────────────────────────────────
const LEGAL_CATEGORIES = [
  'Terms Clarification',
  'Account Termination',
  'DMCA / IP Dispute',
  'Data & Privacy Request',
  'API Usage Dispute',
  'Other Legal Matter',
];

async function sendLegalEmbed(embed) {
  const res = await fetch('/api/legal-contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(embed),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
}

function LegalContactModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'Terms Clarification',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await sendLegalEmbed({
        title: `⚖️ Legal Enquiry: ${form.subject}`,
        color: 0x6366f1,
        fields: [
          {
            name: '👤 Name',
            value: `${form.name} (${form.email})`,
            inline: true,
          },
          { name: '📂 Category', value: form.category, inline: true },
          { name: '📝 Message', value: form.message, inline: false },
        ],
        footer: { text: 'DevPulse · Legal & Support Enquiry' },
        timestamp: new Date().toISOString(),
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-6 md:p-8">
            {status === 'success' ? (
              /* ── Success ── */
              <div className="flex flex-col items-center text-center py-8 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <CheckCircle className="w-10 h-10 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Enquiry Submitted!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                    Your legal enquiry has been received. Our team will review it and get back to
                    you at the email you provided.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                      <Scale className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        Contact Legal Support
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Questions or concerns about our Terms of Service.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors ml-2 shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@example.com"
                      className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all appearance-none cursor-pointer"
                  >
                    {LEGAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#121822]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Brief subject of your enquiry"
                    className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Please describe your legal question or concern in detail..."
                    className="w-full bg-[#121822] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all resize-none"
                  />
                </div>

                {/* Error */}
                {status === 'error' && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    'Submit Enquiry'
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TermsOfServicePage = () => {
  const lastUpdated = 'May 26, 2026';
  const [activeSection, setActiveSection] = useState('');
  const [showLegalModal, setShowLegalModal] = useState(false);

  const sections = [
    {
      id: 'acceptable-use',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      title: '1. Acceptable Usage',
      content: (
        <p className="text-slate-300 leading-relaxed">
          You agree not to misuse the DevPulse platform or help anyone else do so. You may not use
          DevPulse to: probe, scan, or test the vulnerability of any system without authorization;
          breach or otherwise circumvent any security measures; access, tamper with, or use
          non-public areas of the platform; or interfere with or disrupt any user, host, or network.
        </p>
      ),
    },
    {
      id: 'ai-disclaimer',
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      title: '2. AI-Generated Recommendations',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            DevPulse utilizes artificial intelligence to analyze your deployment pipelines and
            generate remediation code. These AI-generated recommendations are provided "AS IS".
          </p>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm leading-relaxed">
            <strong>Disclaimer:</strong> You are solely responsible for reviewing, testing, and
            verifying any AI-generated code, patches, or Pull Requests before merging or deploying
            them into your production environment. DevPulse is not liable for outages, data loss, or
            security incidents resulting from unverified AI actions.
          </div>
        </div>
      ),
    },
    {
      id: 'github-integration',
      icon: <GithubIcon className="w-5 h-5 text-slate-300" />,
      title: '3. GitHub Integration Terms',
      content: (
        <p className="text-slate-300 leading-relaxed">
          Our service requires integration with your GitHub account. By authorizing DevPulse, you
          grant us the specific permissions requested during the OAuth flow. You are responsible for
          maintaining the security of your GitHub account and reviewing the granted permissions. We
          do not claim ownership over any code or metadata accessed via this integration.
        </p>
      ),
    },
    {
      id: 'account-responsibilities',
      icon: <UserCircle className="w-5 h-5 text-blue-400" />,
      title: '4. Account Responsibilities',
      content: (
        <p className="text-slate-300 leading-relaxed">
          You are responsible for safeguarding your DevPulse account and the API keys you generate.
          You must ensure that the email address associated with your account remains valid. You
          must immediately notify us of any unauthorized use of your account or any other breach of
          security.
        </p>
      ),
    },
    {
      id: 'api-usage',
      icon: <Terminal className="w-5 h-5 text-purple-400" />,
      title: '5. API Usage Terms',
      content: (
        <p className="text-slate-300 leading-relaxed">
          We provide an API for interacting with DevPulse programmatically. You may not use the API
          in a manner that exceeds reasonable request volumes or constitutes excessive or abusive
          usage. We reserve the right to rate-limit or suspend API access if we determine your usage
          degrades the performance of the platform for others.
        </p>
      ),
    },
    {
      id: 'intellectual-property',
      icon: <Scale className="w-5 h-5 text-indigo-400" />,
      title: '6. Intellectual Property',
      content: (
        <p className="text-slate-300 leading-relaxed">
          The DevPulse platform, its original content, features, and functionality are owned by
          DevPulse and are protected by international copyright, trademark, patent, trade secret,
          and other intellectual property laws. You may not copy, modify, create derivative works
          of, publicly display, publicly perform, republish, or transmit any of the material on our
          platform without our prior written consent.
        </p>
      ),
    },
    {
      id: 'limitation-liability',
      icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
      title: '7. Limitation of Liability',
      content: (
        <p className="text-slate-300 leading-relaxed">
          To the maximum extent permitted by applicable law, DevPulse and its affiliates shall not
          be liable for any indirect, incidental, special, consequential, or punitive damages, or
          any loss of profits or revenues, whether incurred directly or indirectly, or any loss of
          data, use, goodwill, or other intangible losses resulting from your use of the platform.
        </p>
      ),
    },
    {
      id: 'termination',
      icon: <XOctagon className="w-5 h-5 text-red-400" />,
      title: '8. Termination Policy',
      content: (
        <p className="text-slate-300 leading-relaxed">
          We may terminate or suspend your account and bar access to the platform immediately,
          without prior notice or liability, under our sole discretion, for any reason whatsoever
          and without limitation, including but not limited to a breach of these Terms. Upon
          termination, your right to use the platform will immediately cease.
        </p>
      ),
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => document.getElementById(s.id));
      const currentScrollPos = window.scrollY + 200;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= currentScrollPos) {
          setActiveSection(sections[i].id);
          return;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  return (
    <StaticPageLayout>
      {/* Legal Contact Modal */}
      {showLegalModal && <LegalContactModal onClose={() => setShowLegalModal(false)} />}

      <div className="relative min-h-screen bg-[#080b14]">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 flex flex-col lg:flex-row gap-12 items-start">
          {/* Sidebar Navigation (Sticky) */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-32">
            <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">
                Navigation
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeSection === section.id
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    {section.icon}
                    {section.title}
                  </a>
                ))}
              </nav>

              {/* Quick action in sidebar */}
              <div className="mt-6 pt-6 border-t border-white/8">
                <button
                  onClick={() => setShowLegalModal(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-semibold"
                >
                  <Scale className="w-4 h-4 shrink-0" />
                  Contact Legal Support
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            <div className="mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium mb-6">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  Legal Agreement
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-6">
                  Terms of Service
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl">
                  Please read these Terms of Service carefully before using the DevPulse platform.
                  These terms govern your access to and use of our services.
                </p>
                <p className="text-sm text-slate-500 mt-4 font-mono">Last Updated: {lastUpdated}</p>
              </motion.div>
            </div>

            <div className="space-y-12">
              {sections.map((section) => (
                <motion.section
                  id={section.id}
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-colors scroll-mt-32"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/5 rounded-xl shadow-inner border border-white/5">
                      {section.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  </div>
                  <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
                    {section.content}
                  </div>
                </motion.section>
              ))}

              {/* Support CTA */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mt-12 bg-gradient-to-br from-indigo-900/30 to-blue-900/30 backdrop-blur-sm border border-indigo-500/20 rounded-3xl p-8 md:p-10 text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-indigo-500/20 rounded-full">
                    <ShieldAlert className="w-8 h-8 text-indigo-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Questions about our Terms?</h2>
                <p className="text-indigo-200/80 mb-8 max-w-xl mx-auto">
                  If you have any questions or concerns regarding these terms, our support team is
                  available to help clarify our policies.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => setShowLegalModal(true)}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-indigo-950 font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                  >
                    <Scale className="w-4 h-4" />
                    Contact Legal Support
                  </button>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-950/50 text-white font-bold border border-indigo-500/30 hover:bg-indigo-900/50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    General Contact
                  </a>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
};

export default TermsOfServicePage;
