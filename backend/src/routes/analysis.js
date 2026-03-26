const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/analysis/:call_id — fetch analysis for a specific call
router.get('/:call_id', async (req, res) => {
  const db  = await getDb();
  const doc = await db.collection('call_analysis').findOne(
    { call_id: req.params.call_id },
    { projection: { _id: 0 } }
  );

  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// GET /api/analysis — list all with optional status filter
router.get('/', async (req, res) => {
  const db     = await getDb();
  const filter = req.query.status ? { status: req.query.status } : {};
  const docs   = await db.collection('call_analysis')
    .find(filter, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  res.json({ analyses: docs, total: docs.length });
});

module.exports = router;
