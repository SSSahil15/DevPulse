import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Search, LogOut, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Clock, ScanLine, History, FileDown, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ApiError, apiRequest } from "../api";
import AnalysisPanel from "../components/AnalysisPanel";
import RepositoryCard from "../components/RepositoryCard";

function getInitials(user) {
  if (!user?.displayName && !user?.username) return "DP";
  return (user.displayName || user.username).split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Scan Progress Steps ──────────────────────────────────────────────────────
const SCAN_STEPS = [
  { id: "clone",    label: "Cloning repository",       icon: ScanLine  },
  { id: "trivy",    label: "Running Trivy security scan", icon: ShieldCheck },
  { id: "health",   label: "Fetching GitHub health metrics", icon: Clock },
  { id: "score",    label: "Calculating DevPulse Score", icon: CheckCircle2 },
];

function ScanProgressIndicator({ status }) {
  const stepIndex = status === "processing" ? 2 : status === "pending" ? 0 : 3;
  return (
    <div className="flex flex-col gap-2 py-4">
      {SCAN_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <div key={step.id} className={`flex items-center gap-3 text-xs transition-colors ${done ? "text-emerald-400" : active ? "text-white" : "text-slate-600"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/20" : active ? "" : "bg-white/5"}`}
              style={active ? { background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 8px rgba(0,191,255,0.4)" } : {}}>
              {active ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
            </div>
            <span className={active ? "font-semibold" : ""}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({ accessToken, onLogout, onSessionExpired, user }) {
  const STORAGE_KEY = `devpulse_last_repo_${user?.id}`;

  const [repositories, setRepositories] = useState([]);
  const [repoState, setRepoState] = useState({ error: "", status: "loading" });
  const [analysisState, setAnalysisState] = useState({ error: "", status: "idle", targetRepositoryId: null, jobStatus: null });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(() => {
    // Restore last selected repo from localStorage on page load / refresh
    try {
      const saved = localStorage.getItem(`devpulse_last_repo_${user?.id}`);
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [sidebarTab, setSidebarTab] = useState("repos");
  const [sidebarHistory, setSidebarHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set()); // for bulk delete

  // Clear AI analysis when switching repos so stale data never shows
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisState({ error: "", status: "idle", targetRepositoryId: null, jobStatus: null });
  }, [selectedRepositoryId]);


  // Fetch global scan history across all repositories
  async function fetchSidebarHistory() {
    setHistoryLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await apiRequest("/api/pipeline/results?limit=100", { accessToken });
      setSidebarHistory(data.results || []);
    } catch (err) {
      console.error("Failed to refresh scan history", err);
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired("Session expired.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  // Delete a single record
  async function deleteRecord(id) {
    try {
      await apiRequest(`/api/pipeline/results/${id}`, { accessToken, method: "DELETE" });
      setSidebarHistory(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (err) { console.error("Delete failed", err); }
  }

  // Bulk delete selected records
  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    try {
      await apiRequest(`/api/pipeline/results`, { accessToken, method: "DELETE", body: JSON.stringify({ ids }) });
      setSidebarHistory(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedIds(new Set());
    } catch (err) { console.error("Bulk delete failed", err); }
  }

  // Toggle individual record selection
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // PDF generator — matches SharedReportPage visual format
  function downloadPDF(record) {
    const sc = record.devpulseScore?.score ?? 'N/A';
    const scColor = sc >= 80 ? '#10b981' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const risk = record.devpulseScore?.riskCategory || (sc >= 80 ? 'LOW' : sc >= 50 ? 'MEDIUM' : 'HIGH');
    const riskColor = risk === 'LOW' ? '#10b981' : risk === 'MEDIUM' ? '#f59e0b' : '#ef4444';
    const status = record.devpulseScore?.status || 'N/A';
    const statusColor = status === 'SAFE' ? '#10b981' : status === 'WARNING' ? '#f59e0b' : '#ef4444';
    const vulns = record.stages?.security?.vulnerabilities || [];
    const stg = s => s === 'success' ? '#10b981' : s === 'failure' ? '#ef4444' : '#94a3b8';
    const stgLabel = s => s === 'success' ? '✓ Passed' : s === 'failure' ? '✗ Failed' : '— Skipped';

    const factors = record.devpulseScore?.factors ? Object.entries(record.devpulseScore.factors).map(([k, f]) => {
      const labels = { security:'Security', commitFrequency:'Commit Frequency', contributors:'Contributors', codeChurn:'Code Churn', historicalFailureRate:'Failure Rate', buildGates:'Build Gates' };
      const fc = f.score >= 80 ? '#10b981' : f.score >= 50 ? '#f59e0b' : '#ef4444';
      return '<tr><td style="padding:8px 12px;border-bottom:1px solid #1e293b">' + (labels[k]||k) + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:' + fc + ';font-weight:700">' + f.score + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#64748b;font-size:12px">×' + f.weight + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b"><div style="background:#1e293b;border-radius:4px;height:6px;overflow:hidden"><div style="background:' + fc + ';height:100%;width:' + f.score + '%"></div></div></td></tr>';
    }).join('') : '';

    const vulnRows = vulns.slice(0, 30).map(v => {
      const vc = v.severity==='CRITICAL'?'#ef4444':v.severity==='HIGH'?'#f97316':'#f59e0b';
      return '<tr><td style="padding:8px 12px;border-bottom:1px solid #1e293b"><span style="background:' + vc + '20;color:' + vc + ';font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase">' + (v.severity||'N/A') + '</span></td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;font-family:monospace;font-size:12px;color:#e2e8f0">' + (v.id||'N/A') + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;font-family:monospace;font-size:12px;color:#60a5fa">' + (v.pkgName||'N/A') + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#64748b;font-size:12px">' + (v.installedVersion||'N/A') + '</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:12px">' + (v.title||'').substring(0,60) + '</td></tr>';
    }).join('');

    const repoMeta = record.repoMeta || {};
    const html = buildReportHTML({ record, sc, scColor, risk, riskColor, status, statusColor, factors, vulnRows, vulns, stg, stgLabel, repoMeta });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function buildReportHTML({ record, sc, scColor, risk, riskColor, status, statusColor, factors, vulnRows, vulns, stg, stgLabel, repoMeta }) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>DevPulse Report ${record.repository}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#080b14;color:#e2e8f0;padding:40px;max-width:960px;margin:0 auto;line-height:1.5}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px}
.logo{display:flex;align-items:center;gap:12px}
.logo-icon{width:40px;height:40px;background:#2563eb;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 14px #2563eb40}
.logo-name{font-size:20px;font-weight:900;color:#fff}.logo-sub{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#475569;font-weight:700}
.section{background:#0d1117;border:1px solid #1e293b;border-radius:16px;padding:28px;margin-bottom:20px}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#475569;margin-bottom:16px}
.repo-name{font-size:24px;font-weight:900;color:#f1f5f9;margin-bottom:8px}
.meta-row{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
.meta-chip{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:4px 10px;font-size:12px;color:#94a3b8;font-weight:500}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:#0d1117;border:1px solid #1e293b;border-radius:14px;padding:20px;text-align:center}
.stat-val{font-size:36px;font-weight:900;line-height:1}
.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#475569;font-weight:700;margin-top:6px}
.badge{display:inline-block;padding:4px 14px;border-radius:100px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em}
table{width:100%;border-collapse:collapse;font-size:13px}
th{padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#475569;font-weight:700;border-bottom:2px solid #1e293b}
.insight-box{background:#172033;border:1px solid #1e40af50;border-radius:12px;padding:20px;margin-bottom:16px}
.insight-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#60a5fa;margin-bottom:8px}
.root-box{background:#1a0a0a;border:1px solid #ef444430;border-radius:12px;padding:16px;margin-bottom:12px}
.root-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#ef4444;margin-bottom:8px}
.sugg-box{background:#0a1a0f;border:1px solid #10b98130;border-radius:12px;padding:16px}
.sugg-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#10b981;margin-bottom:12px}
.sugg-item{display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:#94a3b8;align-items:flex-start}
.sugg-num{width:20px;height:20px;min-width:20px;background:#10b98120;color:#10b981;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900}
.footer-bar{background:#0d1117;border:1px solid #1e293b;border-radius:14px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#475569;margin-top:24px}
.branding{text-align:center;margin-top:16px;color:#334155;font-size:12px;padding-bottom:20px}
@media print{body{background:white;color:#1e293b}.section,.stat-card{background:#f8fafc;border-color:#e2e8f0;box-shadow:none}.no-print{display:none}}
</style></head><body>
<div class="logo-row">
  <div class="logo"><div class="logo-icon" style="overflow:hidden;padding:4px"><img src="${window.location.origin}/Logo.png" style="width:100%;height:100%;object-fit:contain"/></div><div><div class="logo-name">DevPulse</div><div class="logo-sub">Scan Report</div></div></div>
  <button class="no-print" onclick="window.print()" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:8px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600">↓ Export as PDF</button>
</div>
<div class="section">
  <div class="section-label">Repository</div>
  <div class="repo-name">${record.repository}</div>
  ${repoMeta.description ? '<p style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:8px">' + repoMeta.description + '</p>' : ''}
  <div class="meta-row">
    <span class="meta-chip">📂 ${record.branch||'main'}</span>
    <span class="meta-chip">🕐 ${new Date(record.timestamp||record.receivedAt).toLocaleString()}</span>
    ${record.overallStatus?'<span class="meta-chip" style="color:' + (record.overallStatus==='success'?'#10b981':'#ef4444') + ';font-weight:700">Pipeline: ' + record.overallStatus.toUpperCase() + '</span>':''}
    ${repoMeta.stargazersCount?'<span class="meta-chip">⭐ ' + repoMeta.stargazersCount + ' Stars</span>':''}
    ${repoMeta.forksCount?'<span class="meta-chip">🍴 ' + repoMeta.forksCount + ' Forks</span>':''}
    ${repoMeta.language?'<span class="meta-chip">' + repoMeta.language + '</span>':''}
  </div>
</div>
<div class="grid3">
  <div class="stat-card"><div class="stat-val" style="color:${scColor}">${sc}</div><div class="stat-label">DevPulse Score</div><div style="margin-top:8px"><span class="badge" style="background:${statusColor}20;color:${statusColor}">${status}</span></div></div>
  <div class="stat-card"><div class="stat-val" style="color:${riskColor}">${risk}</div><div class="stat-label">Risk Category</div><div style="margin-top:8px;font-size:12px;color:#64748b">${risk==='LOW'?'Safe to deploy':'Review before deploy'}</div></div>
  <div class="stat-card"><div class="stat-val" style="color:#ef4444">${(record.stages?.security?.critical||0)+(record.stages?.security?.high||0)}</div><div class="stat-label">Crit + High CVEs</div><div style="margin-top:4px;font-size:12px;color:#94a3b8">${record.stages?.security?.medium||0} medium</div></div>
</div>
${factors ? '<div class="section"><div class="section-label">Score Factor Breakdown</div><table><thead><tr><th>Factor</th><th>Score</th><th>Weight</th><th>Progress</th></tr></thead><tbody>' + factors + '</tbody></table></div>' : ''}
<div class="section">
  <div class="section-label">Vulnerability Summary</div>
  <div class="grid4" style="margin-bottom:${vulns.length>0?24:0}px">
    <div class="stat-card"><div class="stat-val" style="color:#ef4444">${record.stages?.security?.critical||0}</div><div class="stat-label">Critical</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#f97316">${record.stages?.security?.high||0}</div><div class="stat-label">High</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#f59e0b">${record.stages?.security?.medium||0}</div><div class="stat-label">Medium</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#60a5fa">${record.stages?.security?.low||0}</div><div class="stat-label">Low</div></div>
  </div>
  ${vulns.length>0?'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#475569;margin-bottom:12px">Top Vulnerabilities (' + vulns.length + ')</div><table><thead><tr><th>Severity</th><th>CVE ID</th><th>Package</th><th>Version</th><th>Title</th></tr></thead><tbody>' + vulnRows + (vulns.length>30?'<tr><td colspan="5" style="padding:10px 12px;color:#475569;text-align:center;font-style:italic">...and ' + (vulns.length-30) + ' more</td></tr>':'') + '</tbody></table>':'<p style="color:#10b981;font-weight:600;font-size:14px">✅ No vulnerabilities detected</p>'}
</div>
<div class="section">
  <div class="section-label">Pipeline Stages</div>
  <table><thead><tr><th>Stage</th><th>Result</th></tr></thead><tbody>
  <tr><td style="padding:10px 12px;border-bottom:1px solid #1e293b">Backend Tests</td><td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:${stg(record.stages?.backend?.tests)};font-weight:700">${stgLabel(record.stages?.backend?.tests)}</td></tr>
  <tr><td style="padding:10px 12px;border-bottom:1px solid #1e293b">Frontend Build</td><td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:${stg(record.stages?.frontend?.build)};font-weight:700">${stgLabel(record.stages?.frontend?.build)}</td></tr>
  <tr><td style="padding:10px 12px;border-bottom:1px solid #1e293b">Frontend Tests</td><td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:${stg(record.stages?.frontend?.tests)};font-weight:700">${stgLabel(record.stages?.frontend?.tests)}</td></tr>
  <tr><td style="padding:10px 12px">Docker Build</td><td style="padding:10px 12px;color:${stg(record.stages?.docker?.build)};font-weight:700">${stgLabel(record.stages?.docker?.build)}</td></tr>
  </tbody></table>
</div>
${record.insights?'<div class="section"><div class="section-label">💡 AI Insights</div>' + (record.insights.explanation?'<div class="insight-box"><div class="insight-label">Analysis</div><p style="font-size:14px;color:#94a3b8;line-height:1.7">' + record.insights.explanation + '</p></div>':'') + (record.insights.rootCause?'<div class="root-box"><div class="root-label">Root Cause</div><p style="font-size:13px;color:#94a3b8">' + record.insights.rootCause + '</p></div>':'') + (record.insights.suggestions?.length?'<div class="sugg-box"><div class="sugg-label">Recommended Actions</div>' + record.insights.suggestions.map((s,i)=>'<div class="sugg-item"><div class="sugg-num">'+(i+1)+'</div><span>'+s+'</span></div>').join('') + '</div>':'') + '</div>':''}
<div class="footer-bar"><span>Generated by <strong style="color:#94a3b8">DevPulse</strong></span><span>${new Date().toLocaleString()}</span></div>
<div class="branding">⚡ DevPulse — AI-Powered DevSecOps Intelligence</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
  }


  // Persist selected repo whenever it changes
  useEffect(() => {
    try {
      if (selectedRepositoryId) {
        localStorage.setItem(STORAGE_KEY, String(selectedRepositoryId));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [selectedRepositoryId, STORAGE_KEY]);

  useEffect(() => {
    let live = true;
    async function load() {
      setRepoState({ error: "", status: "loading" });
      try {
        const data = await apiRequest("/repos", { accessToken });
        if (!live) return;
        setRepositories(data.repositories);
        setRepoState({ error: "", status: "success" });
        if (data.repositories.length > 0) setSelectedRepositoryId(c => c || data.repositories[0].id);
      } catch (err) {
        if (!live) return;
        if (err instanceof ApiError && err.status === 401) { onSessionExpired("Session expired."); return; }
        setRepoState({ error: err.message, status: "error" });
      }
    }
    load();
    return () => { live = false; };
  }, [accessToken, onSessionExpired, user.id]);

  const filtered = repositories.filter(r => {
    const hay = `${r.name} ${r.fullName} ${r.language || ""} ${r.description || ""}`.toLowerCase();
    return hay.includes(deferredSearch.trim().toLowerCase());
  });

  const selectedRepo = repositories.find(r => r.id === selectedRepositoryId) || null;

  useEffect(() => {
    fetchSidebarHistory();
  }, [accessToken]);

  async function handleAnalyze(repo) {
    setAnalysisState({ error: "", status: "loading", targetRepositoryId: repo.id, jobStatus: null });
    setSelectedRepositoryId(repo.id);

    try {
      // Only calls Python FastAPI AI service — fast (~1-2s)
      // CI/CD pipeline simulation is separate via the "Simulate CI/CD" button
      const data = await apiRequest("/analyze", {
        accessToken,
        method: "POST",
        body: JSON.stringify({ repositoryFullName: repo.fullName }),
      });

      setAnalysisResult(data);
      setAnalysisState({ error: "", status: "success", targetRepositoryId: repo.id, jobStatus: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired("Session expired."); return; }
      setAnalysisState({ error: err.message, status: "error", targetRepositoryId: repo.id, jobStatus: null });
    }
  }


  // ─── Logout: clear server-side token then local storage ──────────────────
  async function handleLogout() {
    try {
      await apiRequest("/auth/provider-token", { accessToken, method: "DELETE" });
    } catch {
      // Best-effort — still log out locally even if the server call fails
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    onLogout();
  }

  return (
    <div className="flex h-screen bg-[#080b14] overflow-hidden">
      {/* ─── In-Platform Report Modal ─────────────────────────────────────── */}
      {selectedHistoryRecord && (() => {
        const r = selectedHistoryRecord;
        const sc = r.devpulseScore?.score ?? "N/A";
        const scColor = sc >= 75 ? "text-emerald-400" : sc >= 50 ? "text-amber-400" : "text-red-400";
        const statusBg = r.devpulseScore?.status === "SAFE" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
          : r.devpulseScore?.status === "WARNING" ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
          : "bg-red-500/10 text-red-400 ring-red-500/20";
        const stgColor = s => s === "success" ? "text-emerald-400" : s === "failure" ? "text-red-400" : "text-slate-500";
        const stgLabel = s => s === "success" ? "Passed" : s === "failure" ? "Failed" : "Skipped";
        const vulns = r.stages?.security?.vulnerabilities || [];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedHistoryRecord(null)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1117] border border-white/[0.08] rounded-3xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Scan Report</p>
                  <h2 className="text-base font-black text-white">{r.repository?.split("/")[1] || r.repository}</h2>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {r.repository} · {r.branch || "main"} · {new Date(r.timestamp||r.receivedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadPDF(r)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl transition-all"
                    style={{ background: "linear-gradient(135deg, #00BFFF 0%, #FF6A00 100%)", boxShadow: "0 0 12px rgba(0,191,255,0.25)" }}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedHistoryRecord(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-lg font-bold"
                  >×</button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Score Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "DevPulse Score", value: sc, colorClass: scColor },
                    { label: "Pipeline Status", value: r.overallStatus?.toUpperCase() || "N/A", colorClass: r.overallStatus === "success" ? "text-emerald-400" : "text-red-400" },
                    { label: "Total CVEs", value: (r.stages?.security?.critical||0)+(r.stages?.security?.high||0)+(r.stages?.security?.medium||0), colorClass: "text-orange-400" },
                  ].map(({ label, value, colorClass }) => (
                    <div key={label} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl p-4 text-center">
                      <div className={`text-3xl font-black ${colorClass}`}>{value}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ring-1 ${statusBg}`}>
                    {r.devpulseScore?.status || "N/A"}
                  </span>
                  <span className="text-xs text-slate-500">CVE breakdown:</span>
                  <span className="text-xs text-red-400 font-bold">{r.stages?.security?.critical||0} Critical</span>
                  <span className="text-xs text-orange-400 font-bold">{r.stages?.security?.high||0} High</span>
                  <span className="text-xs text-amber-400 font-bold">{r.stages?.security?.medium||0} Medium</span>
                </div>

                {/* AI Pipeline Insights */}
                {r.insights?.explanation && (
                  <div className="rounded-2xl p-4" style={{ background: "rgba(0,191,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(0,191,255,0.15)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI Pipeline Insights</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{r.insights.explanation}</p>
                  </div>
                )}

                {/* AI Analysis (from Analyze Repository button — current session only) */}
                {(() => {
                  const aiData = analysisResult?.analysis;
                  const sameRepo = selectedRepo?.fullName === r.repository;
                  if (!aiData || !sameRepo) return null;
                  const prob = aiData.failurePrediction?.probability;
                  const probColor = prob >= 70 ? "text-red-400" : prob >= 40 ? "text-amber-400" : "text-emerald-400";
                  return (
                    <div className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(0,191,255,0.04)", boxShadow: "inset 0 0 0 1px rgba(255,106,0,0.15)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI Repository Analysis</p>

                      {/* Decision + Probability */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest ring-1 ${
                          aiData.decision === "BLOCK"
                            ? "bg-red-500/15 text-red-400 ring-red-500/30"
                            : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                        }`}>{aiData.decision}</span>
                        {prob !== undefined && (
                          <span className={`text-sm font-black ${probColor}`}>
                            {Math.round(prob)}% failure probability
                          </span>
                        )}
                      </div>

                      {/* Rationale */}
                      {aiData.failurePrediction?.rationale && (
                        <p className="text-sm text-slate-400 italic leading-relaxed">
                          "{aiData.failurePrediction.rationale}"
                        </p>
                      )}

                      {/* Suggestions */}
                      {aiData.suggestions?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Remediation Steps</p>
                          {aiData.suggestions.map((s, si) => (
                            <div key={si} className="flex gap-2.5">
                              <div className="w-5 h-5 shrink-0 rounded-md text-white flex items-center justify-center text-[10px] font-black" style={{ background: "linear-gradient(135deg,#00BFFF,#FF6A00)" }}>{si + 1}</div>
                              <p className="text-xs text-slate-400 leading-relaxed">{s}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Pipeline Stages */}
                <div className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Pipeline Stages</p>
                  <div className="space-y-2">
                    {[
                      { name: "Backend Tests",  status: r.stages?.backend?.tests },
                      { name: "Frontend Build", status: r.stages?.frontend?.build },
                      { name: "Frontend Tests", status: r.stages?.frontend?.tests },
                      { name: "Docker Build",   status: r.stages?.docker?.build },
                    ].map(({ name, status }) => (
                      <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-sm text-slate-400">{name}</span>
                        <span className={`text-xs font-bold uppercase tracking-widest ${stgColor(status)}`}>{stgLabel(status)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score History Chart */}
                {(() => {
                  const historyForRepo = sidebarHistory.filter(h => h.repository === r.repository && h.devpulseScore?.score != null);
                  if (historyForRepo.length < 2) return null;
                  const chartData = [...historyForRepo].reverse().slice(0, 10).map((h, i) => ({
                    name: `#${i + 1}`,
                    score: h.devpulseScore.score,
                  }));
                  return (
                    <div className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Score History</p>
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={chartData} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "#0f1421", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: "#94a3b8" }}
                            itemStyle={{ color: "#00BFFF" }}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={`url(#scoreGrad${index})`}
                                opacity={0.85}
                              />
                            ))}
                          </Bar>
                          <defs>
                            {chartData.map((_, index) => (
                              <linearGradient key={index} id={`scoreGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00BFFF" />
                                <stop offset="100%" stopColor="#FF6A00" />
                              </linearGradient>
                            ))}
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Top Vulnerabilities */}
                {vulns.length > 0 && (
                  <div className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                      Top Vulnerabilities ({vulns.length})
                    </p>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {vulns.slice(0, 20).map((v, vi) => (
                        <div key={vi} className="flex items-start gap-3 p-2 rounded-xl bg-white/[0.02]">
                          <span className={`shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${
                            v.severity === "CRITICAL" ? "bg-red-500/10 text-red-400"
                            : v.severity === "HIGH" ? "bg-orange-500/10 text-orange-400"
                            : "bg-amber-500/10 text-amber-400"
                          }`}>{v.severity}</span>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-300 font-mono truncate">{v.id}</p>
                            <p className="text-[11px] text-slate-500 truncate">{v.pkgName} {v.installedVersion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vulns.length === 0 && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> No vulnerabilities found in this scan
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Background */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-60 w-[700px] h-[700px] bg-blue-600/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-indigo-700/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-[280px] shrink-0 flex flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-black tracking-tight" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>DevPulse</span>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
            <input
              className="w-full bg-white/[0.04] ring-1 ring-white/[0.08] focus:ring-blue-500/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 outline-none transition-all"
              onChange={e => startTransition(() => setSearchTerm(e.target.value))}
              placeholder="Search repos..."
              value={searchTerm}
            />
          </div>
        </div>

        {/* Sidebar Tab Bar */}
        <div className="flex border-b border-white/[0.06]">
          {[{ id: "repos", label: "Repos", icon: null }, { id: "history", label: "History", icon: History }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSidebarTab(tab.id); if (tab.id === "history") fetchSidebarHistory(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                sidebarTab === tab.id
                  ? "text-white border-b-2"
                  : "text-slate-600 hover:text-slate-400"
              }`}
              style={sidebarTab === tab.id ? { borderImage: "linear-gradient(90deg,#00BFFF,#FF6A00) 1", color: "#00BFFF" } : {}}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              {tab.label}
              {tab.id === "repos" && <span className="ml-1 text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full">{repositories.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab: Repositories */}
        {sidebarTab === "repos" && (
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {repoState.status === "loading" && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Fetching repositories...</span>
              </div>
            )}
            {repoState.status === "error" && (
              <div className="mx-2 flex items-start gap-2 bg-red-500/10 ring-1 ring-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300">{repoState.error}</span>
              </div>
            )}
            {filtered.map(repo => (
              <RepositoryCard
                key={repo.id}
                isAnalyzing={analysisState.status === "loading" && analysisState.targetRepositoryId === repo.id}
                isSelected={selectedRepositoryId === repo.id}
                onAnalyze={handleAnalyze}
                onSelect={r => setSelectedRepositoryId(r.id)}
                repository={repo}
              />
            ))}
          </div>
        )}

        {/* Tab: Scan History */}
        {sidebarTab === "history" && (() => {
          const filtered = sidebarHistory.filter(r => {
            const q = historySearch.trim().toLowerCase();
            if (!q) return true;
            return (r.repository||"").toLowerCase().includes(q)
              || (r.branch||"").toLowerCase().includes(q)
              || String(r.devpulseScore?.score||"").includes(q)
              || (r.devpulseScore?.status||"").toLowerCase().includes(q);
          });
          const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

          return (
            <div className="flex-1 overflow-y-auto flex flex-col pb-4">
              {/* Header row */}
              <div className="px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">All Repositories</span>
                <button
                  onClick={() => fetchSidebarHistory()}
                  className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                  style={{ color: "#00BFFF" }}
                >Refresh</button>
              </div>

              {/* Search bar */}
              <div className="px-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                  <input
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full bg-white/[0.03] ring-1 ring-white/[0.08] focus:ring-blue-500/40 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Bulk actions bar */}
              {filtered.length > 0 && (
                <div className="px-3 pb-2 flex items-center gap-2 shrink-0">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelectedIds(prev => {
                          const s = new Set(prev);
                          filtered.forEach(r => s.delete(r.id));
                          return s;
                        });
                      } else {
                        setSelectedIds(prev => {
                          const s = new Set(prev);
                          filtered.forEach(r => s.add(r.id));
                          return s;
                        });
                      }
                    }}
                    className="w-3 h-3 rounded accent-blue-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-600 flex-1">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                  </span>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={deleteSelected}
                      className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-2 py-1 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete {selectedIds.size}
                    </button>
                  )}
                </div>
              )}

              {historyLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-600 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading history...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <History className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {historySearch ? "No records match your search." : "No scan history yet."}<br />
                    {!historySearch && <span>Run <b>Simulate CI/CD</b> to create the first record.</span>}
                  </p>
                </div>
              ) : (
                <div className="px-2 space-y-1.5 overflow-y-auto flex-1">
                  <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold px-2 mb-1">Auto-deleted after 7 days · {filtered.length} records</p>
                  {filtered.map((record, i) => {
                    const sc = record.devpulseScore?.score ?? "–";
                    const scColor = sc >= 75 ? "text-emerald-400" : sc >= 50 ? "text-amber-400" : "text-red-400";
                    const statusBg = record.devpulseScore?.status === "SAFE" ? "bg-emerald-500/10 text-emerald-400"
                      : record.devpulseScore?.status === "WARNING" ? "bg-amber-500/10 text-amber-400"
                      : "bg-red-500/10 text-red-400";
                    const cves = (record.stages?.security?.critical||0) + (record.stages?.security?.high||0) + (record.stages?.security?.medium||0);
                    const isSelected = selectedIds.has(record.id);
                    return (
                      <div
                        key={record.id || i}
                      className={`relative bg-white/[0.02] ring-1 rounded-xl p-3 transition-all ${isSelected ? "ring-white/20 bg-white/[0.04]" : "ring-white/[0.06] hover:bg-white/[0.04]"}`}
                      style={isSelected ? { boxShadow: "inset 0 0 0 1px rgba(0,191,255,0.3), 0 0 12px rgba(0,191,255,0.1)" } : {}}
                      >
                        {/* Select checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(record.id)}
                          onClick={e => e.stopPropagation()}
                          className="absolute top-3 left-3 w-3 h-3 rounded accent-blue-500 cursor-pointer"
                        />

                        {/* Clickable report area */}
                        <button
                          onClick={() => setSelectedHistoryRecord(record)}
                          className="w-full text-left pl-5"
                        >
                          {/* Repo name + status */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]" title={record.repository}>
                              {record.repository?.split("/")[1] || record.repository}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${statusBg}`}>
                              {record.devpulseScore?.status || "N/A"}
                            </span>
                          </div>
                          {/* Date */}
                          <div className="text-[10px] text-slate-600 font-mono mb-2">
                            {new Date(record.timestamp||record.receivedAt).toLocaleDateString([], { month:"short", day:"numeric" })}
                            {" · "}
                            {new Date(record.timestamp||record.receivedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                          </div>
                          {/* Score + CVEs */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg font-black ${scColor}`}>{sc}</span>
                            <div className="text-[10px] text-slate-600">
                              <div>{cves} CVEs · {record.branch || "main"}</div>
                            </div>
                          </div>
                        </button>

                        {/* Actions row: PDF + Delete */}
                        <div className="flex items-center gap-1.5 pl-5">
                          <button
                            onClick={e => { e.stopPropagation(); downloadPDF(record); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-white px-2 py-1 rounded-lg transition-all"
                            style={{ background: "linear-gradient(135deg, #00BFFF 0%, #FF6A00 100%)" }}
                          >
                            <FileDown className="w-3 h-3" /> PDF
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteRecord(record.id); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* User footer */}
        <div className="border-t border-white/[0.06] bg-white/[0.01] p-4 group relative">
          {/* Hover Card */}
          <div className="absolute bottom-full left-0 w-full p-4 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none translate-y-2 group-hover:translate-y-0 z-50">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 shadow-2xl">
              <div className="grid grid-cols-4 gap-2 text-center divide-x divide-white/10">
                <div>
                  <div className="text-lg font-black text-emerald-400">{user.publicRepos || 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Public</div>
                </div>
                <div>
                  <div className="text-lg font-black text-purple-400">{user.privateRepos || 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Private</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{user.followers || 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Followers</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{user.following || 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Following</div>
                </div>
              </div>
            </div>
          </div>

          <a href={user.profileUrl || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:bg-white/[0.04] p-2 -m-2 rounded-xl transition-colors">
            {user.avatarUrl ? (
              <div className="rounded-full shrink-0 p-[2px]" style={{ background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 10px rgba(0,191,255,0.3)" }}>
                <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              </div>
            ) : (
              <div className="w-[44px] h-[44px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#00BFFF,#FF6A00)", boxShadow: "0 0 10px rgba(0,191,255,0.3)" }}>
                {getInitials(user)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-black truncate w-fit max-w-full" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{user.username}</p>
              <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1 w-fit px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "linear-gradient(135deg,#00BFFF,#FF6A00)" }}></div>
                <span style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Connected via GitHub OAuth</span>
              </div>
            </div>
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-5xl mx-auto p-8">
          {/* Dashboard header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>DevPulse Dashboard</p>
              <h1 className="text-2xl font-black text-white">Welcome back, <span style={{ background: "linear-gradient(90deg,#00BFFF,#FF6A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{user.displayName || user.username}</span> 👋</h1>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Session Info</p>
                <p className="text-xs text-slate-400">Synced {repositories.length} repos at {new Date().toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 text-white"
                style={{ background: "linear-gradient(135deg, #00BFFF 0%, #FF6A00 100%)", boxShadow: "0 0 16px rgba(0,191,255,0.25)" }}
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Scan progress stepper — shows for all AI + pipeline analyses */}
          {analysisState.status === "loading" && analysisState.targetRepositoryId === selectedRepo?.id && analysisState.jobStatus && (
            <div className="mb-6 bg-white/[0.02] ring-1 ring-white/[0.08] rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Analysis in progress</p>
              <ScanProgressIndicator status={analysisState.jobStatus} />
            </div>
          )}

          <AnalysisPanel
            accessToken={accessToken}
            analysisResult={analysisState.targetRepositoryId === selectedRepo?.id ? analysisResult : null}
            analysisState={analysisState.targetRepositoryId === selectedRepo?.id ? analysisState : { status: "idle", error: null }}
            onAnalyze={handleAnalyze}
            repository={selectedRepo}
            sidebarHistory={sidebarHistory}
            onScanComplete={async () => {
              // Refresh sidebar history but DO NOT switch tabs automatically
              setHistorySearch("");
              setSelectedIds(new Set());
              await fetchSidebarHistory();
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
