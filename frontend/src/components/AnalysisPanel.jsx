import { useEffect, useRef, useState } from "react";
import {
  Zap, ShieldAlert, Activity,
  AlertCircle, CheckCircle2, Lightbulb,
  Loader2, GitBranch, Server, Box, TestTube,
  Star, GitFork, Clock, ExternalLink, Link2, Check
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import MetricCard from "./MetricCard";
import AICopilot from "./AICopilot";
import ScoreGauge from "./ScoreGauge";
import VulnerabilityTable from "./VulnerabilityTable";
import InsightsPanel from "./InsightsPanel";
import ErrorBoundary from "./ErrorBoundary";
import { apiRequest, pollScanJob } from "../api";

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

function getRecordTime(record) {
  return new Date(record?.receivedAt || record?.timestamp || 0).getTime() || 0;
}

function AnalysisPanel({ analysisState, analysisResult, onAnalyze, repository, accessToken, onScanComplete, sidebarHistory = [] }) {
  // sessionData: ONLY set from the current session's scan — never auto-loaded from DB
  // On refresh/re-login this is always null until user runs a scan
  const [sessionData, setSessionData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateJobStatus, setSimulateJobStatus] = useState(null);
  const [shareState, setShareState] = useState("idle");
  const simulateRequestLockRef = useRef(false);

  // When repo changes: clear session data (force fresh scan)
  useEffect(() => {
    setSessionData(null);
  }, [repository?.fullName, accessToken]);

  const handleSimulate = async () => {
    if (!repository || simulateRequestLockRef.current) return;
    simulateRequestLockRef.current = true;
    setIsSimulating(true);
    setSimulateJobStatus("pending");
    setSessionData(null); // clear previous result — fresh scan starting
    try {
      console.log("[AnalysisPanel] Calling /api/pipeline/simulate with:", { repositoryFullName: repository.fullName });
      const response = await apiRequest("/api/pipeline/simulate", {
        method: "POST",
        accessToken,
        body: JSON.stringify({ repositoryFullName: repository.fullName })
      });
      console.log("[AnalysisPanel] Response from /simulate:", response);
      console.log("[AnalysisPanel] Response keys:", Object.keys(response || {}));
      const { jobId } = response;
      console.log("[AnalysisPanel] Extracted jobId:", jobId);


      if (!jobId) {
        // Prevent polling /status/undefined
        console.error("[AnalysisPanel] Missing jobId in /simulate response:", response);
        throw new Error(
          "Simulate failed to return jobId. Check VITE_API_URL / backend URL configuration in production."
        );
      }

      setSimulateJobStatus("processing");
      const job = await pollScanJob(jobId, accessToken);
      if (job.status === "done") {
        setSimulateJobStatus("done");
        setSessionData(job.record);   // set from job result directly (no DB re-fetch)
        onScanComplete?.();            // notify DashboardPage → refresh sidebar history
      } else {
        setSimulateJobStatus("failed");
      }
    } catch (err) {
      setSimulateJobStatus("failed");
      console.error("Simulation failed", err);
    } finally {
      setIsSimulating(false);
      simulateRequestLockRef.current = false;
      setTimeout(() => setSimulateJobStatus(null), 2000);
    }
  };

  // ─── Inline Simulate Progress Stepper ────────────────────────────────────
  const SIMULATE_STEPS = [
    { id: "clone",  label: "Cloning repository",             icon: GitBranch },
    { id: "trivy",  label: "Running Trivy security scan",     icon: ShieldAlert },
    { id: "health", label: "Fetching GitHub health metrics",  icon: Activity },
    { id: "score",  label: "Calculating DevPulse Score",      icon: CheckCircle2 },
  ];

  function SimulateProgressStepper() {
    const stepIndex = simulateJobStatus === "processing" ? 2
      : simulateJobStatus === "pending" ? 0
      : simulateJobStatus === "done" ? 4 : 0;
    return (
      <div className="flex flex-col gap-2 py-3">
        {SIMULATE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < stepIndex; const active = i === stepIndex;
          return (
            <div key={step.id} className={`flex items-center gap-3 text-xs ${
              done ? "text-emerald-400" : active ? "text-white" : "text-slate-600"
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                done ? "bg-emerald-500/20" : active ? "" : "bg-white/5"
              }`}
                style={active ? { background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 8px rgba(0,191,255,0.4)" } : {}}
              >
                {active ? <Loader2 className="w-3 h-3 animate-spin" />
                  : done ? <CheckCircle2 className="w-3 h-3" />
                  : <Icon className="w-3 h-3" />}
              </div>
              <span className={active ? "font-semibold" : ""}>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

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

  // Main metrics — only from current session's scan (null = "--" until user runs a scan)
  const devpulseScore = sessionData?.devpulseScore?.score ?? "--";
  const scoreStatus   = sessionData?.devpulseScore?.status ?? "N/A";
  const pipelineVulns = sessionData
    ? ((sessionData.stages?.security?.critical || 0) + (sessionData.stages?.security?.high || 0) + (sessionData.stages?.security?.medium || 0))
    : "--";

  const failureProb = analysis?.failurePrediction ? `${Math.round(analysis.failurePrediction.probability)}%` : "--";



  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" style={{ color: "#00BFFF" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>DevPulse Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-3xl font-black tracking-tight hover:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              {repository.fullName}
            </a>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "#00BFFF", opacity: 0.6 }} />
          </div>
          <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
            {repository.description || "Real-time CI/CD pipeline intelligence & AI Repository Analysis."}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Star className="w-3.5 h-3.5 text-amber-400" /> {repository.stargazersCount} Stars
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <GitFork className="w-3.5 h-3.5" style={{ color: "#00BFFF" }} /> {repository.forksCount} Forks
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded ring-1 ring-white/[0.05]">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Updated {new Date(repository.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Share Report Button — only visible after a scan this session */}
          {sessionData && (
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
                  : "text-white border-transparent"
              }`}
              style={shareState === "idle" ? { background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 14px rgba(0,191,255,0.25)" } : {}}
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
            className="flex items-center gap-2 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: "linear-gradient(135deg, #00BFFF 0%, #FF6A00 100%)", boxShadow: "0 0 16px rgba(0,191,255,0.25)" }}
          >
            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {isSimulating ? "Simulating..." : "Simulate CI/CD"}
          </button>

          <button
            onClick={() => onAnalyze(repository)}
            disabled={analysisState.status === "loading"}
            className="flex items-center gap-2 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: "linear-gradient(135deg, #00BFFF 0%, #FF6A00 100%)", boxShadow: "0 0 16px rgba(0,191,255,0.25)" }}
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
          detail="Score from the latest CI/CD scan this session. Run Simulate CI/CD to get a fresh score."
          tone={sessionData ? getToneFromScoreObj(scoreStatus) : "neutral"}
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
          detail="Total CVEs found in the latest CI/CD scan this session."
          tone={pipelineVulns > 0 && pipelineVulns !== "--" ? "danger" : (sessionData ? "success" : "neutral")}
        />
      </div>

      {/* AI Analysis Job Queue Stepper */}
      {analysisState.status === "loading" && (
        <div className="rounded-2xl p-5" style={{ background: "rgba(0,191,255,0.04)", boxShadow: "inset 0 0 0 1px rgba(0,191,255,0.15)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI Analysis In Progress</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "Fetching repository metadata",       icon: GitBranch,   done: true,  active: false },
              { label: "Running AI failure prediction model", icon: Zap,         done: false, active: true  },
              { label: "Calculating risk score & insights",   icon: ShieldAlert, done: false, active: false },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={`flex items-center gap-3 text-xs ${step.done ? "text-emerald-400" : step.active ? "text-white" : "text-slate-600"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-500/20" : step.active ? "" : "bg-white/5"}`}
                    style={step.active ? { background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 8px rgba(0,191,255,0.4)" } : {}}>
                    {step.active ? <Loader2 className="w-3 h-3 animate-spin" /> : step.done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  <span className={step.active ? "font-semibold" : ""}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!sessionData && !analysis && analysisState.status !== "loading" && (
        <div className="py-24 rounded-[28px] ring-1 ring-dashed ring-white/[0.07] flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00BFFF20,#FF6A0020)", boxShadow: "0 0 20px rgba(0,191,255,0.15)" }}>
            <Activity className="w-7 h-7" style={{ color: "#00BFFF" }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">No Scan Data Yet</h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed mx-auto">
              Click <b>Analyze Repository (AI)</b> for an AI risk profile,<br />or <b>Simulate CI/CD</b> to run a full Trivy scan.
            </p>
          </div>
        </div>
      )}

      {/* AI Repository Analysis Section */}
      {analysis && (
        <div className="mt-8">
          <h3 className="text-lg font-black mb-4" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI Repository Analyzer</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-6 right-6 opacity-[0.04]"><ShieldAlert className="w-28 h-28" /></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">AI Decision & Rationale</p>
              <div className="flex items-center gap-3 mb-5">
                <span className={`px-5 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 ${analysis.decision === "BLOCK" ? "bg-red-500/15 text-red-400 ring-red-500/30" : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"}`}>
                  {analysis.decision}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 ring-1 ring-white/10 px-3 py-1 rounded-lg uppercase">{analysis.source}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed italic">"{analysis.failurePrediction?.rationale}"</p>
            </div>
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">AI Remediation</p>
              </div>
              <div className="space-y-3">
                {analysis.suggestions?.map((s, i) => (
                  <div key={i} className="flex gap-3 group">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 text-white transition-all"
                      style={{ background: "linear-gradient(135deg,#00BFFF,#FF6A00)" }}>{i + 1}</div>
                    <p className="text-sm text-slate-400 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
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

      {/* CI/CD Pipeline Data Section — only shows after a Simulate CI/CD scan this session */}
      <div className="mt-8">
        <h3 className="text-lg font-black mb-4" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>CI/CD Pipeline Intelligence</h3>

        {/* Score History Chart */}
        {(() => {
          const recordsById = new Map();
          sidebarHistory
            .filter(h => h.repository === repository.fullName && h.devpulseScore?.score != null)
            .forEach(record => recordsById.set(record.id || record.runId || record.receivedAt || record.timestamp, record));

          if (sessionData?.repository === repository.fullName && sessionData?.devpulseScore?.score != null) {
            recordsById.set(sessionData.id || sessionData.runId || sessionData.receivedAt || sessionData.timestamp, sessionData);
          }

          const historyForRepo = [...recordsById.values()]
            .sort((a, b) => getRecordTime(a) - getRecordTime(b))
            .slice(-10);

          if (historyForRepo.length === 0) return null;

          const chartData = historyForRepo.map((h, i) => ({
            name: `Run ${i + 1}`,
            score: h.devpulseScore.score,
            status: h.devpulseScore.status,
            date: new Date(h.receivedAt || h.timestamp).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          return (
            <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 mb-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">DevPulse Score Trend</p>
                <span className="text-[10px] text-slate-600 font-semibold">
                  {historyForRepo.length === 1 ? "1 scan recorded" : `${historyForRepo.length} scans recorded`}
                </span>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                      itemStyle={{ color: '#00BFFF', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                      formatter={(value, name, item) => [`${value}/100 (${item.payload.status || "N/A"})`, "Score"]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                    />
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00BFFF" />
                        <stop offset="100%" stopColor="#FF6A00" />
                      </linearGradient>
                    </defs>
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="url(#lineGradient)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#00BFFF", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#fff', stroke: "#FF6A00", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* Simulate progress stepper */}
        {simulateJobStatus && simulateJobStatus !== "done" && (
          <div className="mb-6 bg-white/[0.02] ring-1 ring-white/[0.08] rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {simulateJobStatus === "failed" ? "Scan Failed" : "CI/CD Scan In Progress"}
            </p>
            {simulateJobStatus !== "failed"
              ? <SimulateProgressStepper />
              : <p className="text-xs text-red-400 mt-2">The Trivy scan failed. Check that Trivy and Git are installed and accessible.</p>
            }
          </div>
        )}

        {!sessionData && !simulateJobStatus ? (
          <div className="py-12 rounded-2xl ring-1 ring-dashed ring-white/[0.07] flex flex-col items-center justify-center text-center">
            <Server className="w-6 h-6 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No scan data for this session.<br />Click <b>Simulate CI/CD</b> to run a fresh Trivy scan.</p>
          </div>
        ) : sessionData ? (
          <>
            <div className="grid grid-cols-2 gap-6">
              {/* Pipeline Stages */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Pipeline Stages</p>
                <div className="space-y-4">
                  {[
                    { name: "Backend Tests",  status: sessionData.stages?.backend?.tests,   icon: TestTube },
                    { name: "Frontend Build", status: sessionData.stages?.frontend?.build,  icon: Box },
                    { name: "Docker Build",   status: sessionData.stages?.docker?.build,    icon: Server },
                  ].map(stage => (
                    <div key={stage.name} className="flex items-center justify-between p-3 bg-white/[0.02] ring-1 ring-white/[0.06] rounded-xl">
                      <div className="flex items-center gap-3">
                        <stage.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-300">{stage.name}</span>
                      </div>
                      {stage.status === "success" ? <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Passed</span>
                        : stage.status === "failure" ? <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">Failed</span>
                        : <span className="text-xs font-bold text-slate-400 bg-slate-400/10 px-2 py-1 rounded">Skipped</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Pipeline Insights */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 relative overflow-hidden">
                <div className="absolute top-6 right-6 opacity-[0.04]"><Lightbulb className="w-28 h-28" /></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">AI Pipeline Insights</p>
                <InsightsPanel insights={sessionData.insights} />
              </div>

              {/* Security findings */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-7 col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Security Findings (Trivy Scan)</p>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { label: "Critical", value: sessionData.stages?.security?.critical, color: "text-red-400" },
                    { label: "High",     value: sessionData.stages?.security?.high,     color: "text-orange-400" },
                    { label: "Medium",   value: sessionData.stages?.security?.medium,   color: "text-amber-400" },
                    { label: "Docker Image", value: sessionData.stages?.docker?.imageVulnerabilities, color: "text-blue-400" }
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center bg-white/[0.04] ring-1 ring-white/5 rounded-xl p-3 gap-1 text-center">
                      <span className={`text-xl font-black ${color}`}>{value ?? 0}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">{label}</span>
                    </div>
                  ))}
                </div>
                {sessionData.stages?.security?.vulnerabilities?.length > 0 && (
                  <div className="border-t border-white/5 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Top Vulnerabilities</p>
                    <VulnerabilityTable vulnerabilities={sessionData.stages.security.vulnerabilities} />
                  </div>
                )}
              </div>
            </div>

            <ErrorBoundary>
              <AICopilot pipelineData={sessionData} analysisResult={analysisResult} accessToken={accessToken} />
            </ErrorBoundary>
          </>
        ) : null}
      </div>

    </div>
  );
}

export default AnalysisPanel;
