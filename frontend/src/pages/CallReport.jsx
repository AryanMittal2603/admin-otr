import { useState } from 'react';
import { useCalls } from '../hooks/useCalls';
import { useAuth } from '../contexts/AuthContext';
import CallsTable from '../components/CallsTable';

const PAGE_SIZE   = 25;
const STATUS_TABS = [
  { value: '',         label: 'All'      },
  { value: 'received', label: 'Received' },
  { value: 'missed',   label: 'Missed'   },
];

export default function CallReport() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const { token, isAdmin, user } = useAuth();

  const { calls, total, loading, error, refetch } = useCalls({ search, status, page, pageSize: PAGE_SIZE, token });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearch(e) { setSearch(e.target.value); setPage(1); }
  function handleStatus(val) { setStatus(val); setPage(1); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Call Report</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
            {total} total records · auto-refreshes every 5s
          </p>
        </div>
        <button
          onClick={refetch}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm transition-colors self-start"
        >
          Refresh
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 lg:max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search caller, called, agent name or number…"
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800/60 rounded-lg p-1 self-start">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleStatus(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                status === tab.value
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="text-center py-16 text-red-500 dark:text-red-400">
          <p className="text-lg font-medium">Failed to connect to backend</p>
          <p className="text-sm mt-1 text-slate-500 dark:text-zinc-500">{error}</p>
        </div>
      ) : loading && calls.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-zinc-500">Loading…</div>
      ) : (
        <CallsTable
          key={`${search}|${status}|${page}`}
          calls={calls}
          hasFilters={!!(search || status)}
          isAgent={!isAdmin}
          agentNumber={user?.agent_number}
          token={token}
        />
      )}

      {/* Pagination */}
      {!error && total > 0 && (
        <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <PagBtn onClick={() => setPage(1)} disabled={page === 1} title="First">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v10M6 8l5-4v8L6 8z"/></svg>
              </PagBtn>
              <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
              </PagBtn>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="w-8 text-center text-sm text-slate-400 dark:text-zinc-500">…</span>
                ) : (
                  <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PagBtn>
                )
              )}
              <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Next">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5"/></svg>
              </PagBtn>
              <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Last">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3v10M10 8L5 4v8l5-4z"/></svg>
              </PagBtn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PagBtn({ children, onClick, disabled, active, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
        active
          ? 'bg-indigo-600 text-white font-semibold'
          : disabled
            ? 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
            : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}
