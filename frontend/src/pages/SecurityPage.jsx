import React from 'react';
import SidebarPageLayout from '../components/SidebarPageLayout';
import { Shield, Key, Search, FileText, Lock, Users, Server, Database } from 'lucide-react';

export default function SecurityPage() {
  const sidebarLinks = [
    { id: 'zero-trust', title: 'Zero-Trust Architecture', icon: Lock },
    { id: 'secrets-scanning', title: 'Continuous Secrets Scanning', icon: Key },
    { id: 'context-aware-ast', title: 'Context-Aware Analysis', icon: Search },
    { id: 'compliance-auditing', title: 'Compliance & Auditing', icon: FileText },
  ];

  return (
    <SidebarPageLayout title="Security" sidebarLinks={sidebarLinks}>
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
          Security & Trust
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed">
          At DevPulse, we believe security should never be an afterthought. We've built our platform
          on a foundation of zero-trust, continuous auditing, and deep semantic analysis.
        </p>
      </div>

      <div className="space-y-20">
        {/* Zero-Trust Architecture */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 id="zero-trust" className="text-3xl font-bold text-white scroll-mt-24">
              Zero-Trust Architecture
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Our infrastructure operates on a strict zero-trust model. Every request, whether
              internal between microservices or external from a client, is authenticated,
              authorized, and continuously validated.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex items-start gap-4">
                <Users className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-white font-bold mb-2">Granular RBAC</h4>
                  <p className="text-sm text-slate-400">
                    Role-Based Access Control down to the repository and branch level ensures your
                    engineers only have access to what they need.
                  </p>
                </div>
              </div>
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex items-start gap-4">
                <Server className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-white font-bold mb-2">Environment Isolation</h4>
                  <p className="text-sm text-slate-400">
                    CI/CD runners and AI patch verification environments are completely
                    containerized and ephemeral, preventing lateral movement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Continuous Secrets Scanning */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-400">
              <Key className="w-6 h-6" />
            </div>
            <h2 id="secrets-scanning" className="text-3xl font-bold text-white scroll-mt-24">
              Continuous Secrets Scanning
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Hardcoded secrets are one of the leading causes of security breaches. DevPulse scans
              every commit and PR in real-time, matching over 200+ token formats (AWS, GCP, GitHub,
              Slack, etc.) using high-entropy heuristics.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              If a secret is detected, DevPulse can automatically block the push, alert the security
              team, and assist in rotating the compromised credential.
            </p>
          </div>
        </section>

        {/* Context-Aware Analysis */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Search className="w-6 h-6" />
            </div>
            <h2 id="context-aware-ast" className="text-3xl font-bold text-white scroll-mt-24">
              Context-Aware Vulnerability Detection
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              We go beyond standard SAST/DAST tools. DevPulse constructs an Abstract Syntax Tree
              (AST) of your entire application to detect complex business logic flaws that pattern
              matchers miss.
            </p>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Identifies insecure direct object references (IDOR).</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Tracks data flow from user input to database queries to detect complex injection
                  flaws.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Understands the context of the deployment environment (e.g., Kubernetes vs
                  Serverless) to score risk accurately.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Compliance & Auditing */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-slate-500/10 rounded-xl border border-slate-500/20 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h2 id="compliance-auditing" className="text-3xl font-bold text-white scroll-mt-24">
              Compliance & Auditing
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Achieving and maintaining compliance is crucial. DevPulse provides immutable audit
              logs for all security events, configuration changes, and AI-generated code patches.
            </p>
            <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Database className="w-8 h-8 text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-white font-bold flex items-center gap-2.5 flex-wrap">
                    SOC 2 & ISO 27001 Ready
                    <span className="text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      Simulated
                    </span>
                  </h4>
                  <p className="text-sm text-slate-400">
                    Generate compliance reports with a single click to satisfy auditors.
                  </p>
                </div>
              </div>
              <a
                href="/devpulse-trust-report.txt"
                download="devpulse-trust-report.txt"
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
              >
                Download Trust Report
              </a>
            </div>
            <p className="text-xs text-slate-500 italic mt-4">
              * Note: Compliance logs, audit reporting, and security certifications are simulated as
              high-fidelity features for platform demonstration and showcase purposes.
            </p>
          </div>
        </section>
      </div>
    </SidebarPageLayout>
  );
}
