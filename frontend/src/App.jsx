import { useState } from 'react';
import { useCalls, useStats, insertTestCall } from './hooks/useCalls';
import StatsBar from './components/StatsBar';
import CallsTable from './components/CallsTable';
import InitiateCallModal from './components/InitiateCallModal';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { calls, total, loading, error, refetch } = useCalls({ search, status: statusFilter });
  const { stats, refetch: refetchStats } = useStats();

  function handleRefresh() {
    refetch();
    refetchStats();
  }

  async function handleTestCall() {
    await insertTestCall();
    handleRefresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      {showModal && (
        <InitiateCallModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRefresh}
        />
      )}

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Call Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {total} total records · auto-refreshes every 15s
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleTestCall}
              className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
            >
              + Test Entry
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Initiate Call
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by number or call ID..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="ANSWER">Answered</option>
            <option value="missed">Missed</option>
            <option value="NO ANSWER">No Answer</option>
            <option value="failed">Failed</option>
            <option value="initiated">Initiated</option>
            <option value="ringing">Ringing</option>
          </select>
        </div>

        {/* Table */}
        {error ? (
          <div className="text-center py-16 text-red-400">
            <p className="text-lg font-medium">Failed to connect to backend</p>
            <p className="text-sm mt-1 text-zinc-500">{error}</p>
            <p className="text-sm mt-2 text-zinc-600">Make sure the backend is running on port 3001</p>
          </div>
        ) : loading && calls.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">Loading...</div>
        ) : (
          <CallsTable calls={calls} onRefetch={handleRefresh} />
        )}
      </div>
    </div>
  );
}
