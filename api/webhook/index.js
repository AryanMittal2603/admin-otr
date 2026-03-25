const { getDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await getDb();
  const payload = req.body || {};

  console.log('[Webhook received]', JSON.stringify(payload));

  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id:           p.call_id || p.callid || p.uid || `wb_${Date.now()}`,
    caller_number:     p.caller_number || p.callernumber || p.caller || '',
    called_number:     p.called_number || p.callednumber || p.customer_number || p.mobile || p.to || '',
    agent_number:      p.agent_number || p.agentnumber || p.agent || '',
    agent_name:        p.agent_name || p.agentname || p.account || '',
    call_start_time:   p.call_start_time || p.callstarttime || p.start_time || '',
    agent_answer_time: p.agent_answer_time || p.agentanswertime || p.answer_time || '',
    call_end_time:     p.call_end_time || p.callendtime || p.end_time || '',
    duration:          parseInt(p.duration || p.call_duration || 0) || 0,
    call_recording:    p.call_recording || p.callrecording || p.recording_url || p.recording || '',
    agent_duration:    parseInt(p.agent_duration || p.agentduration || 0) || 0,
    raw_payload:       JSON.stringify(payload),
  };

  try {
    // First insert attempt
    await db.collection('calls').insertOne({ ...call, created_at: new Date() });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate call_id — update only non-empty fields
      const updates = { raw_payload: call.raw_payload };
      for (const [key, val] of Object.entries(call)) {
        if (key === 'call_id') continue;
        if (typeof val === 'string' && val !== '') updates[key] = val;
        if (typeof val === 'number' && val > 0) updates[key] = val;
      }
      await db.collection('calls').updateOne({ call_id: call.call_id }, { $set: updates });
    } else {
      throw err;
    }
  }

  res.json({ status: 'ok', call_id: call.call_id });
};
