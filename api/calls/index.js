const { initDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = await initDb();
  const { status, search, limit = '100', offset = '0' } = req.query;

  let query = 'SELECT * FROM calls';
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (search) {
    const idx = params.length;
    conditions.push(`(customer_number ILIKE $${idx + 1} OR agent_number ILIKE $${idx + 2} OR call_id ILIKE $${idx + 3})`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Number(limit), Number(offset));

  const { rows } = await db.query(query, params);
  const { rows: countRows } = await db.query('SELECT COUNT(*) as count FROM calls');

  res.json({ calls: rows, total: Number(countRows[0].count) });
};
