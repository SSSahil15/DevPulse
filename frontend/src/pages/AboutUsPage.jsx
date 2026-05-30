import React from 'react';
import SidebarPageLayout from '../components/SidebarPageLayout';
import { Target, Users, Zap, Shield, Heart } from 'lucide-react';

export default function AboutUsPage() {
  const sidebarLinks = [
    { id: 'our-mission', title: 'Our Mission', icon: Target },
    { id: 'the-story', title: 'The Story', icon: Zap },
    { id: 'core-values', title: 'Core Values', icon: Heart },
    { id: 'the-team', title: 'The Team', icon: Users },
  ];

  return (
    <SidebarPageLayout title="About Us" sidebarLinks={sidebarLinks}>
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
          About DevPulse
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed">
          We're on a mission to secure the world's code by shifting security from a reactive
          afterthought to a predictive science.
        </p>
      </div>

      <div className="space-y-20">
        {/* Our Mission */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Target className="w-6 h-6" />
            </div>
            <h2 id="our-mission" className="text-3xl font-bold text-white scroll-mt-24">
              Our Mission
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              Engineering velocity and platform security have historically been at odds. If you want
              to move fast, you break things. If you want to be secure, you have to move slow.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              DevPulse was built to fundamentally break this paradigm. We believe that by utilizing
              advanced machine learning and deep static analysis, we can catch vulnerabilities
              before they are merged—without slowing down the engineering team. Our mission is to
              provide an AI-powered DevSecOps platform that empowers developers to ship faster and
              more securely.
            </p>
          </div>
        </section>

        {/* The Story */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <h2 id="the-story" className="text-3xl font-bold text-white scroll-mt-24">
              The Story
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              DevPulse was born out of frustration. As former security engineers and machine
              learning researchers, we were tired of legacy SAST and DAST tools. They relied on
              simplistic regular expressions, flooded our developers with thousands of false
              positives, and ultimately caused alert fatigue.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              Worse, when these tools did find a bug, they offered no help in fixing it. We realized
              that true "shift-left" security required understanding the code deeply—its Abstract
              Syntax Tree, its business logic, and its deployment context. We built DevPulse to be
              the intelligent copilot we always wished we had.
            </p>
          </div>
        </section>

        {/* Core Values */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
              <Heart className="w-6 h-6" />
            </div>
            <h2 id="core-values" className="text-3xl font-bold text-white scroll-mt-24">
              Core Values
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex items-start gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 shrink-0">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Developer First</h4>
                  <p className="text-sm text-slate-400">
                    Security tools should integrate seamlessly into the developer workflow, not
                    block it. We optimize for low latency and zero friction.
                  </p>
                </div>
              </div>
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shrink-0">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Zero Trust, Infinite Trust</h4>
                  <p className="text-sm text-slate-400">
                    We mandate zero trust in our systems and infrastructure, while placing infinite
                    trust in our engineering teams and community.
                  </p>
                </div>
              </div>
              <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10 flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shrink-0">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Predictive over Reactive</h4>
                  <p className="text-sm text-slate-400">
                    By the time code is in production, it's too late. We focus our ML models on
                    predicting failures and vulnerabilities during the PR phase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Team */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <h2 id="the-team" className="text-3xl font-bold text-white scroll-mt-24">
              The Team
            </h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed mb-6">
              DevPulse is built by a small, hyper-focused team of engineers, security researchers,
              and designers. We operate fully remote, united by a shared passion for DevSecOps and
              Developer Experience (DX).
            </p>
            <div className="bg-[#0d1117] p-6 rounded-xl border border-white/10">
              <p className="text-sm text-slate-400 italic text-center">
                We are actively looking for talented individuals to join our mission. Keep an eye on
                our{' '}
                <a
                  href="https://github.com/SSSahil15/DevPulse"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  GitHub
                </a>{' '}
                for open source contribution opportunities.
              </p>
            </div>
          </div>
        </section>
      </div>
    </SidebarPageLayout>
  );
}
