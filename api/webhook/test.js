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
      (call_id, caller_number, called_number, agent_number, agent_name,
       call_start_time, agent_answer_time, call_end_time, duration,
       call_recording, agent_duration, raw_payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (call_id) DO NOTHING
  `, [
    callId, '9657509666', '9289904559', '9654639649', 'seqrview',
    '2026-03-20 12:48:34', '2026-03-20 12:49:52', '2026-03-20 12:51:58',
    408, '', 126, '{"note":"test entry"}',
  ]);

  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
};
