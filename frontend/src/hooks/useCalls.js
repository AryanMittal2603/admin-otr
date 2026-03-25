import { useState, useEffect, useCallback } from 'react';

// Empty string = same origin (Vercel production). Local dev uses the .env value.
const API = import.meta.env.VITE_API_URL ?? '';

export function useCalls({ search, limit = 100, offset = 0 } = {}) {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit, offset });
      if (search) params.append('search', search);

      const res = await fetch(`${API}/api/calls?${params}`);
      const data = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, limit, offset]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 15000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  return { calls, total, loading, error, refetch: fetchCalls };
}

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/calls/stats/summary`);
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail for stats
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export async function initiateCall(customer_number, agent_number) {
  const res = await fetch(`${API}/api/calls/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_number, agent_number }),
  });
  return res.json();
}

export async function deleteCall(id) {
  const res = await fetch(`${API}/api/calls/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function insertTestCall() {
  const res = await fetch(`${API}/api/webhook/test`, { method: 'POST' });
  return res.json();
}
