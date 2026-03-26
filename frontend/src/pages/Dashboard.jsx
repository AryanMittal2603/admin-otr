import { useState } from 'react';
import { useStats, initiateCall, pollClick2Call } from '../hooks/useCalls';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import InitiateCallModal from '../components/InitiateCallModal';

const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'light' };

function fmtDuration(s) {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function DonutChart({ received = 0, missed = 0, total = 0 }) {
  const R = 48;
  const C = 2 * Math.PI * R;
  const recDash = total > 0 ? (received / total) * C : 0;
  const misDash = total > 0 ? (missed  / total) * C : 0;
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="16" className="dark:hidden" />
      <circle cx="60" cy="60" r={R} fill="none" stroke="#27272a" strokeWidth="16" className="hidden dark:block" />
      {total > 0 && (
        <>
          <circle cx="60" cy="60" r={R} fill="none" stroke="#f87171" strokeWidth="16"
            strokeDasharray={`${misDash} ${C}`} strokeDashoffset={-recDash}
            transform="rotate(-90 60 60)" />
          <circle cx="60" cy="60" r={R} fill="none" stroke="#34d399" strokeWidth="16"
            strokeDasharray={`${recDash} ${C}`}
            transform="rotate(-90 60 60)" />
        </>
      )}
      <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">{total}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#94a3b8">Total</text>
    </svg>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-4 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wide font-medium">{label}</p>
        <span className="text-slate-300 dark:text-zinc-700">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [showModal, setShowModal]     = useState(false);
  const [dialState,  setDialState]    = useState({}); // { [id]: 'loading'|'success'|'error' }
  const [calledOut,  setCalledOut]    = useState(new Set()); // ids successfully dialled
  const { theme, setTheme }           = useTheme();
  const { token, isAdmin, user }      = useAuth();
  const { stats, refetch: refetchStats } = useStats(token);

  const s = stats ?? {};

  async function handleDial(call) {
    setDialState(s => ({ ...s, [call.id]: 'loading' }));
    try {
      const since = Date.now();
      const res   = await initiateCall(call.caller_number, user?.agent_number, token);
      const ok    = res.status === 'Success' || res.status === 'success';
      if (!ok) {
        setDialState(s => ({ ...s, [call.id]: 'error' }));
        setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 3000);
        return;
      }
      setDialState(s => ({ ...s, [call.id]: 'polling' }));
      pollClick2Call(call.caller_number, since, token, {
        onConfirmed: () => {
          setCalledOut(prev => new Set([...prev, call.id]));
        },
        onTimeout: () => {
          setDialState(s => ({ ...s, [call.id]: 'initiated' }));
          setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 4000);
        },
      });
    } catch {
      setDialState(s => ({ ...s, [call.id]: 'error' }));
      setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 3000);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {showModal && (
        <InitiateCallModal onClose={() => setShowModal(false)} onSuccess={refetchStats} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">Overview · auto-refreshes every 5s</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTheme(THEME_CYCLE[theme])}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm transition-colors"
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button
            onClick={refetchStats}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm transition-colors"
          >
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Initiate Call
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className={`grid grid-cols-2 gap-3 mb-6 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
        <StatCard label="Total Calls" value={s.total ?? '—'}        color="text-indigo-600 dark:text-indigo-400"   icon={<PhoneIcon />} />
        <StatCard label="Received"    value={s.received ?? '—'}     color="text-emerald-600 dark:text-emerald-400" icon={<CheckIcon />} />
        <StatCard label="Missed"      value={s.missed ?? '—'}       color="text-red-500 dark:text-red-400"         icon={<MissedIcon />} />
        {!isAdmin && <StatCard label="Avg Duration" value={fmtDuration(s.avgDuration)} color="text-violet-600 dark:text-violet-400" icon={<ClockIcon />} />}
      </div>

      {/* Charts Row */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* Received vs Missed donut */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 transition-colors">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-4">Received vs Missed</p>
          <div className="flex items-center gap-6">
            <DonutChart received={s.received} missed={s.missed} total={s.total} />
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-500 dark:text-zinc-400">Received</span>
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 ml-4">{s.received ?? 0}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 ml-4">
                  {s.total > 0 ? Math.round((s.received / s.total) * 100) : 0}%
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-xs text-slate-500 dark:text-zinc-400">Missed</span>
                </div>
                <p className="text-xl font-bold text-red-500 dark:text-red-400 ml-4">{s.missed ?? 0}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 ml-4">
                  {s.total > 0 ? Math.round((s.missed / s.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Avg Call Duration with per-agent breakdown — admin only */}
        {isAdmin && <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 transition-colors flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Avg Call Duration</p>
            <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">{fmtDuration(s.avgDuration)}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-wide">By agent</p>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-36">
            {(s.avgDurationByAgent ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-2">No data</p>
            ) : (s.avgDurationByAgent ?? []).map(a => {
              const max = s.avgDurationByAgent[0]?.avgDuration || 1;
              const pct = Math.round((a.avgDuration / max) * 100);
              return (
                <div key={a.agent_number}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-slate-600 dark:text-zinc-300 truncate">{a.agent_name}</span>
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0 ml-2">{fmtDuration(a.avgDuration)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 dark:bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Today summary — admin only */}
        {isAdmin && <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 transition-colors flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Today's Received</p>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{s.today ?? '—'}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-wide">Received by agent</p>
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-36">
            {(s.todayByAgent ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-2">No received calls today</p>
            ) : (s.todayByAgent ?? []).map(a => (
              <div key={a.agent_number} className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 dark:text-zinc-300 truncate">{a.agent_name}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{a.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between text-xs text-slate-400 dark:text-zinc-500">
            <span>With Recording</span>
            <span className="font-medium text-sky-600 dark:text-sky-400">{s.recorded ?? 0}</span>
          </div>
        </div>}
      </div>

      {/* Latest Call Record */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Latest Missed Call</p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('call-report')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all →
            </button>
          )}
        </div>
        {(s.latestMissed ?? []).filter(c => !calledOut.has(c.id)).length > 0 ? (
          <LatestMissedTable calls={(s.latestMissed ?? []).filter(c => !calledOut.has(c.id))} dialState={dialState} onDial={handleDial} />
        ) : (
          <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">No missed calls</p>
        )}
      </div>
    </div>
  );
}

function DurationBar({ label, value, color, max }) {
  const reference = max != null ? max : value;
  const pct = reference > 0 ? Math.min(100, Math.round((value / reference) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500 dark:text-zinc-400">{label}</span>
        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{fmtDuration(value)}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LatestMissedTable({ calls, dialState, onDial }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-zinc-800">
            {['Caller', 'Called', 'Agent', 'Time', 'Duration', 'Category', ''].map(h => (
              <th key={h} className="pb-2 pr-4 text-left text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calls.map(call => {
            const state = dialState[call.id];
            return (
              <tr key={call.id} className="border-b border-slate-50 dark:border-zinc-800/50 last:border-0">
                <td className="py-2.5 pr-4 text-slate-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">{call.caller_number || '—'}</td>
                <td className="py-2.5 pr-4 text-slate-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">{call.called_number || '—'}</td>
                <td className="py-2.5 pr-4 text-slate-700 dark:text-zinc-300 whitespace-nowrap">{call.agent_name || '—'}</td>
                <td className="py-2.5 pr-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs">{fmtDate(call.call_start_time || call.created_at)}</td>
                <td className="py-2.5 pr-4 text-slate-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">{call.duration ? fmtDuration(call.duration) : '—'}</td>
                <td className="py-2.5 pr-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">{call.category || '—'}</td>
                <td className="py-2.5">
                  <button
                    onClick={() => onDial(call)}
                    disabled={state === 'loading' || state === 'polling'}
                    title={
                      state === 'polling'   ? 'Waiting for confirmation…' :
                      state === 'connected' ? 'Call connected!' :
                      state === 'initiated' ? 'Call initiated (no webhook yet)' :
                      `Call back ${call.caller_number}`
                    }
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      state === 'connected' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      state === 'initiated' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' :
                      state === 'error'     ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                      state === 'loading' || state === 'polling' ? 'text-slate-300 dark:text-zinc-600 cursor-wait' :
                      'text-slate-400 dark:text-zinc-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {state === 'loading' ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25" strokeDashoffset="6"/>
                      </svg>
                    ) : state === 'polling' ? (
                      <svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="2"/><path d="M4 8a4 4 0 008 0M2 8a6 6 0 0012 0"/>
                      </svg>
                    ) : state === 'connected' ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7"/></svg>
                    ) : state === 'initiated' ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/>
                      </svg>
                    ) : state === 'error' ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5A1.5 1.5 0 013.5 2h.879a1 1 0 01.958.713l.66 2.2a1 1 0 01-.23 1.002L4.5 6.5s1 2 5 5l1.085-1.267a1 1 0 011.003-.23l2.2.66A1 1 0 0114 11.62V12.5A1.5 1.5 0 0112.5 14C6.7 14 2 9.3 2 3.5z"/></svg>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PhoneIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5A1.5 1.5 0 013.5 2h.879a1 1 0 01.958.713l.66 2.2a1 1 0 01-.23 1.002L4.5 6.5s1 2 5 5l1.085-1.267a1 1 0 011.003-.23l2.2.66A1 1 0 0114 11.62V12.5A1.5 1.5 0 0112.5 14C6.7 14 2 9.3 2 3.5z"/></svg>;
}
function CheckIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6 11 3 8"/></svg>;
}
function MissedIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l10 10M13 4L6 11 3 8"/></svg>;
}
function ClockIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>;
}
