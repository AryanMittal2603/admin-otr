const { MongoClient } = require('mongodb');

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = MongoClient.connect(process.env.MONGODB_URI)
      .then(client => {
        const db = client.db('callcenter');
        return Promise.all([
          db.collection('calls').createIndex({ call_id: 1 }, { unique: true }),
          db.collection('call_analysis').createIndex({ call_id: 1 }, { unique: true }),
          db.collection('call_analysis').createIndex({ status: 1, created_at: 1 }),
          db.collection('agents').createIndex({ agent_number: 1 }, { unique: true }),
        ]).then(() => db);
      });
  }
  return dbPromise;
}

module.exports = { getDb };
