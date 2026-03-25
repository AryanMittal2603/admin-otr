const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// Extract fields from payload regardless of delivery method
function extractCall(payload) {
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    call_id:           p.call_id || p.callid || p.uid || p.id || `wb_${Date.now()}`,
    caller_number:     p.caller_number || p.callernumber || p.caller || '',
    called_number:     p.called_number || p.callednumber || p.customer_number || p.mobile || p.to || '',
    agent_number:      p.agent_number || p.agentnumber || p.agent || '',
    agent_name:        p.agent_name || p.agentname || p.account || '',
    call_start_time:   p.call_start_time || p.callstarttime || p.start_time || '',
    agent_answer_time: p.agent_answer_time || p.agentanswertime || p.answer_time || '',
    call_end_time:     p.call_end_time || p.callendtime || p.end_time || '',
    duration:          parseInt(p.duration || p.call_duration || 0) || 0,
    call_recording:    p.call_recording || p.callrecording || p.recording_url || p.recording || p.recurl || p.file_url || p.audio_url || '',
    agent_duration:    parseInt(p.agent_duration || p.agentduration || 0) || 0,
    raw_payload:       JSON.stringify(payload),
  };
}

async function upsertCall(db, call) {
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
      throw err;
    }
  }
}

// Main call webhook — handles GET and POST, JSON and form-encoded
router.all('/', async (req, res) => {
  const payload = Object.keys(req.body || {}).length > 0 ? req.body : req.query;
  console.log(`[Webhook] ${req.method} | body keys: ${Object.keys(req.body||{}).join(',')} | query keys: ${Object.keys(req.query||{}).join(',')}`);
  console.log('[Webhook payload]', JSON.stringify(payload, null, 2));

  const db = await getDb();
  const call = extractCall(payload);
  await upsertCall(db, call);

  res.json({ status: 'ok', call_id: call.call_id });
});

// Recording webhook — handles GET and POST, JSON and form-encoded
router.all('/recording', async (req, res) => {
  const payload = Object.keys(req.body || {}).length > 0 ? req.body : req.query;
  console.log(`[Recording] ${req.method} | body keys: ${Object.keys(req.body||{}).join(',')} | query keys: ${Object.keys(req.query||{}).join(',')}`);
  console.log('[Recording payload]', JSON.stringify(payload, null, 2));

  const db = await getDb();
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]));

  const call_id = p.call_id || p.callid || p.uid || p.id;
  const call_recording = p.call_recording || p.callrecording || p.recording_url || p.recording || p.recurl || p.file_url || p.audio_url || '';
  const agent_duration = parseInt(p.agent_duration || p.agentduration || 0) || 0;

  if (call_id && call_recording) {
    const updates = { call_recording };
    if (agent_duration > 0) updates.agent_duration = agent_duration;
    updates.raw_payload = JSON.stringify(payload);

    const result = await db.collection('calls').updateOne({ call_id }, { $set: updates });
    if (result.matchedCount === 0) {
      // No matching call yet — store it and wait for main webhook to fill in the rest
      await db.collection('calls').insertOne({
        call_id, call_recording, agent_duration,
        raw_payload: JSON.stringify(payload),
        created_at: new Date(),
      });
    }
  }

  res.json({ status: 'ok', call_id: call_id || null });
});

router.post('/test', async (req, res) => {
  const db = await getDb();
  const callId = `test_${Date.now()}`;
  await db.collection('calls').insertOne({
    call_id: callId, caller_number: '9657509666', called_number: '9289904559',
    agent_number: '9654639649', agent_name: 'seqrview',
    call_start_time: '2026-03-20 12:48:34', agent_answer_time: '2026-03-20 12:49:52',
    call_end_time: '2026-03-20 12:51:58', duration: 408,
    call_recording: 'https://ivr-recording.s3.amazonaws.com/sample.wav',
    agent_duration: 126, raw_payload: JSON.stringify({ note: 'test entry' }),
    created_at: new Date(),
  });
  res.json({ status: 'ok', message: 'Test call inserted', call_id: callId });
});

module.exports = router;
