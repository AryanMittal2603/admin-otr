const { initDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await initDb();
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM calls WHERE id = $1 OR call_id = $2', [id, id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { rowCount } = await db.query('DELETE FROM calls WHERE id = $1', [Number(id)]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
