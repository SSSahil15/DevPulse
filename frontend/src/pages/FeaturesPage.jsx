import React from 'react';
import SidebarPageLayout from '../components/SidebarPageLayout';
import {
  Zap,
  Shield,
  GitBranch,
  Terminal as TerminalIcon,
  Sparkles,
  Box,
  Settings,
  Activity,
} from 'lucide-react';

export default function FeaturesPage() {
  const sidebarLinks = [
    { id: 'predictive-cicd', title: 'Predictive CI/CD', icon: GitBranch },
    { id: 'ai-risk-engine', title: 'AI Risk Engine', icon: Shield },
    { id: 'copilot-remediation', title: 'Autonomous Remediation', icon: Sparkles },
    { id: 'real-time-telemetry', title: 'Real-Time Telemetry', icon: Activity },
  ];

  return (
    <SidebarPageLayout title="Features" sidebarLinks={sidebarLinks}>
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
          Platform Features
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed">
          DevPulse combines state-of-the-art machine learning with deep static analysis to catch
          vulnerabilities before they reach production.
        </p>
      </div>

      <div className="space-y-20">
        {/* Predictive CI/CD */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <GitBranch className="w-6 h-6" />
            </div>
            <h2 id="predictive-cicd" className="text-3xl font-bold text-white scroll-mt-24">
              Predictive CI/CD
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Pipelines should be fast and reliable. Yet, engineers often experience the pain of a
              45-minute build failing at the very last integration test. DevPulse introduces
              predictive pipeline analysis that runs locally.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10">
                <h4 className="text-white font-bold mb-2">Local Diff Analysis</h4>
                <p className="text-sm text-slate-400">
                  We analyze your git diffs immediately and run lightweight predictive models to
                  foresee integration failures.
                </p>
              </div>
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10">
                <h4 className="text-white font-bold mb-2">Build Graph Context</h4>
                <p className="text-sm text-slate-400">
                  DevPulse understands your dependency graph to skip unnecessary tests, speeding up
                  pipelines by up to 60%.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Risk Engine */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <h2 id="ai-risk-engine" className="text-3xl font-bold text-white scroll-mt-24">
              AI-Powered Risk Engine
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Traditional static analysis is dead. When we set out to build the next generation of
              DevPulse, we knew that simple regex pattern matching wouldn't cut it anymore because
              of the astronomical rate of false positives.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              Our AI Risk Engine utilizes <strong>Abstract Syntax Tree (AST)</strong> parsing
              combined with our custom Graph Neural Network. It analyzes code flow, business logic,
              and deployment context to reduce false positives by 85%.
            </p>
          </div>
        </section>

        {/* Autonomous Remediation */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 id="copilot-remediation" className="text-3xl font-bold text-white scroll-mt-24">
              Autonomous Remediation
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Detecting a bug is only half the battle. Fixing it takes engineering hours. DevPulse
              Copilot autonomously generates patches for detected vulnerabilities and runs isolated
              verification tests to ensure the fix does not break existing functionality.
            </p>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Generates secure, context-aware code patches instantly.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Automatically opens Pull Requests with detailed explanations.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>
                  Verifies patches in an isolated, containerized environment before proposing them.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Real-Time Telemetry */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <h2 id="real-time-telemetry" className="text-3xl font-bold text-white scroll-mt-24">
              Real-Time Telemetry
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Why wait 5 minutes for your observability dashboard to update when your infrastructure
              is melting down? DevPulse uses a fully WebSocket-based architecture for instant
              security telemetry across thousands of microservices.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              Powered by a custom ClickHouse backend, our telemetry engine handles petabytes of log
              data with sub-second latency, giving you an unmatched view into your system's health
              and security posture.
            </p>
          </div>
        </section>
      </div>
    </SidebarPageLayout>
  );
}
