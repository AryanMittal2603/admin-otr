const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

// All calls routes require authentication
router.use(requireAuth);

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, status, limit = '25', offset = '0' } = req.query;

  const conditions = [];

  // Agents see their own calls + all missed calls
  if (req.user.role === 'agent') {
    conditions.push({
      $or: [
        { agent_number: req.user.agent_number },
        { caller_number: req.user.agent_number },
        { called_number: req.user.agent_number },
        { agent_answer_time: { $exists: false } },
        { agent_answer_time: '' },
      ],
    });
  }

  if (search) {
    conditions.push({ $or: [
      { caller_number: { $regex: search, $options: 'i' } },
      { called_number: { $regex: search, $options: 'i' } },
      { agent_name:    { $regex: search, $options: 'i' } },
      { agent_number:  { $regex: search, $options: 'i' } },
    ]});
  }

  if (status === 'received') {
    conditions.push({ agent_answer_time: { $exists: true, $ne: '' } });
  } else if (status === 'missed') {
    conditions.push({ $or: [{ agent_answer_time: { $exists: false } }, { agent_answer_time: '' }] });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  const [docs, total] = await Promise.all([
    db.collection('calls').find(filter).sort({ created_at: -1 }).skip(Number(offset)).limit(Number(limit)).toArray(),
    db.collection('calls').countDocuments(filter),
  ]);

  // Collect unique agent numbers and look up names from agents collection
  const agentNumbers = [...new Set(docs.map(d => d.agent_number).filter(Boolean))];
  const agentDocs = agentNumbers.length
    ? await db.collection('agents').find({ agent_number: { $in: agentNumbers } }, { projection: { agent_number: 1, name: 1 } }).toArray()
    : [];
  const agentNameMap = Object.fromEntries(agentDocs.map(a => [a.agent_number, a.name]));

  const calls = docs.map(({ _id, ...doc }) => ({
    id: _id.toString(),
    ...doc,
    ...(doc.agent_number && agentNameMap[doc.agent_number] ? { agent_name: agentNameMap[doc.agent_number] } : {}),
  }));
  res.json({ calls, total });
});

