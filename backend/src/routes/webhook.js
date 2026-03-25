const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const payload = req.body;
  console.log('[Webhook received]', JSON.stringify(payload, null, 2));

  const db = await getDb();
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call = {
    call_id:           p.call_id || p.callid || p.uid || `manual_${Date.now()}`,
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
    await db.collection('calls').insertOne({ ...call, created_at: new Date() });
  } catch (err) {
    if (err.code === 11000) {
      const updates = { raw_payload: call.raw_payload };
      for (const [key, val] of Object.entries(call)) {
        if (key === 'call_id') continue;
        if (typeof val === 'string' && val !== '') updates[key] = val;
        if (typeof val === 'number' && val > 0) updates[key] = val;
      }
      await db.collection('calls').updateOne({ call_id: call.call_id }, { $set: updates });
    } else {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ status: 'ok', call_id: call.call_id });
});

// Recording-specific webhook — BuzzDial posts call_recording URL here after call ends
router.post('/recording', async (req, res) => {
  const payload = req.body;
  console.log('[Recording webhook]', JSON.stringify(payload, null, 2));

  const db = await getDb();
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call_id = p.call_id || p.callid || p.uid || p.id;
  const call_recording = p.call_recording || p.callrecording || p.recording_url || p.recording || p.recurl || p.file_url || p.audio_url || '';
  const agent_duration = parseInt(p.agent_duration || p.agentduration || 0) || 0;

  if (!call_id) {
    console.warn('[Recording webhook] No call_id in payload, storing as new record');
  }

  try {
    await db.collection('calls').insertOne({
      call_id: call_id || `rec_${Date.now()}`,
      call_recording,
      agent_duration,
      raw_payload: JSON.stringify(payload),
      created_at: new Date(),
    });
  } catch (err) {
    if (err.code === 11000) {
      // Update existing call with recording
      const updates = { raw_payload: JSON.stringify(payload) };
      if (call_recording) updates.call_recording = call_recording;
      if (agent_duration > 0) updates.agent_duration = agent_duration;
      await db.collection('calls').updateOne({ call_id }, { $set: updates });
    } else {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ status: 'ok', call_id });
});

router.post('/test', async (req, res) => {
  const db = await getDb();
  const callId = `test_${Date.now()}`;

  await db.collection('calls').insertOne({
    call_id: callId, caller_number: '9657509666', called_number: '9289904559',
    agent_number: '9654639649', agent_name: 'seqrview',
    call_start_time: '2026-03-20 12:48:34', agent_answer_time: '2026-03-20 12:49:52',
    call_end_time: '2026-03-20 12:51:58', duration: 408, call_recording: '',
    agent_duration: 126, raw_payload: JSON.stringify({ note: 'test entry' }),
    created_at: new Date(),
  });

  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
});

module.exports = router;
