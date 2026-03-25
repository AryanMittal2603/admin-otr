const { initDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = await initDb();
  const payload = req.body || {};

  console.log('[Webhook received]', JSON.stringify(payload));

  // Normalize keys to lowercase
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id:           p.call_id || p.callid || p.uid || `wb_${Date.now()}`,
    caller_number:     p.caller_number || p.callernumber || p.caller || '',
    called_number:     p.called_number || p.callednumber || p.customer_number || p.mobile || p.to || '',
    agent_number:      p.agent_number || p.agentnumber || p.agent || '',
    agent_name:        p.agent_name || p.agentname || p.account || '',
    call_start_time:   p.call_start_time || p.callstarttime || p.start_time || p.starttime || '',
    agent_answer_time: p.agent_answer_time || p.agentanswertime || p.answer_time || '',
    call_end_time:     p.call_end_time || p.callendtime || p.end_time || p.endtime || '',
    duration:          parseInt(p.duration || p.call_duration || 0) || 0,
    call_recording:    p.call_recording || p.callrecording || p.recording_url || p.recording || p.recurl || '',
    agent_duration:    parseInt(p.agent_duration || p.agentduration || 0) || 0,
    raw_payload:       JSON.stringify(payload),
  };

  await db.query(`
    INSERT INTO calls
      (call_id, caller_number, called_number, agent_number, agent_name,
       call_start_time, agent_answer_time, call_end_time, duration,
       call_recording, agent_duration, raw_payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (call_id) DO UPDATE SET
      caller_number     = COALESCE(NULLIF(EXCLUDED.caller_number,''), calls.caller_number),
      called_number     = COALESCE(NULLIF(EXCLUDED.called_number,''), calls.called_number),
      agent_number      = COALESCE(NULLIF(EXCLUDED.agent_number,''), calls.agent_number),
      agent_name        = COALESCE(NULLIF(EXCLUDED.agent_name,''), calls.agent_name),
      call_start_time   = COALESCE(NULLIF(EXCLUDED.call_start_time,''), calls.call_start_time),
      agent_answer_time = COALESCE(NULLIF(EXCLUDED.agent_answer_time,''), calls.agent_answer_time),
      call_end_time     = COALESCE(NULLIF(EXCLUDED.call_end_time,''), calls.call_end_time),
      duration          = CASE WHEN EXCLUDED.duration > 0 THEN EXCLUDED.duration ELSE calls.duration END,
      call_recording    = COALESCE(NULLIF(EXCLUDED.call_recording,''), calls.call_recording),
      agent_duration    = CASE WHEN EXCLUDED.agent_duration > 0 THEN EXCLUDED.agent_duration ELSE calls.agent_duration END,
      raw_payload       = EXCLUDED.raw_payload
  `, [
    call.call_id, call.caller_number, call.called_number, call.agent_number, call.agent_name,
    call.call_start_time, call.agent_answer_time, call.call_end_time, call.duration,
    call.call_recording, call.agent_duration, call.raw_payload,
  ]);

  res.json({ status: 'ok', call_id: call.call_id });
};
