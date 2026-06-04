import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Ban, UserCheck, AlertTriangle,
  RefreshCw, Search, ExternalLink, Lock, Eye, EyeOff,
  CheckCircle, XCircle, Clock, ChevronDown
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// ─── Secret Gate ─────────────────────────────────────────────────────────────
function SecretGate({ onUnlock }) {
  const [secret, setSecret] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'X-Admin-Secret': secret.trim() },
      });
      if (res.ok) {
        onUnlock(secret.trim());
      } else {
        setError('Invalid admin secret. Check your Render environment variables.');
      }
    } catch {
      setError('Could not connect to backend. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md">
        <div className="surface-2 rounded-2xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Admin Panel</h1>
            <p className="text-sm text-slate-500 mt-1 text-center">
              Enter your ADMIN_SECRET to access user management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={show ? 'text' : 'password'}
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="ADMIN_SECRET value from Render"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/40 focus:bg-white/8 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !secret.trim()}
              className="w-full premium-btn text-white font-semibold py-3 px-4 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</>
              ) : (
                <><Shield className="w-4 h-4" /> Access Admin Panel</>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-6">
            This page is not linked anywhere in the app. URL is only known to you.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Ban Confirm Modal ────────────────────────────────────────────────────────
function BanModal({ user, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleBan() {
    if (!reason.trim() || reason.trim().length < 3) return;
    setLoading(true);
    await onConfirm(user, reason.trim());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="surface-3 rounded-2xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Ban User</h2>
            <p className="text-xs text-slate-500">@{user.github_login} · ID {user.user_id}</p>
          </div>
        </div>

        <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            This user will be immediately blocked from all API calls. Their stored GitHub token will also be wiped.
          </p>
        </div>

        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Reason for ban <span className="text-red-400">*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Scraping repos without permission, abuse of AI features…"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/40 transition-all resize-none mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium py-2.5 rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleBan}
            disabled={loading || reason.trim().length < 3}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Confirm Ban
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────
function UserRow({ user, onBan, onUnban }) {
  const [unbanLoading, setUnbanLoading] = useState(false);

  async function handleUnban() {
    setUnbanLoading(true);
    await onUnban(user);
    setUnbanLoading(false);
  }

  const lastSeen = user.last_seen_at
    ? new Date(user.last_seen_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown';

  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
      user.is_banned
        ? 'bg-red-500/5 border-red-500/15'
        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'
    }`}>
      {/* Avatar */}
      <img
        src={`https://github.com/${user.github_login}.png?size=40`}
        alt={user.github_login}
        className={`w-9 h-9 rounded-full shrink-0 ${user.is_banned ? 'grayscale opacity-50' : ''}`}
        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${user.github_login}&background=1e293b&color=94a3b8`; }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 truncate">@{user.github_login}</span>
          {user.is_banned && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md">
              Banned
            </span>
          )}
          <a
            href={user.profile_url || `https://github.com/${user.github_login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-600">ID: {user.user_id}</span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <Clock className="w-3 h-3" /> {lastSeen}
          </span>
        </div>
        {user.is_banned && user.ban_reason && (
          <p className="text-xs text-red-400/80 mt-1 truncate">Reason: {user.ban_reason}</p>
        )}
      </div>

      {/* Action */}
      {user.is_banned ? (
        <button
          onClick={handleUnban}
          disabled={unbanLoading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-all disabled:opacity-40"
        >
          {unbanLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
          Unban
        </button>
      ) : (
        <button
          onClick={() => onBan(user)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all"
        >
          <Ban className="w-3 h-3" /> Ban
        </button>
      )}
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
function AdminPanel({ secret }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | banned
  const [banTarget, setBanTarget] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const headers = { 'X-Admin-Secret': secret, 'Content-Type': 'application/json' };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleBanConfirm(user, reason) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ban`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.user_id, githubLogin: user.github_login, reason }),
      });
      if (!res.ok) throw new Error('Ban failed');
      showToast('success', `@${user.github_login} has been banned.`);
      setBanTarget(null);
      await fetchUsers();
    } catch {
      showToast('error', 'Failed to ban user. Try again.');
      setBanTarget(null);
    }
  }

  async function handleUnban(user) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/unban/${user.user_id}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) throw new Error('Unban failed');
      showToast('success', `@${user.github_login} has been unbanned.`);
      await fetchUsers();
    } catch {
      showToast('error', 'Failed to unban user. Try again.');
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.github_login?.toLowerCase().includes(search.toLowerCase()) || u.user_id?.includes(search);
    const matchFilter = filter === 'all' || (filter === 'banned' ? u.is_banned : !u.is_banned);
    return matchSearch && matchFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => !u.is_banned).length,
    banned: users.filter(u => u.is_banned).length,
  };

  return (
    <div className="min-h-screen bg-[#080b14] p-4 md:p-8">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-900/8 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Admin Panel</h1>
              <p className="text-xs text-slate-500">DevPulse User Management</p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Banned', value: stats.banned, icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`surface-1 rounded-xl p-4 border ${s.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username or user ID…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>
          <div className="flex gap-1.5">
            {[['all','All'],['active','Active'],['banned','Banned']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  filter === val
                    ? 'bg-white/10 border-white/20 text-slate-200'
                    : 'bg-white/5 border-white/[0.06] text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="surface-1 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <XCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={fetchUsers} className="text-xs text-slate-500 hover:text-slate-300 underline">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filtered.map(user => (
                <UserRow
                  key={user.user_id}
                  user={user}
                  onBan={setBanTarget}
                  onUnban={handleUnban}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          {filtered.length} of {users.length} users shown · Admin session is local only
        </p>
      </div>

      {/* Ban Modal */}
      {banTarget && (
        <BanModal
          user={banTarget}
          onConfirm={handleBanConfirm}
          onClose={() => setBanTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
            : 'bg-red-500/15 border-red-500/25 text-red-300'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Page Entry ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem('dp_admin_secret') || '');

  function handleUnlock(s) {
    sessionStorage.setItem('dp_admin_secret', s);
    setSecret(s);
  }

  if (!secret) return <SecretGate onUnlock={handleUnlock} />;
  return <AdminPanel secret={secret} />;
}
