const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const payload = req.body;
  console.log('[Webhook received]', JSON.stringify(payload, null, 2));

  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id:           p.call_id || p.callid || p.uid || `manual_${Date.now()}`,
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

  try {
    db.prepare(`
      INSERT INTO calls
        (call_id, caller_number, called_number, agent_number, agent_name,
         call_start_time, agent_answer_time, call_end_time, duration,
         call_recording, agent_duration, raw_payload)
      VALUES
        (@call_id, @caller_number, @called_number, @agent_number, @agent_name,
         @call_start_time, @agent_answer_time, @call_end_time, @duration,
         @call_recording, @agent_duration, @raw_payload)
      ON CONFLICT(call_id) DO UPDATE SET
        caller_number     = CASE WHEN excluded.caller_number != '' THEN excluded.caller_number ELSE calls.caller_number END,
        called_number     = CASE WHEN excluded.called_number != '' THEN excluded.called_number ELSE calls.called_number END,
        agent_number      = CASE WHEN excluded.agent_number != '' THEN excluded.agent_number ELSE calls.agent_number END,
        agent_name        = CASE WHEN excluded.agent_name != '' THEN excluded.agent_name ELSE calls.agent_name END,
        call_start_time   = CASE WHEN excluded.call_start_time != '' THEN excluded.call_start_time ELSE calls.call_start_time END,
        agent_answer_time = CASE WHEN excluded.agent_answer_time != '' THEN excluded.agent_answer_time ELSE calls.agent_answer_time END,
        call_end_time     = CASE WHEN excluded.call_end_time != '' THEN excluded.call_end_time ELSE calls.call_end_time END,
        duration          = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE calls.duration END,
        call_recording    = CASE WHEN excluded.call_recording != '' THEN excluded.call_recording ELSE calls.call_recording END,
        agent_duration    = CASE WHEN excluded.agent_duration > 0 THEN excluded.agent_duration ELSE calls.agent_duration END,
        raw_payload       = excluded.raw_payload
    `).run(call);

    res.json({ status: 'ok', call_id: call.call_id });
  } catch (err) {
    console.error('[Webhook DB error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/test', (req, res) => {
  const callId = `test_${Date.now()}`;
  db.prepare(`
    INSERT INTO calls
      (call_id, caller_number, called_number, agent_number, agent_name,
       call_start_time, agent_answer_time, call_end_time, duration,
       call_recording, agent_duration, raw_payload)
    VALUES
      (@call_id, @caller_number, @called_number, @agent_number, @agent_name,
       @call_start_time, @agent_answer_time, @call_end_time, @duration,
       @call_recording, @agent_duration, @raw_payload)
    ON CONFLICT(call_id) DO NOTHING
  `).run({
    call_id: callId,
    caller_number: '9657509666',
    called_number: '9289904559',
    agent_number: '9654639649',
    agent_name: 'seqrview',
    call_start_time: '2026-03-20 12:48:34',
    agent_answer_time: '2026-03-20 12:49:52',
    call_end_time: '2026-03-20 12:51:58',
    duration: 408,
    call_recording: '',
    agent_duration: 126,
    raw_payload: JSON.stringify({ note: 'test entry' }),
  });
  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
});

module.exports = router;
