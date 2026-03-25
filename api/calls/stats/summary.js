const { getDb } = require('../../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const col = db.collection('calls');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, recorded, today, [agg]] = await Promise.all([
    col.countDocuments(),
    col.countDocuments({ call_recording: { $exists: true, $ne: '' } }),
    col.countDocuments({ created_at: { $gte: startOfDay } }),
    col.aggregate([
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          avgAgentDuration: { $avg: '$agent_duration' },
        },
      },
    ]).toArray(),
  ]);

  res.json({
    total,
    recorded,
    today,
    avgDuration: Math.round(agg?.avgDuration || 0),
    avgAgentDuration: Math.round(agg?.avgAgentDuration || 0),
  });
};
