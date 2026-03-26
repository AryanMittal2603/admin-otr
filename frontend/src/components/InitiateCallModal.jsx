import { useState } from 'react';
import { initiateCall } from '../hooks/useCalls';
import { useAuth } from '../contexts/AuthContext';

export default function InitiateCallModal({ onClose, onSuccess }) {
  const { token } = useAuth();
  const [customerNumber, setCustomerNumber] = useState('');
  const [agentNumber, setAgentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await initiateCall(customerNumber, agentNumber, token);
    setResult(res);
    setLoading(false);
    if (res.status === 'Success' || res.status === 'success') {
      setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl w-full max-w-md p-6 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Initiate Call</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">Customer Number *</label>
            <input
              type="tel"
              value={customerNumber}
              onChange={e => setCustomerNumber(e.target.value)}
              placeholder="e.g. 7289883050"
              required
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">Agent Number (optional)</label>
            <input
              type="tel"
              value={agentNumber}
              onChange={e => setAgentNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.status === 'Success' || result.status === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {result.message || JSON.stringify(result)}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Calling...' : 'Call Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
