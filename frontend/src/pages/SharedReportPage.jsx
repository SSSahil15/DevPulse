import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShieldAlert, AlertCircle, Loader2,
  Star, GitFork, CheckCircle2,
  Lightbulb, Download, Clock, User, ExternalLink,
  Activity, Lock, TrendingUp, Users, GitCommit, BarChart3
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getRiskColor(category) {
  if (category === "LOW") return { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/30" };
  if (category === "MEDIUM") return { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-500/30" };
  return { bg: "bg-red-500/15", text: "text-red-400", ring: "ring-red-500/30" };
}

function getFactorIcon(name) {
  const icons = {
    security: ShieldAlert,
    commitFrequency: GitCommit,
    contributors: Users,
    codeChurn: BarChart3,
    historicalFailureRate: TrendingUp,
    buildGates: Activity,
  };
  return icons[name] || Activity;
}

function getFactorLabel(name) {
  const labels = {
    security: "Security",
    commitFrequency: "Commit Frequency",
    contributors: "Contributors",
    codeChurn: "Code Churn",
    historicalFailureRate: "Failure Rate",
    buildGates: "Build Gates",
  };
  return labels[name] || name;
}

function SharedReportPage() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | success | expired | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${token}`);
        if (res.status === 410) {
          setStatus("expired");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setErrorMessage("Report not found or the link is invalid.");
          return;
        }
        const data = await res.json();
        setReport(data);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setErrorMessage("Failed to load report. Please try again.");
      }
    }
    fetchReport();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
        <div className="animate-pulse w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
          <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading shared report...
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Report Expired</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">
          This shared report has expired. The owner can generate a new shareable link from their DevPulse dashboard.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">{errorMessage}</p>
      </div>
    );
  }

  const score = report.devpulseScore;
  const riskColors = getRiskColor(score?.riskCategory || "HIGH");

  return (
    <>
      {/* Print-optimized styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="min-h-screen bg-[#080b14] text-white">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden no-print">
          <div className="absolute -top-60 -right-60 w-[700px] h-[700px] bg-blue-600/5 rounded-full blur-[140px]" />
          <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-indigo-700/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">DevPulse</span>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Shared Report</p>
              </div>
            </div>
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Export as PDF
              </button>
            </div>
          </div>

          {/* Repository Info */}
          <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Repository</p>
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">{report.repository}</h1>
                <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                  {report.repoMeta?.description || "No description available."}
                </p>
              </div>
              {report.repoMeta?.htmlUrl && (
                <a
                  href={report.repoMeta.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors ring-1 ring-white/10 no-print"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in GitHub
                </a>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
                <Star className="w-3.5 h-3.5 text-amber-400" /> {report.repoMeta?.stargazersCount || 0} Stars
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
                <GitFork className="w-3.5 h-3.5 text-blue-400" /> {report.repoMeta?.forksCount || 0} Forks
              </div>
              {report.repoMeta?.language && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
                  {report.repoMeta.language}
                </div>
              )}
            </div>
          </div>

          {/* Score + Risk Category */}
          <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">DevPulse Score</p>
            <div className="flex items-center gap-8">
              {/* Big score number */}
              <div className="text-center">
                <div className={`text-6xl font-black ${
                  score?.score >= 80 ? "text-emerald-400" : score?.score >= 50 ? "text-amber-400" : "text-red-400"
                }`}>
                  {score?.score ?? "--"}
                </div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">/ 100</div>
              </div>

              {/* Risk Category Badge */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 ${riskColors.bg} ${riskColors.text} ${riskColors.ring}`}>
                    {score?.riskCategory || "N/A"} RISK
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ring-1 ${
                    score?.status === "SAFE" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" :
                    score?.status === "WARNING" ? "bg-amber-500/10 text-amber-400 ring-amber-500/20" :
                    "bg-red-500/10 text-red-400 ring-red-500/20"
                  }`}>
                    {score?.status || "N/A"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {score?.riskCategory === "LOW"
                    ? "This repository is in great health. Safe to deploy with confidence."
                    : score?.riskCategory === "MEDIUM"
                    ? "Some areas need attention. Review the factor breakdown before deploying."
                    : "Critical issues detected. Do not deploy without remediation."}
                </p>
              </div>
            </div>
          </div>

          {/* Factor Breakdown */}
          {score?.factors && (
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Score Factor Breakdown</p>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(score.factors).map(([key, factor]) => {
                  const Icon = getFactorIcon(key);
                  const barColor = factor.score >= 80 ? "bg-emerald-500" : factor.score >= 50 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={key} className="bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-300">{getFactorLabel(key)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-black ${
                            factor.score >= 80 ? "text-emerald-400" : factor.score >= 50 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {factor.score}
                          </span>
                          <span className="text-[9px] text-slate-600 font-bold">×{factor.weight}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {factor.details?.[0] || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vulnerability Summary */}
          {report.stages?.security && (
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Vulnerability Summary</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Critical", value: report.stages.security.critical, color: "text-red-400" },
                  { label: "High", value: report.stages.security.high, color: "text-orange-400" },
                  { label: "Medium", value: report.stages.security.medium, color: "text-amber-400" },
                  { label: "Docker Image", value: report.stages.docker?.imageVulnerabilities, color: "text-blue-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center bg-white/[0.04] ring-1 ring-white/5 rounded-xl p-4 gap-1 text-center">
                    <span className={`text-2xl font-black ${color}`}>{value ?? 0}</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">{label}</span>
                  </div>
                ))}
              </div>

              {/* Vulnerability details */}
              {report.stages.security.vulnerabilities?.length > 0 && (
                <div className="mt-6 border-t border-white/5 pt-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Top Vulnerabilities</p>
                  <div className="space-y-2">
                    {report.stages.security.vulnerabilities.map((vuln, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                            vuln.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                            vuln.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {vuln.severity}
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-200">{vuln.id}</span>
                          <span className="font-mono text-xs text-blue-400">{vuln.pkgName}</span>
                        </div>
                        {vuln.fixedVersion && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">Fix: {vuln.fixedVersion}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Insights */}
          {report.insights && (
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
              <div className="flex items-center gap-2 mb-5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">AI Insights</p>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-5">
                {report.insights.explanation || "No insights generated."}
              </p>

              {report.insights.rootCause && (
                <div className="mb-5 bg-red-500/5 ring-1 ring-red-500/20 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 mb-2">Root Cause</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{report.insights.rootCause}</p>
                </div>
              )}

              {report.insights.suggestions?.length > 0 && (
                <div className="bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 mb-3">Recommended Actions</p>
                  <ul className="space-y-2">
                    {report.insights.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-300 leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Report Metadata Footer */}
          <div className="bg-white/[0.02] ring-1 ring-white/[0.06] rounded-2xl p-5 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Generated by <span className="text-slate-300 font-semibold">{report.createdBy}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(report.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Expires {new Date(report.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>

          {/* DevPulse branding footer */}
          <div className="text-center mt-8 mb-4">
            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
              <img src="/Logo.png" alt="DevPulse" className="w-5 h-5 object-cover rounded opacity-80" />
              Powered by DevPulse — AI-Powered DevSecOps Intelligence
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SharedReportPage;
