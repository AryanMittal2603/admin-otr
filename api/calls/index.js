const { getDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const { search, limit = '100', offset = '0' } = req.query;

  const filter = search ? {
    $or: [
      { called_number: { $regex: search, $options: 'i' } },
      { caller_number: { $regex: search, $options: 'i' } },
      { agent_name: { $regex: search, $options: 'i' } },
      { call_id: { $regex: search, $options: 'i' } },
    ],
  } : {};

  const [docs, total] = await Promise.all([
    db.collection('calls')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray(),
    db.collection('calls').countDocuments(filter),
  ]);

  const calls = docs.map(({ _id, ...doc }) => ({ id: _id.toString(), ...doc }));
  res.json({ calls, total });
};
