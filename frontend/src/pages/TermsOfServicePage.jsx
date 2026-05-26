import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale, CheckCircle2, ShieldAlert, UserCircle, AlertTriangle, Lightbulb, XOctagon, Terminal } from 'lucide-react';
import { GithubIcon } from '../components/icons';
import StaticPageLayout from '../components/StaticPageLayout';

const TermsOfServicePage = () => {
  const lastUpdated = "May 26, 2026";
  const [activeSection, setActiveSection] = useState("");

  const sections = [
    {
      id: "acceptable-use",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      title: "1. Acceptable Usage",
      content: (
        <p className="text-slate-300 leading-relaxed">
          You agree not to misuse the DevPulse platform or help anyone else do so. You may not use DevPulse to: probe, scan, or test the vulnerability of any system without authorization; breach or otherwise circumvent any security measures; access, tamper with, or use non-public areas of the platform; or interfere with or disrupt any user, host, or network.
        </p>
      )
    },
    {
      id: "ai-disclaimer",
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      title: "2. AI-Generated Recommendations",
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            DevPulse utilizes artificial intelligence to analyze your deployment pipelines and generate remediation code. These AI-generated recommendations are provided "AS IS".
          </p>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm leading-relaxed">
            <strong>Disclaimer:</strong> You are solely responsible for reviewing, testing, and verifying any AI-generated code, patches, or Pull Requests before merging or deploying them into your production environment. DevPulse is not liable for outages, data loss, or security incidents resulting from unverified AI actions.
          </div>
        </div>
      )
    },
    {
      id: "github-integration",
      icon: <GithubIcon className="w-5 h-5 text-slate-300" />,
      title: "3. GitHub Integration Terms",
      content: (
        <p className="text-slate-300 leading-relaxed">
          Our service requires integration with your GitHub account. By authorizing DevPulse, you grant us the specific permissions requested during the OAuth flow. You are responsible for maintaining the security of your GitHub account and reviewing the granted permissions. We do not claim ownership over any code or metadata accessed via this integration.
        </p>
      )
    },
    {
      id: "account-responsibilities",
      icon: <UserCircle className="w-5 h-5 text-blue-400" />,
      title: "4. Account Responsibilities",
      content: (
        <p className="text-slate-300 leading-relaxed">
          You are responsible for safeguarding your DevPulse account and the API keys you generate. You must ensure that the email address associated with your account remains valid. You must immediately notify us of any unauthorized use of your account or any other breach of security.
        </p>
      )
    },
    {
      id: "api-usage",
      icon: <Terminal className="w-5 h-5 text-purple-400" />,
      title: "5. API Usage Terms",
      content: (
        <p className="text-slate-300 leading-relaxed">
          We provide an API for interacting with DevPulse programmatically. You may not use the API in a manner that exceeds reasonable request volumes or constitutes excessive or abusive usage. We reserve the right to rate-limit or suspend API access if we determine your usage degrades the performance of the platform for others.
        </p>
      )
    },
    {
      id: "intellectual-property",
      icon: <Scale className="w-5 h-5 text-indigo-400" />,
      title: "6. Intellectual Property",
      content: (
        <p className="text-slate-300 leading-relaxed">
          The DevPulse platform, its original content, features, and functionality are owned by DevPulse and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, create derivative works of, publicly display, publicly perform, republish, or transmit any of the material on our platform without our prior written consent.
        </p>
      )
    },
    {
      id: "limitation-liability",
      icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
      title: "7. Limitation of Liability",
      content: (
        <p className="text-slate-300 leading-relaxed">
          To the maximum extent permitted by applicable law, DevPulse and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the platform.
        </p>
      )
    },
    {
      id: "termination",
      icon: <XOctagon className="w-5 h-5 text-red-400" />,
      title: "8. Termination Policy",
      content: (
        <p className="text-slate-300 leading-relaxed">
          We may terminate or suspend your account and bar access to the platform immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of these Terms. Upon termination, your right to use the platform will immediately cease.
        </p>
      )
    }
  ];

  // Handle active section tracking for the sidebar navigation
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      const currentScrollPos = window.scrollY + 200; // Offset for header

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
      <div className="relative min-h-screen bg-[#080b14]">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Sidebar Navigation (Sticky) */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-32">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Navigation</h3>
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
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
                  Terms of Service
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl">
                  Please read these Terms of Service carefully before using the DevPulse platform. These terms govern your access to and use of our services.
                </p>
                <p className="text-sm text-slate-500 mt-4 font-mono">
                  Last Updated: {lastUpdated}
                </p>
              </motion.div>
            </div>

            <div className="space-y-12">
              {sections.map((section, idx) => (
                <motion.section
                  id={section.id}
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 hover:border-slate-700 transition-colors scroll-mt-32"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-slate-800 rounded-xl shadow-inner border border-slate-700/50">
                      {section.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {section.title}
                    </h2>
                  </div>
                  <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
                    {section.content}
                  </div>
                </motion.section>
              ))}

              {/* Support Contact */}
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
                <h2 className="text-2xl font-bold text-white mb-4">
                  Questions about our Terms?
                </h2>
                <p className="text-indigo-200/80 mb-8 max-w-xl mx-auto">
                  If you have any questions or concerns regarding these terms, our support team is available to help clarify our policies.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a 
                    href="mailto:support@devpulse.com"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-indigo-950 font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                  >
                    Contact Legal Support
                  </a>
                  <a 
                    href="/contact"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-950/50 text-white font-bold border border-indigo-500/30 hover:bg-indigo-900/50 transition-colors"
                  >
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
