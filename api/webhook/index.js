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

  const call = {
    call_id: payload.call_id || payload.callid || payload.uid || payload.id || `wb_${Date.now()}`,
    status: payload.status || payload.call_status || payload.dial_status || 'unknown',
    customer_number: payload.customer_number || payload.cust_number || payload.mobile || payload.to || '',
    agent_number: payload.agent_number || payload.agent || payload.from || '',
    caller_number: payload.caller_number || payload.caller || payload.from || '',
    duration: parseInt(payload.duration || payload.call_duration || 0) || 0,
    recording_url: payload.recording_url || payload.recording || payload.record_url || '',
    start_time: payload.start_time || payload.starttime || payload.call_start || '',
    end_time: payload.end_time || payload.endtime || payload.call_end || '',
    call_type: payload.call_type || payload.type || '',
    dial_status: payload.dial_status || payload.dialstatus || '',
    hangup_cause: payload.hangup_cause || payload.hangup || '',
    direction: payload.direction || 'outbound',
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
      duration = EXCLUDED.duration,
      recording_url = EXCLUDED.recording_url,
      end_time = EXCLUDED.end_time,
      dial_status = EXCLUDED.dial_status,
      hangup_cause = EXCLUDED.hangup_cause,
      raw_payload = EXCLUDED.raw_payload
  `, [
    call.call_id, call.status, call.customer_number, call.agent_number, call.caller_number,
    call.duration, call.recording_url, call.start_time, call.end_time, call.call_type,
    call.dial_status, call.hangup_cause, call.direction, call.raw_payload,
  ]);

  res.json({ status: 'ok', call_id: call.call_id });
};
