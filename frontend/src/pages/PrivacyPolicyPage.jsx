import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Server, RefreshCw, Mail, Database, Box, Activity } from 'lucide-react';
import { GithubIcon } from '../components/icons';
import StaticPageLayout from '../components/StaticPageLayout';

const PrivacyPolicyPage = () => {
  const lastUpdated = "May 26, 2026";

  const sections = [
    {
      id: "data-collection",
      icon: <Database className="w-6 h-6 text-indigo-400" />,
      title: "1. Data Collection & Usage",
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            At DevPulse, we believe in minimizing data collection to only what's necessary to provide our deployment intelligence services. We collect the following types of information:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><strong>Account Information:</strong> Name, email address, and profile picture provided via OAuth.</li>
            <li><strong>Usage Telemetry:</strong> Anonymized interaction data to help us improve the platform's user experience.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, and IP address for security and audit logs.</li>
          </ul>
        </div>
      )
    },
    {
      id: "github-oauth",
      icon: <GithubIcon className="w-6 h-6 text-slate-300" />,
      title: "2. GitHub OAuth & Repository Metadata",
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            Our core product relies on GitHub integrations to analyze your deployment pipelines. By authorizing DevPulse via GitHub OAuth, you grant us permission to:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Access your repository metadata (e.g., repository names, languages, commit frequencies).</li>
            <li>Read package dependencies to identify CVEs and vulnerabilities.</li>
            <li>Submit automated Pull Requests to remediate discovered vulnerabilities.</li>
          </ul>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
            <strong>Note:</strong> We do NOT clone or store your source code on our servers. All analysis is performed ephemerally or via metadata APIs.
          </div>
        </div>
      )
    },
    {
      id: "analytics",
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      title: "3. Analytics & Telemetry",
      content: (
        <p className="text-slate-300 leading-relaxed">
          We utilize strictly necessary telemetry to monitor the health, performance, and reliability of our platform. We track aggregate usage patterns (e.g., popular features, error rates) using privacy-friendly analytics tools. We do not sell or share this telemetry with external marketing agencies or ad networks.
        </p>
      )
    },
    {
      id: "cookies",
      icon: <Box className="w-6 h-6 text-amber-400" />,
      title: "4. Cookies and Local Storage",
      content: (
        <p className="text-slate-300 leading-relaxed">
          DevPulse uses minimal cookies and local storage tokens strictly for authentication and session management. By using DevPulse, you consent to the placement of these essential tokens on your device. We do not use cross-site tracking cookies.
        </p>
      )
    },
    {
      id: "data-retention",
      icon: <RefreshCw className="w-6 h-6 text-purple-400" />,
      title: "5. Data Retention",
      content: (
        <p className="text-slate-300 leading-relaxed">
          We retain your account and repository metadata as long as your account remains active. Vulnerability reports and deployment intelligence logs are stored for up to 90 days before being automatically purged. If you choose to delete your account, all associated data is permanently erased within 14 days.
        </p>
      )
    },
    {
      id: "security",
      icon: <Lock className="w-6 h-6 text-rose-400" />,
      title: "6. Security Practices",
      content: (
        <p className="text-slate-300 leading-relaxed">
          Security is at the heart of our DevSecOps platform. We employ industry-standard encryption for data at rest (AES-256) and data in transit (TLS 1.3). Our infrastructure is actively monitored, and access to production environments is strictly limited to authorized engineering personnel using zero-trust networking principles.
        </p>
      )
    },
    {
      id: "third-party",
      icon: <Server className="w-6 h-6 text-sky-400" />,
      title: "7. Third-Party Integrations",
      content: (
        <p className="text-slate-300 leading-relaxed">
          In order to provide our service, we may share minimal required data with trusted sub-processors (such as cloud hosting providers and logging services). All third-party providers are vetted for strict compliance with data privacy regulations (GDPR, CCPA).
        </p>
      )
    }
  ];

  return (
    <StaticPageLayout>
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 py-24 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                Data Protection Statement
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
                Privacy Policy
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                We are committed to protecting your privacy and being transparent about how we handle your data. Here is everything you need to know.
              </p>
              <p className="text-sm text-slate-500 mt-4 font-mono">
                Last Updated: {lastUpdated}
              </p>
            </motion.div>
          </div>

          {/* Policy Content */}
          <div className="space-y-12">
            {sections.map((section, idx) => (
              <motion.section
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 md:p-10 hover:border-slate-700 transition-colors"
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

            {/* Contact Information */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 backdrop-blur-sm border border-indigo-500/20 rounded-3xl p-8 md:p-10 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-indigo-500/20 rounded-full">
                  <Mail className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Questions or Concerns?
              </h2>
              <p className="text-indigo-200/80 mb-8 max-w-xl mx-auto">
                If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to reach out to our privacy team.
              </p>
              <a 
                href="https://discord.gg/EesqADdSFt"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-indigo-950 font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
              >
                Contact Privacy Team
              </a>
            </motion.section>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
};

export default PrivacyPolicyPage;
