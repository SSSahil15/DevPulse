import { useEffect, useState, useMemo } from "react";
import {
  Zap, ShieldAlert, Activity, History,
  AlertCircle, CheckCircle2, AlertTriangle, Lightbulb,
  Loader2, GitBranch, Server, Box, TestTube,
  Star, GitFork, Clock, ExternalLink, Link2, Check
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import MetricCard from "./MetricCard";
import AICopilot from "./AICopilot";
import { apiRequest } from "../api";

function getRiskTone(score) {
  if (score >= 80) return "success";
  if (score >= 55) return "warning";
  if (score >= 30) return "danger";
  return "danger";
}

function getToneFromScoreObj(status) {
  if (status === "SAFE") return "success";
  if (status === "WARNING") return "warning";
  if (status === "RISKY") return "danger";
  if (status === "CRITICAL") return "danger";
  return "neutral";
}

function AnalysisPanel({ analysisState, analysisResult, onAnalyze, repository, accessToken }) {
  const [pipelineData, setPipelineData] = useState(null);
  const [pipelineHistory, setPipelineHistory] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [shareState, setShareState] = useState("idle"); // idle | loading | copied | error

  const fetchPipelineData = async () => {
    if (!repository) return;
    try {
      const repoParam = encodeURIComponent(repository.fullName);
      const [scoreData, historyData] = await Promise.all([
        apiRequest(`/api/pipeline/score/${repoParam}`, { accessToken }).catch(() => null),
        apiRequest(`/api/pipeline/score/${repoParam}/history?limit=10`, { accessToken }).catch(() => ({ history: [] }))
      ]);
      setPipelineData(scoreData);
      setPipelineHistory(historyData?.history || []);
    } catch {}
  };

  useEffect(() => {
    setPipelineData(null);
    setPipelineHistory([]);
    fetchPipelineData();
    const id = setInterval(fetchPipelineData, 10000);
    return () => clearInterval(id);
  }, [repository, accessToken]);

  const handleSimulate = async () => {
    if (!repository) return;
    setIsSimulating(true);
    try {
      await apiRequest(`/api/pipeline/simulate`, {
        method: "POST",
        accessToken,
        body: JSON.stringify({ repositoryFullName: repository.fullName })
      });
      await fetchPipelineData();
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const chartData = useMemo(() => {
    if (!pipelineHistory) return [];
    return [...pipelineHistory].reverse().map(run => ({
      time: new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: run.score || 0,
      runId: String(run.runId).slice(0, 8)
    }));
  }, [pipelineHistory]);

  const chartTrend = useMemo(() => {
    if (chartData.length < 2) return "flat";
    const last = chartData[chartData.length - 1].score;
    const prev = chartData[chartData.length - 2].score;
    return last > prev ? "up" : last < prev ? "down" : "flat";
  }, [chartData]);

  const strokeColor = chartTrend === "up" ? "#10b981" : chartTrend === "down" ? "#ef4444" : "#3b82f6";

  if (!repository) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-32">
        <div className="w-20 h-20 bg-white/[0.03] ring-1 ring-white/10 rounded-3xl flex items-center justify-center mb-6">
          <GitBranch className="w-9 h-9 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No repository selected</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
          Pick a repository from the sidebar to run a full AI analysis and view CI/CD pipeline results.
        </p>
      </div>
    );
  }

  const analysis = analysisResult?.analysis;
  
  // Pipeline metrics
  const devpulseScore = pipelineData?.devpulseScore?.score ?? "--";
  const scoreStatus = pipelineData?.devpulseScore?.status ?? "N/A";
  const trend = pipelineData?.trend;
  const pipelineVulns = pipelineData ? (pipelineData.stages?.security?.critical + pipelineData.stages?.security?.high + pipelineData.stages?.security?.medium) : "--";

  // AI Analyzer metrics
  const failureProb = analysis?.failurePrediction ? `${Math.round(analysis.failurePrediction.probability)}%` : "--";



  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">DevPulse Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-white tracking-tight">{repository.fullName}</h2>
            <a 
              href={repository.htmlUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors ring-1 ring-white/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in GitHub
            </a>
          </div>
          <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
            {repository.description || "Real-time CI/CD pipeline intelligence & AI Repository Analysis."}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Star className="w-3.5 h-3.5 text-amber-400" /> {repository.stargazersCount} Stars
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <GitFork className="w-3.5 h-3.5 text-blue-400" /> {repository.forksCount} Forks
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Updated {new Date(repository.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Share Report Button */}
          {pipelineData && (
            <button
              onClick={async () => {
                if (shareState === "loading" || shareState === "copied") return;
                setShareState("loading");
                try {
                  const res = await apiRequest("/api/reports", {
                    method: "POST",
                    accessToken,
                    body: JSON.stringify({
                      repository: repository.fullName,
                      repoMeta: {
                        description: repository.description,
                        language: repository.language,
                        stargazersCount: repository.stargazersCount,
                        forksCount: repository.forksCount,
                        defaultBranch: repository.defaultBranch,
                        htmlUrl: repository.htmlUrl,
                      }
                    })
                  });
                  window.open(res.shareUrl, "_blank");
                  setShareState("copied");
                  setTimeout(() => setShareState("idle"), 2500);
                } catch (err) {
                  console.error("Share failed", err);
                  setShareState("error");
                  setTimeout(() => setShareState("idle"), 2500);
                }
              }}
              disabled={shareState === "loading"}
              className={`flex items-center gap-2 border font-semibold text-sm px-4 py-3 rounded-xl transition-all active:scale-95 shrink-0 ${
                shareState === "copied"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : shareState === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              {shareState === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : shareState === "copied" ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {shareState === "copied" ? "Link Copied!" : shareState === "error" ? "Failed" : "Share Report"}
            </button>
          )}

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 disabled:opacity-60 text-indigo-400 font-semibold text-sm px-5 py-3 rounded-xl transition-all active:scale-95 shrink-0"
          >
            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {isSimulating ? "Simulating..." : "Simulate CI/CD"}
          </button>
          
          <button
            onClick={() => onAnalyze(repository)}
            disabled={analysisState.status === "loading"}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 shrink-0"
          >
            {analysisState.status === "loading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Zap className="w-4 h-4 fill-white" />
            }
            {analysisState.status === "loading" ? "Analyzing Repo..." : "Analyze Repository (AI)"}
          </button>
        </div>
      </div>

      {/* Error */}
      {analysisState.status === "error" && (
        <div className="flex items-center gap-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{analysisState.error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          eyebrow="CI/CD DevPulse Score"
          value={devpulseScore}
          detail={`Score derived from pipeline tests, build quality, and security scans. Trend: ${trend > 0 ? '+' : ''}${trend || 0}`}
          tone={pipelineData ? getToneFromScoreObj(scoreStatus) : "neutral"}
        />
        <MetricCard
          eyebrow="AI Failure Probability"
          value={failureProb}
          detail="AI prediction of next pipeline run failure based on repo activity, size, and technical debt."
          tone={analysis?.failurePrediction ? getRiskTone(100 - analysis.failurePrediction.probability) : "neutral"}
        />
        <MetricCard
          eyebrow="Pipeline Vulnerabilities"
          value={pipelineVulns}
          detail="Total dependencies & image vulnerabilities from the latest CI/CD run."
          tone={pipelineVulns > 0 && pipelineVulns !== "--" ? "danger" : (pipelineData ? "success" : "neutral")}
        />
      </div>

      {/* Empty State (if neither AI nor Pipeline data exists) */}
      {!pipelineData && !analysis && (
        <div className="py-24 rounded-[28px] ring-1 ring-dashed ring-white/[0.07] flex flex-col items-center justify-center gap-4">
          <div className="animate-pulse-glow w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
            <Activity className="w-7 h-7 text-blue-400 fill-blue-400/20" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Awaiting Data</h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed mx-auto">
              Click <b>Analyze Repository (AI)</b> to generate an AI risk profile, or push a commit to trigger the CI/CD pipeline.
            </p>
          </div>
        </div>
      )}

      {/* ─── AI Repository Analysis Section ─── */}
      {analysis && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-4">AI Repository Analyzer</h3>
          <div className="grid grid-cols-2 gap-6">
            
            {/* Prediction Model Output */}
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-6 right-6 opacity-[0.04]">
                <ShieldAlert className="w-28 h-28" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">AI Decision & Rationale</p>
              <div className="flex items-center gap-3 mb-5">
                <span className={`px-5 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 ${
                  analysis.decision === "BLOCK"
                    ? "bg-red-500/15 text-red-400 ring-red-500/30"
                    : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                }`}>
                  {analysis.decision}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 ring-1 ring-white/10 px-3 py-1 rounded-lg uppercase">
                  {analysis.source}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed italic">
                "{analysis.failurePrediction?.rationale}"
              </p>
            </div>

            {/* AI Suggestions */}
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">AI Remediation</p>
              </div>
              <div className="space-y-3">
                {analysis.suggestions?.map((s, i) => (
                  <div key={i} className="flex gap-3 group">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-black shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Repo Facts */}
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Repository Facts (Analyzed Metadata)</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Branch", value: repository.defaultBranch },
                  { label: "Open Issues", value: repository.openIssuesCount },
                  { label: "Stars", value: repository.stargazersCount },
                  { label: "Forks", value: repository.forksCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl px-4 py-3">
                    <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-lg font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CI/CD Pipeline Data Section ─── */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-4">CI/CD Pipeline Intelligence</h3>
        
        {!pipelineData ? (
           <div className="py-12 rounded-2xl ring-1 ring-dashed ring-white/[0.07] flex flex-col items-center justify-center text-center">
             <Server className="w-6 h-6 text-slate-600 mb-3" />
             <p className="text-sm text-slate-400">Awaiting CI/CD Data for this repository.<br/>Push a commit to trigger the pipeline.</p>
           </div>
        ) : (
          <>
            {/* Chart Section */}
            {pipelineHistory.length > 0 && (
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">DevPulse Score Trend</p>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={30} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        name="Score"
                        stroke={strokeColor} 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: strokeColor, strokeWidth: 0 }} 
                        activeDot={{ r: 6, fill: '#fff', stroke: strokeColor, strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Pipeline Stages */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Pipeline Stages</p>
                <div className="space-y-4">
                  {[
                    { name: "Backend Tests", status: pipelineData.stages?.backend?.tests, icon: TestTube },
                    { name: "Frontend Build", status: pipelineData.stages?.frontend?.build, icon: Box },
                    { name: "Docker Build", status: pipelineData.stages?.docker?.build, icon: Server },
                  ].map(stage => (
                    <div key={stage.name} className="flex items-center justify-between p-3 bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl">
                      <div className="flex items-center gap-3">
                        <stage.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-300">{stage.name}</span>
                      </div>
                      {stage.status === "success" ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Passed</span>
                      ) : stage.status === "failure" ? (
                        <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">Failed</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-400/10 px-2 py-1 rounded">Skipped</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Pipeline Insights */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 relative overflow-hidden col-span-1">
                <div className="absolute top-6 right-6 opacity-[0.04]">
                  <Lightbulb className="w-28 h-28" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">AI Pipeline Insights</p>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  {pipelineData.insights?.explanation || "No insights generated."}
                </p>

                {pipelineData.insights?.rootCause && (
                  <div className="mb-4 bg-red-500/5 ring-1 ring-red-500/20 rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 mb-2">Root Cause</p>
                    <p className="text-xs text-slate-300">{pipelineData.insights.rootCause}</p>
                  </div>
                )}

                {pipelineData.insights?.suggestions?.length > 0 && (
                  <div className="bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 mb-3">Actionable Solutions</p>
                    <ul className="space-y-2">
                      {pipelineData.insights.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-300 leading-relaxed">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pipelineData.runUrl && (
                  <a 
                    href={pipelineData.runUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors mt-6"
                  >
                    View Pipeline Run on GitHub →
                  </a>
                )}
              </div>

              {/* Security Breakdown */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Pipeline Security Findings (Trivy Scan)</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Critical", value: pipelineData.stages?.security?.critical, color: "text-red-400" },
                    { label: "High", value: pipelineData.stages?.security?.high, color: "text-orange-400" },
                    { label: "Medium", value: pipelineData.stages?.security?.medium, color: "text-amber-400" },
                    { label: "Docker Image", value: pipelineData.stages?.docker?.imageVulnerabilities, color: "text-blue-400" }
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center bg-white/[0.04] ring-1 ring-white/5 rounded-xl p-3 gap-1 text-center">
                      <span className={`text-xl font-black ${color}`}>{value ?? 0}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed Vulnerability List */}
                {pipelineData.stages?.security?.vulnerabilities?.length > 0 && (
                  <div className="mt-6 border-t border-white/5 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Top Actionable Vulnerabilities</p>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                      {pipelineData.stages.security.vulnerabilities.map((vuln, i) => (
                        <div key={i} className="flex flex-col gap-2 p-4 bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                                vuln.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                                vuln.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                                vuln.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>
                                {vuln.severity}
                              </span>
                              <span className="font-mono font-bold text-sm text-slate-200">{vuln.id}</span>
                            </div>
                            <span className="font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">{vuln.pkgName}</span>
                          </div>
                          {vuln.title && <p className="text-slate-400 text-xs leading-relaxed">{vuln.title}</p>}
                          <div className="flex items-center gap-3 mt-1 bg-black/20 p-2 rounded-lg w-fit">
                            <span className="text-[10px] text-red-400/70 font-mono line-through">{vuln.installedVersion || "unknown"}</span>
                            <span className="text-[10px] text-slate-500">→</span>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">Fix: {vuln.fixedVersion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline History */}
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mt-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Pipeline History</p>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">Last 10 Runs</span>
              </div>
              
              {pipelineHistory.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-sm italic">
                  No history found for this repository yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {pipelineHistory.map(run => (
                    <div key={run.runId} className="flex flex-col p-3 bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl hover:ring-white/10 transition-all gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {run.status === "SAFE"
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            : run.status === "WARNING"
                            ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            : <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                          }
                          <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]" title={run.commitMessage || "No commit message"}>
                            {run.commitMessage || `Run #${String(run.runId).slice(0, 8)}`}
                          </span>
                          <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded shrink-0 ${
                            run.status === "SAFE" ? "bg-emerald-500/10 text-emerald-400" :
                            run.status === "WARNING" ? "bg-amber-500/10 text-amber-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>
                            Score: {run.score}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {run.event === "pull_request" && <span className="text-[9px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded uppercase">PR</span>}
                          <span className="text-xs font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{run.branch}</span>
                          <span className="text-[10px] font-mono text-slate-600">{new Date(run.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Copilot Floating Chat */}
            <AICopilot
              pipelineData={pipelineData}
              analysisResult={analysisResult}
              accessToken={accessToken}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default AnalysisPanel;
