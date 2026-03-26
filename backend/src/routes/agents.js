const express  = require('express');
const bcrypt   = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// GET /api/agents
router.get('/', async (req, res) => {
  const db = await getDb();
  const docs = await db.collection('agents')
    .find({}, { projection: { password_hash: 0 } })
    .sort({ created_at: -1 })
    .toArray();
  const agents = docs.map(({ _id, ...doc }) => ({ id: _id.toString(), ...doc }));
  res.json({ agents });
});

// POST /api/agents — default password is agent_number
router.post('/', async (req, res) => {
  const { name, agent_number } = req.body;
  if (!name || !agent_number)
    return res.status(400).json({ error: 'name and agent_number are required' });

  const db = await getDb();
  const existing = await db.collection('agents').findOne({ agent_number });
  if (existing) return res.status(409).json({ error: 'Agent number already registered' });

  const password_hash = await bcrypt.hash(agent_number, 10);
  const result = await db.collection('agents').insertOne({
    name, agent_number, password_hash,
    must_change_password: true,
    created_at: new Date(),
  });

  res.status(201).json({ id: result.insertedId.toString(), name, agent_number });
});

// PUT /api/agents/:id
router.put('/:id', async (req, res) => {
  const { name, agent_number } = req.body;
  const db = await getDb();

  const updates = {};
  if (name)         updates.name         = name;
  if (agent_number) updates.agent_number = agent_number;

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'No fields to update' });

  if (agent_number) {
    const conflict = await db.collection('agents').findOne({
      agent_number, _id: { $ne: new ObjectId(req.params.id) },
    });
    if (conflict) return res.status(409).json({ error: 'Agent number already in use' });
  }

  const result = await db.collection('agents').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updates }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/agents/:id/reset-password — admin resets password back to agent_number
router.post('/:id/reset-password', async (req, res) => {
  const db = await getDb();
  const agent = await db.collection('agents').findOne({ _id: new ObjectId(req.params.id) });
  if (!agent) return res.status(404).json({ error: 'Not found' });

  const password_hash = await bcrypt.hash(agent.agent_number, 10);
  await db.collection('agents').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { password_hash, must_change_password: true } }
  );
  res.json({ success: true });
});

// DELETE /api/agents/:id
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('agents').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
