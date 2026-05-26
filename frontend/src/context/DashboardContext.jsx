import { createContext, useState, useEffect, useDeferredValue } from "react";
import { apiRequest, ApiError } from "../api";

export const DashboardContext = createContext();

export function DashboardProvider({ children, accessToken, user, onSessionExpired }) {
  const STORAGE_KEY = `devpulse_last_repo_${user?.id}`;

  const [repositories, setRepositories] = useState([]);
  const [repoState, setRepoState] = useState({ error: "", status: "loading" });
  const [analysisState, setAnalysisState] = useState({ error: "", status: "idle", targetRepositoryId: null, jobStatus: null });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisState({ error: "", status: "idle", targetRepositoryId: null, jobStatus: null });
  }, [selectedRepositoryId]);

  async function fetchSidebarHistory() {
    setHistoryLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await apiRequest("/api/pipeline/results?limit=100", { accessToken });
      setSidebarHistory(data.results || []);
    } catch (err) {
      console.error("Failed to refresh scan history", err);
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.("Session expired.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteRecord(id) {
    try {
      await apiRequest(`/api/pipeline/results/${id}`, { accessToken, method: "DELETE" });
      setSidebarHistory(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (err) { console.error("Delete failed", err); }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    try {
      await apiRequest(`/api/pipeline/results`, { accessToken, method: "DELETE", body: JSON.stringify({ ids }) });
      setSidebarHistory(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedIds(new Set());
    } catch (err) { console.error("Bulk delete failed", err); }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

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
        if (err instanceof ApiError && err.status === 401) { onSessionExpired?.("Session expired."); return; }
        setRepoState({ error: err.message, status: "error" });
      }
    }
    load();
    return () => { live = false; };
  }, [accessToken, onSessionExpired, user?.id]);

  useEffect(() => {
    if (accessToken) fetchSidebarHistory();
  }, [accessToken]);

  async function handleAnalyze(repo) {
    setAnalysisState({ error: "", status: "loading", targetRepositoryId: repo.id, jobStatus: null });
    setSelectedRepositoryId(repo.id);

    try {
      const data = await apiRequest("/analyze", {
        accessToken,
        method: "POST",
        body: JSON.stringify({ repositoryFullName: repo.fullName }),
      });

      // We expect a 202 Accepted with a jobId and room.
      // The ScanProgress WebSocket component will handle completion!
      setAnalysisState({ 
        error: "", 
        status: "loading", 
        targetRepositoryId: repo.id, 
        jobStatus: "queued",
        jobId: data.jobId 
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onSessionExpired?.("Session expired."); return; }
      setAnalysisState({ error: err.message, status: "error", targetRepositoryId: repo.id, jobStatus: null });
    }
  }

  const filteredRepositories = repositories.filter(r => {
    const hay = `${r.name} ${r.fullName} ${r.language || ""} ${r.description || ""}`.toLowerCase();
    return hay.includes(deferredSearch.trim().toLowerCase());
  });

  const selectedRepo = repositories.find(r => r.id === selectedRepositoryId) || null;

  return (
    <DashboardContext.Provider value={{
      repositories, repoState,
      analysisState, setAnalysisState,
      analysisResult, setAnalysisResult,
      selectedRepositoryId, setSelectedRepositoryId,
      searchTerm, setSearchTerm,
      sidebarTab, setSidebarTab,
      sidebarHistory, historyLoading,
      selectedHistoryRecord, setSelectedHistoryRecord,
      historySearch, setHistorySearch,
      selectedIds, setSelectedIds,
      fetchSidebarHistory, deleteRecord, deleteSelected, toggleSelect,
      handleAnalyze, filteredRepositories, selectedRepo
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
