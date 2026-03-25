import { useState } from 'react';
import { initiateCall } from '../hooks/useCalls';

export default function InitiateCallModal({ onClose, onSuccess }) {
  const [customerNumber, setCustomerNumber] = useState('');
  const [agentNumber, setAgentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await initiateCall(customerNumber, agentNumber);
    setResult(res);
    setLoading(false);
    if (res.status === 'Success' || res.status === 'success') {
      setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-white">Initiate Call</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Customer Number *</label>
            <input
              type="tel"
              value={customerNumber}
              onChange={e => setCustomerNumber(e.target.value)}
              placeholder="e.g. 7289883050"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Agent Number (optional)</label>
            <input
              type="tel"
              value={agentNumber}
              onChange={e => setAgentNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.status === 'Success' || result.status === 'success'
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}>
              {result.message || JSON.stringify(result)}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Calling...' : 'Call Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
