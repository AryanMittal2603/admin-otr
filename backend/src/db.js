const { MongoClient } = require('mongodb');

let client;
let db;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
    await db.collection('calls').createIndex({ call_id: 1 }, { unique: true });
  }
  return db;
}

module.exports = { getDb };
