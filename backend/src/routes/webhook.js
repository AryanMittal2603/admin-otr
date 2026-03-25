const express = require('express');
const db = require('../db');

const router = express.Router();

// POST - receive call event from BuzzDial webhook
router.post('/', (req, res) => {
  const payload = req.body;

  console.log('[Webhook received]', JSON.stringify(payload, null, 2));

  // Normalize fields from BuzzDial webhook payload
  const call = {
    call_id: payload.call_id || payload.callid || payload.uid || payload.id || `manual_${Date.now()}`,
    status: payload.status || payload.call_status || payload.dial_status || 'unknown',
    customer_number: payload.customer_number || payload.cust_number || payload.mobile || payload.customer || payload.to || '',
    agent_number: payload.agent_number || payload.agent || payload.from || '',
    caller_number: payload.caller_number || payload.caller || payload.from || '',
    duration: parseInt(payload.duration || payload.call_duration || 0),
    recording_url: payload.recording_url || payload.recording || payload.record_url || '',
    start_time: payload.start_time || payload.starttime || payload.call_start || '',
    end_time: payload.end_time || payload.endtime || payload.call_end || '',
    call_type: payload.call_type || payload.type || '',
    dial_status: payload.dial_status || payload.dialstatus || '',
    hangup_cause: payload.hangup_cause || payload.hangup || '',
    direction: payload.direction || 'outbound',
    raw_payload: JSON.stringify(payload),
  };

  try {
    db.prepare(`
      INSERT OR REPLACE INTO calls
        (call_id, status, customer_number, agent_number, caller_number, duration,
         recording_url, start_time, end_time, call_type, dial_status, hangup_cause,
         direction, raw_payload)
      VALUES
        (@call_id, @status, @customer_number, @agent_number, @caller_number, @duration,
         @recording_url, @start_time, @end_time, @call_type, @dial_status, @hangup_cause,
         @direction, @raw_payload)
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
