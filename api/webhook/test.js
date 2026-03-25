const { initDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await initDb();
  const callId = `test_${Date.now()}`;

  await db.query(`
    INSERT INTO calls
      (call_id, status, customer_number, agent_number, caller_number, duration,
       recording_url, start_time, end_time, call_type, dial_status, hangup_cause,
       direction, raw_payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (call_id) DO NOTHING
  `, [
    callId, 'completed', '7289883050', '9876543210', '9876543210',
    120, '', new Date().toISOString(), new Date(Date.now() + 120000).toISOString(),
    'click_to_call', 'ANSWER', 'NORMAL_CLEARING', 'outbound', '{"note":"test entry"}',
  ]);

  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
};
