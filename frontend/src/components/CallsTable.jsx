import { useState } from 'react';
import { deleteCall } from '../hooks/useCalls';

const STATUS_COLORS = {
  completed: 'bg-green-900/50 text-green-400',
  ANSWER: 'bg-green-900/50 text-green-400',
  answered: 'bg-green-900/50 text-green-400',
  missed: 'bg-red-900/50 text-red-400',
  'NO ANSWER': 'bg-red-900/50 text-red-400',
  failed: 'bg-red-900/50 text-red-400',
  initiated: 'bg-blue-900/50 text-blue-400',
  ringing: 'bg-yellow-900/50 text-yellow-400',
  unknown: 'bg-zinc-800 text-zinc-400',
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-zinc-800 text-zinc-400';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  );
}

function formatDuration(sec) {
  if (!sec || sec === 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return str;
  }
}

export default function CallsTable({ calls, onRefetch }) {
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Delete this call record?')) return;
    setDeleting(id);
    await deleteCall(id);
    setDeleting(null);
    onRefetch();
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-4xl mb-3">📞</p>
        <p className="text-lg font-medium">No call records yet</p>
        <p className="text-sm mt-1">Calls will appear here once BuzzDial sends webhook events.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-left">
            {['Call ID', 'Status', 'Customer', 'Agent', 'Duration', 'Direction', 'Dial Status', 'Start Time', 'Recording', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <>
              <tr
                key={call.id}
                className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === call.id ? null : call.id)}
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-400 max-w-[140px] truncate">{call.call_id || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                <td className="px-4 py-3 text-zinc-200 font-medium">{call.customer_number || '—'}</td>
                <td className="px-4 py-3 text-zinc-300">{call.agent_number || '—'}</td>
                <td className="px-4 py-3 text-zinc-300">{formatDuration(call.duration)}</td>
                <td className="px-4 py-3 text-zinc-400 capitalize">{call.direction || '—'}</td>
                <td className="px-4 py-3">
                  {call.dial_status ? (
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{call.dial_status}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDate(call.start_time || call.created_at)}</td>
                <td className="px-4 py-3">
                  {call.recording_url ? (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300 underline text-xs"
                    >
                      Play
                    </a>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(call.id); }}
                    disabled={deleting === call.id}
                    className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40"
                  >
                    {deleting === call.id ? '...' : 'Delete'}
                  </button>
                </td>
              </tr>
              {expanded === call.id && (
                <tr key={`${call.id}-expanded`} className="border-t border-zinc-800 bg-zinc-950">
                  <td colSpan={10} className="px-4 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                      {[
                        ['Call ID', call.call_id],
                        ['Status', call.status],
                        ['Customer Number', call.customer_number],
                        ['Agent Number', call.agent_number],
                        ['Caller Number', call.caller_number],
                        ['Duration', formatDuration(call.duration)],
                        ['Direction', call.direction],
                        ['Call Type', call.call_type],
                        ['Dial Status', call.dial_status],
                        ['Hangup Cause', call.hangup_cause],
                        ['Start Time', formatDate(call.start_time)],
                        ['End Time', formatDate(call.end_time)],
                        ['Created At', formatDate(call.created_at)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                          <p className="text-sm text-zinc-200 font-medium">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                    {call.recording_url && (
                      <div className="mb-3">
                        <p className="text-xs text-zinc-500 mb-1">Recording</p>
                        <audio controls src={call.recording_url} className="w-full max-w-md" />
                      </div>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">Raw Payload</summary>
                      <pre className="mt-2 text-xs bg-zinc-900 p-3 rounded overflow-x-auto text-zinc-400">
                        {call.raw_payload ? JSON.stringify(JSON.parse(call.raw_payload), null, 2) : '—'}
                      </pre>
                    </details>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
