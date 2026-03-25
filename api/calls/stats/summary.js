const { initDb } = require('../../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = await initDb();

  const { rows: [{ count: total }] } = await db.query('SELECT COUNT(*) as count FROM calls');
  const { rows: [{ count: recorded }] } = await db.query("SELECT COUNT(*) as count FROM calls WHERE call_recording IS NOT NULL AND call_recording != ''");
  const { rows: [{ avg }] } = await db.query('SELECT AVG(duration) as avg FROM calls WHERE duration > 0');
  const { rows: [{ count: today }] } = await db.query("SELECT COUNT(*) as count FROM calls WHERE created_at::date = CURRENT_DATE");
  const { rows: [{ avg: avg_agent }] } = await db.query('SELECT AVG(agent_duration) as avg FROM calls WHERE agent_duration > 0');

  res.json({
    total: Number(total),
    recorded: Number(recorded),
    avgDuration: Math.round(Number(avg) || 0),
    avgAgentDuration: Math.round(Number(avg_agent) || 0),
    today: Number(today),
  });
};
