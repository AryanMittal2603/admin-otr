const { initDb } = require('../../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = await initDb();

  const { rows: [{ count: total }] } = await db.query('SELECT COUNT(*) as count FROM calls');
  const { rows: byStatus } = await db.query('SELECT status, COUNT(*) as count FROM calls GROUP BY status');
  const { rows: [{ avg }] } = await db.query('SELECT AVG(duration) as avg FROM calls WHERE duration > 0');
  const { rows: [{ count: today }] } = await db.query("SELECT COUNT(*) as count FROM calls WHERE created_at::date = CURRENT_DATE");

  res.json({
    total: Number(total),
    byStatus: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
    avgDuration: Math.round(Number(avg) || 0),
    today: Number(today),
  });
};
