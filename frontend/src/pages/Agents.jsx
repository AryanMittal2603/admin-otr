import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

function useAgents(token) {
  const [agents,  setAgents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/agents`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export default function Agents() {
  const { token } = useAuth();
  const { agents, loading, error, refetch } = useAgents(token);
  const [modal,        setModal]        = useState(null);  // null | { mode: 'create' | 'edit', agent? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget,  setResetTarget]  = useState(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agents</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">{agents.length} registered agents</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10"/>
          </svg>
          Add Agent
        </button>
      </div>

      {/* Table */}
      {error ? (
        <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
      ) : loading ? (
        <div className="text-center py-16 text-slate-400 dark:text-zinc-500">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-zinc-500">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM6 8a2 2 0 11-4 0 2 2 0 014 0zM10 13a4 4 0 014 4v1H6v-1a4 4 0 014-4z"/>
          </svg>
          <p className="text-sm font-medium">No agents yet</p>
          <p className="text-xs mt-1">Click "Add Agent" to create the first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Agent Name</th>
                <th className="px-4 py-3 font-semibold">Agent Number</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Password</th>
                <th className="px-4 py-3 font-semibold w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-t border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 dark:text-zinc-100 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 tabular-nums">{agent.agent_number}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-zinc-400 text-xs">
                    {agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {agent.must_change_password
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Default</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Custom</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => setModal({ mode: 'edit', agent })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
                        </svg>
                      </button>
                      {/* Reset Password */}
                      <button
                        onClick={() => setResetTarget(agent)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Reset Password"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                          <path d="M5 7V5a3 3 0 016 0v2"/>
                          <circle cx="8" cy="11" r="1"/>
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(agent)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <AgentModal
          mode={modal.mode}
          agent={modal.agent}
          token={token}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refetch(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          agent={deleteTarget}
          token={token}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { setDeleteTarget(null); refetch(); }}
        />
      )}

      {/* Reset password confirm */}
      {resetTarget && (
        <ResetPasswordConfirm
          agent={resetTarget}
          token={token}
          onClose={() => setResetTarget(null)}
          onSuccess={() => { setResetTarget(null); refetch(); }}
        />
      )}
    </div>
  );
}

// ── Agent Create / Edit Modal ─────────────────────────────────────────────────

function AgentModal({ mode, agent, token, onClose, onSuccess }) {
  const [name,         setName]        = useState(agent?.name         ?? '');
  const [agent_number, setAgentNumber] = useState(agent?.agent_number ?? '');
  const [error,        setError]       = useState('');
  const [loading,      setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url    = mode === 'create' ? `${API}/api/agents` : `${API}/api/agents/${agent.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, agent_number }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Request failed'); return; }
      onSuccess();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            {mode === 'create' ? 'Add Agent' : 'Edit Agent'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {mode === 'create' && (
          <div className="mb-4 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">Default password will be the agent's number. They will be prompted to set a new password on first login.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Agent Name *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma" required
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Agent Number *</label>
            <input
              type="text" value={agent_number} onChange={e => setAgentNumber(e.target.value)}
              placeholder="e.g. 9876543210" required
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : mode === 'create' ? 'Create Agent' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ agent, token, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agents/${agent.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Delete failed'); return; }
      onSuccess();
    } catch { setError('Network error'); }
    finally  { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-2">Delete Agent</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          Are you sure you want to delete <span className="font-medium text-slate-700 dark:text-zinc-200">{agent.name}</span> ({agent.agent_number})? This cannot be undone.
        </p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Confirm ────────────────────────────────────────────────────

function ResetPasswordConfirm({ agent, token, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleReset() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agents/${agent.id}/reset-password`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Reset failed'); return; }
      onSuccess();
    } catch { setError('Network error'); }
    finally  { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-2">Reset Password</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          Reset password for <span className="font-medium text-slate-700 dark:text-zinc-200">{agent.name}</span>? Their password will be reset to their agent number <span className="font-mono font-medium text-slate-700 dark:text-zinc-200">{agent.agent_number}</span> and they will be required to set a new one on next login.
        </p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm">Cancel</button>
          <button onClick={handleReset} disabled={loading} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
