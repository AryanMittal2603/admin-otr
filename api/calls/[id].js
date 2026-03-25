const { getDb } = require('../_lib/db');
const { ObjectId } = require('mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await getDb();
  const { id } = req.query;

  const filter = ObjectId.isValid(id)
    ? { $or: [{ _id: new ObjectId(id) }, { call_id: id }] }
    : { call_id: id };

  if (req.method === 'GET') {
    const doc = await db.collection('calls').findOne(filter);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const { _id, ...rest } = doc;
    return res.json({ id: _id.toString(), ...rest });
  }

  if (req.method === 'DELETE') {
    const deleteFilter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { call_id: id };
    const result = await db.collection('calls').deleteOne(deleteFilter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
