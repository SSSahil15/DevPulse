import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Search, LogOut, ShieldCheck, Zap, Loader2, AlertCircle } from "lucide-react";
import { ApiError, apiRequest } from "../api";
import AnalysisPanel from "../components/AnalysisPanel";
import RepositoryCard from "../components/RepositoryCard";

function getInitials(user) {
  if (!user?.displayName && !user?.username) return "DP";
  return (user.displayName || user.username).split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function DashboardPage({ accessToken, onLogout, onSessionExpired, user }) {
  const [repositories, setRepositories] = useState([]);
  const [repoState, setRepoState] = useState({ error: "", status: "loading" });
  const [analysisState, setAnalysisState] = useState({ error: "", status: "idle", targetRepositoryId: null });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);

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

  async function handleAnalyze(repo) {
    setAnalysisState({ error: "", status: "loading", targetRepositoryId: repo.id });
    setSelectedRepositoryId(repo.id);
    try {
      const data = await apiRequest("/analyze", { accessToken, body: JSON.stringify({ repositoryFullName: repo.fullName }), method: "POST" });
      setAnalysisResult(data);
      setAnalysisState({ error: "", status: "success", targetRepositoryId: repo.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired("Session expired."); return; }
      setAnalysisState({ error: err.message, status: "error", targetRepositoryId: repo.id });
    }
  }

  return (
    <div className="flex h-screen bg-[#080b14] overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-60 w-[700px] h-[700px] bg-blue-600/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-indigo-700/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-[280px] shrink-0 flex flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-base font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">DevPulse</span>
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

        {/* Repo count */}
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Repositories</span>
          <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
            {repositories.length}
          </span>
        </div>

        {/* Repo list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {repoState.status === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Fetching repositories from GitHub...</span>
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
              <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/10 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-900 ring-2 ring-white/10 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                {getInitials(user)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white hover:text-blue-400 transition-colors">{user.username}</p>
              <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold mt-1 bg-emerald-400/10 w-fit px-1.5 py-0.5 rounded ring-1 ring-emerald-400/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Connected via GitHub OAuth
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
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-1">DevPulse Dashboard</p>
              <h1 className="text-2xl font-black text-white">Welcome back, {user.displayName || user.username} 👋</h1>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Session Info</p>
                <p className="text-xs text-slate-400">Synced {repositories.length} repos at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-slate-300 hover:text-red-400 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          <AnalysisPanel
            accessToken={accessToken}
            analysisResult={analysisResult?.repository?.id === selectedRepo?.id ? analysisResult : null}
            analysisState={analysisState.targetRepositoryId === selectedRepo?.id ? analysisState : { status: "idle", error: null }}
            onAnalyze={handleAnalyze}
            repository={selectedRepo}
          />
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
