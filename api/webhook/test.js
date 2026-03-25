const { getDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const callId = `test_${Date.now()}`;

  await db.collection('calls').insertOne({
    call_id:           callId,
    caller_number:     '9657509666',
    called_number:     '9289904559',
    agent_number:      '9654639649',
    agent_name:        'seqrview',
    call_start_time:   '2026-03-20 12:48:34',
    agent_answer_time: '2026-03-20 12:49:52',
    call_end_time:     '2026-03-20 12:51:58',
    duration:          408,
    call_recording:    '',
    agent_duration:    126,
    raw_payload:       JSON.stringify({ note: 'test entry' }),
    created_at:        new Date(),
  });

  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
};
