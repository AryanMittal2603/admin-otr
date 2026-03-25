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

  // Normalize keys to lowercase for case-insensitive matching
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id: p.call_id || p.callid || p.uid || p.id || `wb_${Date.now()}`,
    status: p.status || p.call_status || p.dial_status || 'unknown',
    customer_number: p.customer_number || p.cust_number || p.mobile || p.customer || p.to || '',
    agent_number: p.agent_number || p.agent || p.agentno || p.from || '',
    caller_number: p.caller_number || p.caller || p.from || '',
    duration: parseInt(p.duration || p.call_duration || p.callduration || 0) || 0,
    recording_url: p.recording_url || p.recordingurl || p.recurl || p.rec_url
                || p.recording || p.callrecording || p.call_recording
                || p.recordingfile || p.audio_url || p.file_url || '',
    start_time: p.start_time || p.starttime || p.call_start || p.callstart || '',
    end_time: p.end_time || p.endtime || p.call_end || p.callend || '',
    call_type: p.call_type || p.calltype || p.type || '',
    dial_status: p.dial_status || p.dialstatus || p.callstatus || '',
    hangup_cause: p.hangup_cause || p.hangup || p.hangupcause || '',
    direction: p.direction || 'outbound',
    raw_payload: JSON.stringify(payload),
  };

  await db.query(`
    INSERT INTO calls
      (call_id, status, customer_number, agent_number, caller_number, duration,
       recording_url, start_time, end_time, call_type, dial_status, hangup_cause,
       direction, raw_payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (call_id) DO UPDATE SET
      status = EXCLUDED.status,
      duration = CASE WHEN EXCLUDED.duration > 0 THEN EXCLUDED.duration ELSE calls.duration END,
      recording_url = CASE WHEN EXCLUDED.recording_url != '' THEN EXCLUDED.recording_url ELSE calls.recording_url END,
      end_time = CASE WHEN EXCLUDED.end_time != '' THEN EXCLUDED.end_time ELSE calls.end_time END,
      dial_status = CASE WHEN EXCLUDED.dial_status != '' THEN EXCLUDED.dial_status ELSE calls.dial_status END,
      hangup_cause = CASE WHEN EXCLUDED.hangup_cause != '' THEN EXCLUDED.hangup_cause ELSE calls.hangup_cause END,
      raw_payload = EXCLUDED.raw_payload
  `, [
    call.call_id, call.status, call.customer_number, call.agent_number, call.caller_number,
    call.duration, call.recording_url, call.start_time, call.end_time, call.call_type,
    call.dial_status, call.hangup_cause, call.direction, call.raw_payload,
  ]);

  res.json({ status: 'ok', call_id: call.call_id });
};
