import { useState, useEffect, useCallback, useRef } from 'react';

const API = import.meta.env.VITE_API_URL ?? '';

export function useCalls({ search, status, page = 1, pageSize = 25, token } = {}) {
  const [calls, setCalls]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const isFirstLoad = useRef(true);

  const offset = (page - 1) * pageSize;

  const fetchCalls = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: pageSize, offset });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res  = await fetch(`${API}/api/calls?${params}`, { headers });
      const data = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [search, status, page, pageSize, offset, token]);

  // Show spinner again when filters change
  useEffect(() => {
    isFirstLoad.current = true;
  }, [search, status, page]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  return { calls, total, loading, error, refetch: fetchCalls };
}

export function useStats(token) {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res  = await fetch(`${API}/api/calls/stats/summary`, { headers });
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export async function initiateCall(customer_number, agent_number, token) {
  const res = await fetch(`${API}/api/calls/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ customer_number, agent_number }),
  });
  return res.json();
}

// Polls for 20 seconds (every 3s) to see if a click2call webhook landed for the number.
// Calls onConfirmed() if found, onTimeout() if not found within the window.
export function pollClick2Call(customerNumber, since, token, { onConfirmed, onTimeout }) {
  const INTERVAL = 3000;
  const TIMEOUT  = 20000;
  const headers  = token ? { Authorization: `Bearer ${token}` } : {};
  let elapsed    = 0;

  const interval = setInterval(async () => {
    elapsed += INTERVAL;
    try {
      const res  = await fetch(`${API}/api/calls/click2call/check?number=${encodeURIComponent(customerNumber)}&since=${since}`, { headers });
      const data = await res.json();
      if (data.found) {
        clearInterval(interval);
        onConfirmed();
        return;
      }
    } catch { /* network blip — keep polling */ }

    if (elapsed >= TIMEOUT) {
      clearInterval(interval);
      onTimeout();
    }
  }, INTERVAL);

  return () => clearInterval(interval); // returns cleanup fn
}

export async function deleteCall(id) {
  const res = await fetch(`${API}/api/calls/${id}`, { method: 'DELETE' });
  return res.json();
}