router.get('/stats/summary', async (req, res) => {
  const db = await getDb();
  const col = db.collection('calls');
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  // Agents only see stats for their own calls
  const agentFilter = req.user.role === 'agent'
    ? { $or: [
        { agent_number: req.user.agent_number },
        { caller_number: req.user.agent_number },
        { called_number: req.user.agent_number },
        { agent_answer_time: { $exists: false } },
        { agent_answer_time: '' },
      ]}
    : {};

  const receivedFilter = { agent_answer_time: { $exists: true, $ne: '' } };
  const missedFilter   = { $or: [{ agent_answer_time: { $exists: false } }, { agent_answer_time: '' }] };

  const todayReceivedFilter = { created_at: { $gte: startOfDay }, agent_answer_time: { $exists: true, $ne: '' } };
  const baseAndFilter = f => Object.keys(f).length ? { $and: [agentFilter, f] } : f;

  const [total, received, missed, recorded, today, [agg], latestDoc, agentBreakdownRaw, agentAvgRaw] = await Promise.all([
    col.countDocuments(agentFilter),
    col.countDocuments(baseAndFilter(receivedFilter)),
    col.countDocuments(baseAndFilter(missedFilter)),
    col.countDocuments({ ...agentFilter, call_recording: { $exists: true, $ne: '' } }),
    col.countDocuments({ ...agentFilter, created_at: { $gte: startOfDay }, ...{ agent_answer_time: { $exists: true, $ne: '' } } }),
    col.aggregate([{ $match: req.user.role === 'agent' ? { agent_number: req.user.agent_number } : agentFilter }, { $group: { _id: null, avgDuration: { $avg: '$duration' }, avgAgentDuration: { $avg: '$agent_duration' } } }]).toArray(),
    col.find({ ...agentFilter, $or: [{ agent_answer_time: { $exists: false } }, { agent_answer_time: '' }] }).sort({ created_at: -1 }).limit(10).toArray(),
    col.aggregate([
      { $match: { ...agentFilter, ...todayReceivedFilter } },
      { $group: { _id: '$agent_number', agent_name: { $first: '$agent_name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    col.aggregate([
      { $match: { ...agentFilter, agent_number: { $exists: true, $ne: '' }, duration: { $exists: true, $gt: 0 } } },
      { $group: { _id: '$agent_number', agent_name: { $first: '$agent_name' }, avgDuration: { $avg: '$duration' } } },
      { $sort: { avgDuration: -1 } },
    ]).toArray(),
  ]);

  // Enrich agent names from agents collection
  const allAgentNumbers = [...new Set([
    ...agentBreakdownRaw.map(a => a._id),
    ...agentAvgRaw.map(a => a._id),
  ].filter(Boolean))];
  const agentDocs = allAgentNumbers.length
    ? await db.collection('agents').find({ agent_number: { $in: allAgentNumbers } }, { projection: { agent_number: 1, name: 1 } }).toArray()
    : [];
  const agentNameMap = Object.fromEntries(agentDocs.map(a => [a.agent_number, a.name]));

  const todayByAgent = agentBreakdownRaw.map(a => ({
    agent_number: a._id,
    agent_name: agentNameMap[a._id] || a.agent_name || a._id || 'Unknown',
    count: a.count,
  }));

  const avgDurationByAgent = agentAvgRaw.map(a => ({
    agent_number: a._id,
    agent_name: agentNameMap[a._id] || a.agent_name || a._id || 'Unknown',
    avgDuration: Math.round(a.avgDuration),
  }));

  const latestMissed = latestDoc.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));

  res.json({ total, received, missed, recorded, today, avgDuration: Math.round(agg?.avgDuration || 0), avgAgentDuration: Math.round(agg?.avgAgentDuration || 0), latestMissed, todayByAgent, avgDurationByAgent });
});

// Check if a click2call for a given number was confirmed by webhook within a time window
router.get('/click2call/check', async (req, res) => {
  const { number, since } = req.query;
  if (!number || !since) return res.status(400).json({ error: 'number and since required' });

  const db = await getDb();
  const sinceDate = new Date(Number(since));
  const call = await db.collection('calls').findOne({
    source: 'click2call',
    created_at: { $gte: sinceDate },
    $or: [{ caller_number: number }, { called_number: number }],
  });

  res.json({ found: !!call, call_id: call?.call_id ?? null });
});

router.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch' });
    const filename = url.split('/').pop().split('?')[0] || 'recording.wav';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/wav');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verify latest recording URL is accessible
router.get('/recordings/check', async (req, res) => {
  const db = await getDb();
  const call = await db.collection('calls').findOne(
    { call_recording: { $exists: true, $ne: '' } },
    { sort: { created_at: -1 } }
  );
  if (!call) return res.json({ found: false, message: 'No calls with recording URLs' });

  const url = call.call_recording;
  try {
    const { status, headers } = await fetch(url, { method: 'HEAD' });
    console.log(`[Recording Check] call_id=${call.call_id} url=${url} status=${status} size=${headers.get('content-length')} type=${headers.get('content-type')}`);
    res.json({ found: true, call_id: call.call_id, url, status, size: headers.get('content-length'), type: headers.get('content-type') });
  } catch (e) {
    res.json({ found: true, call_id: call.call_id, url, error: e.message });
  }
});

router.post('/initiate', async (req, res) => {
  const { customer_number, agent_number } = req.body;
  if (!customer_number) return res.status(400).json({ error: 'customer_number is required' });

  console.log(`\n[Click2Call] ${new Date().toISOString()}`);
  console.log(`[Click2Call] customer=${customer_number} agent=${agent_number || 'none'} initiated_by=${req.user?.name || req.user?.role}`);

  const db = await getDb();
  await db.collection('click2call_pending').insertOne({
    customer_number,
    initiated_at: new Date(),
  });

  const params = new URLSearchParams({ auth: process.env.BUZZDIAL_AUTH, cust_no: customer_number, agent_name: 'seqrview' });
  if (agent_number) params.append('agent_no', agent_number);

  const response = await fetch(`https://buzzdial.io/api/clicktocall.php?${params}`);
  const result   = await response.json();
  console.log(`[Click2Call] BuzzDial response:`, JSON.stringify(result));
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const filter = ObjectId.isValid(id) ? { $or: [{ _id: new ObjectId(id) }, { call_id: id }] } : { call_id: id };
  const doc = await db.collection('calls').findOne(filter);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const { _id, ...rest } = doc;
  res.json({ id: _id.toString(), ...rest });
});

// Manually set recording URL for a call by call_id
router.patch('/:id/recording', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { recording_url } = req.body;
  if (!recording_url) return res.status(400).json({ error: 'recording_url required' });
  const result = await db.collection('calls').updateOne(
    { $or: [{ call_id: id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }] },
    { $set: { call_recording: recording_url } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const result = await db.collection('calls').deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
