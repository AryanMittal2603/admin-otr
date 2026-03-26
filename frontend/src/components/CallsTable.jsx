import { useState, Fragment } from 'react';
import AudioPlayer from './AudioPlayer';
import TranscriptionModal from './TranscriptionModal';
import { initiateCall, pollClick2Call } from '../hooks/useCalls';

const SYSTEM_NUMBER = '8037126236';

function formatDuration(sec) {
  if (!sec || sec === 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return str;
  }
}

function StatusBadge({ call }) {
  return call.agent_answer_time ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Received</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Missed</span>
  );
}

function TranscriptBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="View Transcription"
      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2"/>
        <path d="M5 6h6M5 9h4"/>
      </svg>
    </button>
  );
}

export default function CallsTable({ calls, hasFilters = false, isAgent = false, agentNumber, token }) {
  const [expanded,       setExpanded]       = useState(null);
  const [transcriptCall, setTranscriptCall] = useState(null);
  const [dialState,      setDialState]      = useState({});  // { [call.id]: 'loading'|'success'|'error' }

  async function handleDial(call) {
    setDialState(s => ({ ...s, [call.id]: 'loading' }));
    try {
      const since = Date.now();
      const res   = await initiateCall(call.caller_number, agentNumber, token);
      const ok    = res.status === 'Success' || res.status === 'success';
      if (!ok) {
        setDialState(s => ({ ...s, [call.id]: 'error' }));
        setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 3000);
        return;
      }
      // BuzzDial accepted — poll for webhook confirmation for 20s
      setDialState(s => ({ ...s, [call.id]: 'polling' }));
      pollClick2Call(call.caller_number, since, token, {
        onConfirmed: () => {
          setDialState(s => ({ ...s, [call.id]: 'connected' }));
          setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 4000);
        },
        onTimeout: () => {
          // BuzzDial said success but webhook didn't arrive — show initiated state
          setDialState(s => ({ ...s, [call.id]: 'initiated' }));
          setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 4000);
        },
      });
    } catch {
      setDialState(s => ({ ...s, [call.id]: 'error' }));
      setTimeout(() => setDialState(s => { const n = { ...s }; delete n[call.id]; return n; }), 3000);
    }
  }

  function DialBtn({ call }) {
    const isMissed = !call.agent_answer_time;
    if (!isMissed || call.caller_number === SYSTEM_NUMBER) return null;
    const state = dialState[call.id];
    return (
      <button
        onClick={e => { e.stopPropagation(); handleDial(call); }}
        disabled={state === 'loading'}
        title={`Call back ${call.caller_number}`}
        title={
          state === 'polling'   ? 'Waiting for confirmation…' :
          state === 'connected' ? 'Call connected!' :
          state === 'initiated' ? 'Call initiated (no webhook yet)' :
          `Call back ${call.caller_number}`
        }
        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
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
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 4"/>
          </svg>
        ) : state === 'initiated' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/>
          </svg>
        ) : state === 'error' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.654 1.328a.678.678 0 00-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 004.168 6.608 17.6 17.6 0 006.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 00-.063-1.015l-2.307-1.794a.678.678 0 00-.58-.122l-2.19.547a1.745 1.745 0 01-1.657-.459L5.482 8.062a1.745 1.745 0 01-.46-1.657l.548-2.19a.678.678 0 00-.122-.58L3.654 1.328z"/>
          </svg>
        )}
      </button>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 dark:text-zinc-500">
        <p className="text-4xl mb-3">{hasFilters ? '🔍' : '📞'}</p>
        <p className="text-lg font-medium">{hasFilters ? 'No matching records' : 'No call records yet'}</p>
        <p className="text-sm mt-1">
          {hasFilters
            ? 'Try adjusting your search or filter.'
            : 'Calls will appear here once BuzzDial sends webhook events.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {transcriptCall && (
        <TranscriptionModal call={transcriptCall} onClose={() => setTranscriptCall(null)} />
      )}

      {/* ── Mobile / Tablet card view (< lg) ── */}
      <div className="lg:hidden space-y-3">
        {calls.map(call => (
          <div
            key={call.id}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 transition-colors"
          >
            {/* Top row: numbers + status */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{call.caller_number || '—'}</span>
                    {call.caller_number === SYSTEM_NUMBER && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 text-center leading-none mt-0.5">System</p>
                    )}
                  </div>
                  <span className="text-slate-400 dark:text-zinc-500 text-xs">→</span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{call.called_number || '—'}</span>
                    {call.called_number === SYSTEM_NUMBER && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 text-center leading-none mt-0.5">System</p>
                    )}
                    {call.source === 'click2call' && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500">via Click2Call</p>
                    )}
                  </div>
                </div>
                {!isAgent && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{call.agent_name || '—'} · {call.agent_number || '—'}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge call={call} />
                <DialBtn call={call} />
              </div>
            </div>

            {/* Middle row: times + durations */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-slate-400 dark:text-zinc-500">Start</p>
                <p className="text-slate-700 dark:text-zinc-300">{formatDate(call.call_start_time || call.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-zinc-500">End</p>
                <p className="text-slate-700 dark:text-zinc-300">{formatDate(call.call_end_time)}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-zinc-500">Duration</p>
                <p className="text-slate-700 dark:text-zinc-300">{formatDuration(call.duration)}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-zinc-500">Agent Duration</p>
                <p className="text-slate-700 dark:text-zinc-300">{formatDuration(call.agent_duration)}</p>
              </div>
            </div>

            {/* Category / Sub-Category */}
            {(call.category || call.sub_category) && (
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <p className="text-slate-400 dark:text-zinc-500">Category</p>
                  <p className="text-slate-700 dark:text-zinc-300">{call.category || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-zinc-500">Sub-Category</p>
                  <p className="text-slate-700 dark:text-zinc-300">{call.sub_category || '—'}</p>
                </div>
              </div>
            )}

            {/* Recording + Transcription */}
            <div className="flex items-center gap-2">
              {call.call_recording ? (
                <>
                  <AudioPlayer src={call.call_recording} />
                  <TranscriptBtn onClick={() => setTranscriptCall(call)} />
                </>
              ) : (
                <p className="text-xs text-slate-300 dark:text-zinc-600">No recording</p>
              )}
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setExpanded(expanded === call.id ? null : call.id)}
              className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              {expanded === call.id ? 'Hide details' : 'Show details'}
            </button>

            {expanded === call.id && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {[
                    ['Call ID', call.call_id],
                    ['Answer Time', formatDate(call.agent_answer_time)],
                    ['Created At', formatDate(call.created_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-slate-400 dark:text-zinc-500">{label}</p>
                      <p className="text-slate-700 dark:text-zinc-300 break-all">{value || '—'}</p>
                    </div>
                  ))}
                </div>
                <details>
                  <summary className="text-xs text-slate-400 dark:text-zinc-500 cursor-pointer hover:text-slate-600 dark:hover:text-zinc-400">Raw Payload</summary>
                  <pre className="mt-2 text-xs bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 rounded overflow-x-auto text-slate-600 dark:text-zinc-400">
                    {call.raw_payload ? JSON.stringify(JSON.parse(call.raw_payload), null, 2) : '—'}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table view (lg+) ── */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 text-left text-xs uppercase tracking-wide">
              {['Caller', 'Called', ...(!isAgent ? ['Agent Name', 'Agent No.'] : []), 'Start Time', 'Answer Time', 'End Time', 'Duration', 'Agent Duration', 'Status', 'Category', 'Sub-Category', 'Recording', ''].map(h => (
                <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <Fragment key={call.id}>
                <tr
                  className="border-t border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                >
                  <td className="px-3 py-2">
                    <span className="text-slate-700 dark:text-zinc-300 font-medium tabular-nums">{call.caller_number || '—'}</span>
                    {call.caller_number === SYSTEM_NUMBER && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 text-center leading-none mt-0.5">System</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-slate-900 dark:text-zinc-200 font-medium tabular-nums">{call.called_number || '—'}</span>
                    {call.called_number === SYSTEM_NUMBER && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 text-center leading-none mt-0.5">System</p>
                    )}
                    {call.source === 'click2call' && (
                      <p className="text-xs text-indigo-400 dark:text-indigo-500 leading-none mt-0.5">via Click2Call</p>
                    )}
                  </td>
                  {!isAgent && <td className="px-3 py-2 text-slate-700 dark:text-zinc-300">{call.agent_name || '—'}</td>}
                  {!isAgent && <td className="px-3 py-2 text-slate-500 dark:text-zinc-400 tabular-nums">{call.agent_number || '—'}</td>}
                  <td className="px-3 py-2 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs">{formatDate(call.call_start_time || call.created_at)}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs">{formatDate(call.agent_answer_time)}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs">{formatDate(call.call_end_time)}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-zinc-300 tabular-nums">{formatDuration(call.duration)}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-zinc-300 tabular-nums">{formatDuration(call.agent_duration)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge call={call} />
                      <DialBtn call={call} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-zinc-300 text-xs whitespace-nowrap">{call.category || '—'}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-zinc-300 text-xs whitespace-nowrap">{call.sub_category || '—'}</td>
                  <td className="px-3 py-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
                    {call.call_recording ? (
                      <AudioPlayer src={call.call_recording} />
                    ) : (
                      <span className="text-slate-300 dark:text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    {call.call_recording && (
                      <TranscriptBtn onClick={() => setTranscriptCall(call)} />
                    )}
                  </td>
                </tr>
                {expanded === call.id && (
                  <tr className="border-t border-slate-100 dark:border-zinc-800/60 bg-slate-50/80 dark:bg-zinc-950">
                    <td colSpan={isAgent ? 12 : 14} className="px-4 py-4">
                      <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                        {[
                          ['Call ID',          call.call_id],
                          ['Caller Number',     call.caller_number],
                          ['Called Number',     call.called_number],
                          ['Agent Number',      call.agent_number],
                          ['Agent Name',        call.agent_name],
                          ['Call Start Time',   formatDate(call.call_start_time)],
                          ['Agent Answer Time', formatDate(call.agent_answer_time)],
                          ['Call End Time',     formatDate(call.call_end_time)],
                          ['Duration',          formatDuration(call.duration)],
                          ['Agent Duration',    formatDuration(call.agent_duration)],
                          ['Category',          call.category],
                          ['Sub-Category',      call.sub_category],
                          ['Created At',        formatDate(call.created_at)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">{label}</p>
                            <p className="text-sm text-slate-800 dark:text-zinc-200 font-medium break-all">{value || '—'}</p>
                          </div>
                        ))}
                      </div>
                      {call.call_recording && (
                        <div className="mb-4">
                          <p className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Recording</p>
                          <AudioPlayer src={call.call_recording} />
                        </div>
                      )}
                      <details>
                        <summary className="text-xs text-slate-400 dark:text-zinc-500 cursor-pointer hover:text-slate-600 dark:hover:text-zinc-400">Raw Payload</summary>
                        <pre className="mt-2 text-xs bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded overflow-x-auto text-slate-600 dark:text-zinc-400">
                          {call.raw_payload ? JSON.stringify(JSON.parse(call.raw_payload), null, 2) : '—'}
                        </pre>
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
