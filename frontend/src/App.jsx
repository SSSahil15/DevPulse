import { useEffect, useState, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import * as Sentry from "@sentry/react";
import { getStoredToken, clearToken, isTokenExpired, decodeJWTPayload } from "./api";
import ErrorBoundary from "./components/ErrorBoundary";

const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SharedReportPage = lazy(() => import("./pages/SharedReportPage"));

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
        <div className="animate-pulse w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
          <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" width="64" height="64" loading="eager" />
        </div>
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading your DevPulse workspace...
      </div>
    </div>
  );
}

/**
 * Keep-alive ping — prevents Render free-tier cold starts by pinging /health
 * every 10 minutes while the app is open in a browser tab.
 */
function useKeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {});
    };
    ping(); // Ping immediately on mount
    const id = setInterval(ping, 10 * 60 * 1000); // Then every 10 minutes
    return () => clearInterval(id);
  }, []);
}

function App() {
  const [session, setSession] = useState({ status: "loading", user: null, accessToken: "", error: "" });

  // Keep Render free tier warm
  useKeepAlive();

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

      // Identify user in Sentry so all frontend errors are attributed correctly
      Sentry.setUser({
        id:       user.id,
        username: user.username,
        email:    user.email,
      });
    }

    bootstrap();
  }, []);

  function handleLogout() {
    clearToken();
    Sentry.setUser(null);   // Clear user from Sentry scope on logout
    setSession({ status: "anonymous", user: null, accessToken: "", error: "" });
  }

  function handleSessionExpired(message) {
    clearToken();
    Sentry.setUser(null);   // Clear user from Sentry scope on session expiry
    setSession({ status: "anonymous", user: null, accessToken: "", error: message || "Your session expired. Please sign in again." });
  }

  if (session.status === "loading") return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
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
              : (
                <ErrorBoundary>
                  <DashboardPage
                    accessToken={session.accessToken}
                    onLogout={handleLogout}
                    onSessionExpired={handleSessionExpired}
                    user={session.user}
                  />
                </ErrorBoundary>
              )}
          />
          <Route path="/report/:token" element={
            <ErrorBoundary>
              <SharedReportPage />
            </ErrorBoundary>
          } />
          <Route path="*" element={<Navigate replace to={session.status === "authenticated" ? "/dashboard" : "/login"} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
