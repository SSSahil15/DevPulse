import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2, Zap } from "lucide-react";
import { getStoredToken, clearToken, isTokenExpired, decodeJWTPayload, apiRequest } from "./api";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SharedReportPage from "./pages/SharedReportPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
      <div className="animate-pulse-glow w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-400 fill-blue-400" />
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading your DevPulse workspace...
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState({ status: "loading", user: null, accessToken: "", error: "" });

  useEffect(() => {
    async function bootstrap() {
      const token = getStoredToken();

      if (!token || isTokenExpired(token)) {
        clearToken();
        setSession({ status: "anonymous", user: null, accessToken: "", error: "" });
        return;
      }

      // Decode user directly from JWT — no network round-trip needed for UI
      const payload = decodeJWTPayload(token);
      const user = {
        id: payload.sub,
        username: payload.username,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        profileUrl: payload.profileUrl,
        email: payload.email,
        followers: payload.followers || 0,
        following: payload.following || 0,
        publicRepos: payload.publicRepos || 0,
        privateRepos: payload.privateRepos || 0,
      };

      setSession({ status: "authenticated", user, accessToken: token, error: "" });
    }

    bootstrap();
  }, []);

  function handleLogout() {
    clearToken();
    setSession({ status: "anonymous", user: null, accessToken: "", error: "" });
  }

  function handleSessionExpired(message) {
    clearToken();
    setSession({ status: "anonymous", user: null, accessToken: "", error: message || "Your session expired. Please sign in again." });
  }

  if (session.status === "loading") return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/login"
        element={session.status === "authenticated"
          ? <Navigate replace to="/dashboard" />
          : <LoginPage sessionError={session.error} />}
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={session.status !== "authenticated"
          ? <Navigate replace to="/login" />
          : <DashboardPage
              accessToken={session.accessToken}
              githubTokenSynced={true}
              onLogout={handleLogout}
              onSessionExpired={handleSessionExpired}
              user={session.user}
            />}
      />
      <Route path="/report/:token" element={<SharedReportPage />} />
      <Route path="*" element={<Navigate replace to={session.status === "authenticated" ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;
