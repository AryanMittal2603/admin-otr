const express = require('express');
const { getDb } = require('../db');
const { enqueueRecording } = require('../workers/analysisWorker');

const router = express.Router();

function extractCall(payload) {
  const p = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ''), v]));
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
        if (key === 'call_recording' && val !== '') { updates[key] = val; continue; }
        if (typeof val === 'string' && val !== '') updates[key] = val;
        if (typeof val === 'number' && val > 0) updates[key] = val;
      }
      await db.collection('calls').updateOne({ call_id: call.call_id }, { $set: updates });
    } else {
      throw err;
    }
  }
}

router.all('/', async (req, res) => {
  const payload = Object.keys(req.body || {}).length > 0 ? req.body : req.query;
  console.log(`\n[Webhook] ${req.method} ${new Date().toISOString()}`);
  console.log('[Webhook] Raw payload:', JSON.stringify(payload, null, 2));
  const db = await getDb();
  const call = extractCall(payload);

  // Check if initiated via Click2Call (within last 15 minutes)
  const pending = await db.collection('click2call_pending').findOne({
    customer_number: call.called_number,
    initiated_at: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
  });
  if (pending) {
    call.source = 'click2call';
    await db.collection('click2call_pending').deleteOne({ _id: pending._id });
    console.log('[Webhook] Tagged as click2call');
  }

  console.log('[Webhook] Extracted:', JSON.stringify(call, null, 2));
  await upsertCall(db, call);
  console.log(`[Webhook] Saved call_id: ${call.call_id}`);

  // Auto-enqueue for AI analysis if a recording URL is present
  if (call.call_recording) {
    enqueueRecording(call.call_id, call.call_recording).catch(err =>
      console.error('[Webhook] Enqueue error:', err.message)
    );
  }

  res.json({ status: 'ok', call_id: call.call_id });
});

module.exports = router;
