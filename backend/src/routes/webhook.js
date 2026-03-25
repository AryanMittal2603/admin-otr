const express = require('express');
const db = require('../db');

const router = express.Router();

// POST - receive call event from BuzzDial webhook
router.post('/', (req, res) => {
  const payload = req.body;

  console.log('[Webhook received]', JSON.stringify(payload, null, 2));

  // Normalize keys to lowercase for case-insensitive matching
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id: p.call_id || p.callid || p.uid || p.id || `manual_${Date.now()}`,
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

  try {
    db.prepare(`
      INSERT INTO calls
        (call_id, status, customer_number, agent_number, caller_number, duration,
         recording_url, start_time, end_time, call_type, dial_status, hangup_cause,
         direction, raw_payload)
      VALUES
        (@call_id, @status, @customer_number, @agent_number, @caller_number, @duration,
         @recording_url, @start_time, @end_time, @call_type, @dial_status, @hangup_cause,
         @direction, @raw_payload)
      ON CONFLICT(call_id) DO UPDATE SET
        status = excluded.status,
        duration = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE calls.duration END,
        recording_url = CASE WHEN excluded.recording_url != '' THEN excluded.recording_url ELSE calls.recording_url END,
        end_time = CASE WHEN excluded.end_time != '' THEN excluded.end_time ELSE calls.end_time END,
        dial_status = CASE WHEN excluded.dial_status != '' THEN excluded.dial_status ELSE calls.dial_status END,
        hangup_cause = CASE WHEN excluded.hangup_cause != '' THEN excluded.hangup_cause ELSE calls.hangup_cause END,
        raw_payload = excluded.raw_payload
    `).run(call);

    res.json({ status: 'ok', call_id: call.call_id });
  } catch (err) {
    console.error('[Webhook DB error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET - test endpoint to manually insert a sample call (dev only)
router.post('/test', (req, res) => {
  const sample = {
    call_id: `test_${Date.now()}`,
    status: 'completed',
    customer_number: '7289883050',
    agent_number: '9876543210',
    caller_number: '9876543210',
    duration: 120,
    recording_url: '',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 120000).toISOString(),
    call_type: 'click_to_call',
    dial_status: 'ANSWER',
    hangup_cause: 'NORMAL_CLEARING',
    direction: 'outbound',
    raw_payload: JSON.stringify({ note: 'test entry' }),
  };

  db.prepare(`
    INSERT OR REPLACE INTO calls
      (call_id, status, customer_number, agent_number, caller_number, duration,
       recording_url, start_time, end_time, call_type, dial_status, hangup_cause,
       direction, raw_payload)
    VALUES
      (@call_id, @status, @customer_number, @agent_number, @caller_number, @duration,
       @recording_url, @start_time, @end_time, @call_type, @dial_status, @hangup_cause,
       @direction, @raw_payload)
  `).run(sample);

  res.json({ status: 'ok', message: 'Test call inserted', call_id: sample.call_id });
});

module.exports = router;
