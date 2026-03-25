const { MongoClient } = require('mongodb');

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = MongoClient.connect(process.env.MONGODB_URI)
      .then(client => {
        const db = client.db('callcenter');
        return db.collection('calls')
          .createIndex({ call_id: 1 }, { unique: true })
          .then(() => db);
      });
  }
  return dbPromise;
}

module.exports = { getDb };
