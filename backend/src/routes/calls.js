const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { search, limit = '100', offset = '0' } = req.query;

  const filter = search ? {
    $or: [
      { called_number: { $regex: search, $options: 'i' } },
      { caller_number: { $regex: search, $options: 'i' } },
      { agent_name: { $regex: search, $options: 'i' } },
      { call_id: { $regex: search, $options: 'i' } },
    ],
  } : {};

  const [docs, total] = await Promise.all([
    db.collection('calls').find(filter).sort({ created_at: -1 }).skip(Number(offset)).limit(Number(limit)).toArray(),
    db.collection('calls').countDocuments(filter),
  ]);

  const calls = docs.map(({ _id, ...doc }) => ({ id: _id.toString(), ...doc }));
  res.json({ calls, total });
});

router.get('/stats/summary', async (req, res) => {
  const db = await getDb();
  const col = db.collection('calls');
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const [total, recorded, today, [agg]] = await Promise.all([
    col.countDocuments(),
    col.countDocuments({ call_recording: { $exists: true, $ne: '' } }),
    col.countDocuments({ created_at: { $gte: startOfDay } }),
    col.aggregate([{ $group: { _id: null, avgDuration: { $avg: '$duration' }, avgAgentDuration: { $avg: '$agent_duration' } } }]).toArray(),
  ]);

  res.json({ total, recorded, today, avgDuration: Math.round(agg?.avgDuration || 0), avgAgentDuration: Math.round(agg?.avgAgentDuration || 0) });
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

router.post('/initiate', async (req, res) => {
  const { customer_number, agent_number } = req.body;
  if (!customer_number) return res.status(400).json({ error: 'customer_number is required' });
  const params = new URLSearchParams({ auth: process.env.BUZZDIAL_AUTH, customer_number });
  if (agent_number) params.append('agent_number', agent_number);
  const response = await fetch(`https://buzzdial.io/api/clicktocall.php?${params}`);
  res.json(await response.json());
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const result = await db.collection('calls').deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
