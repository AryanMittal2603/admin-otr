const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function initDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      call_id TEXT UNIQUE,
      status TEXT,
      customer_number TEXT,
      agent_number TEXT,
      caller_number TEXT,
      duration INTEGER DEFAULT 0,
      recording_url TEXT,
      start_time TEXT,
      end_time TEXT,
      call_type TEXT,
      dial_status TEXT,
      hangup_cause TEXT,
      direction TEXT,
      raw_payload TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  return db;
}

module.exports = { getPool, initDb };
