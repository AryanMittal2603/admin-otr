const express = require('express');
const axios = require('axios');
const db = require('../db');

const router = express.Router();

// GET all calls with optional filters
router.get('/', (req, res) => {
  const { status, search, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM calls';
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(customer_number LIKE ? OR agent_number LIKE ? OR call_id LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const calls = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM calls').get().count;

  res.json({ calls, total });
});

// GET single call
router.get('/:id', (req, res) => {
  const call = db.prepare('SELECT * FROM calls WHERE id = ? OR call_id = ?').get(req.params.id, req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

// POST initiate click-to-call
router.post('/initiate', async (req, res) => {
  const { customer_number, agent_number } = req.body;

  if (!customer_number) {
    return res.status(400).json({ error: 'customer_number is required' });
  }

  try {
    const params = new URLSearchParams({
      auth: process.env.BUZZDIAL_AUTH,
      customer_number,
    });
    if (agent_number) params.append('agent_number', agent_number);

    const response = await axios.get(
      `https://buzzdial.io/api/clicktocall.php?${params.toString()}`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats summary
router.get('/stats/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM calls').get().count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM calls GROUP BY status').all();
  const avgDuration = db.prepare('SELECT AVG(duration) as avg FROM calls WHERE duration > 0').get().avg;
  const today = db.prepare("SELECT COUNT(*) as count FROM calls WHERE date(created_at) = date('now')").get().count;

  res.json({ total, byStatus, avgDuration: Math.round(avgDuration || 0), today });
});

// DELETE a call record
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM calls WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
