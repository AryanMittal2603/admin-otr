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

  // Create table with exact BuzzDial field names
  await db.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      call_id TEXT UNIQUE,
      caller_number TEXT,
      called_number TEXT,
      agent_number TEXT,
      agent_name TEXT,
      call_start_time TEXT,
      agent_answer_time TEXT,
      call_end_time TEXT,
      duration INTEGER DEFAULT 0,
      call_recording TEXT,
      agent_duration INTEGER DEFAULT 0,
      raw_payload TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add any missing columns for existing deployments
  const newCols = [
    'caller_number TEXT',
    'called_number TEXT',
    'agent_number TEXT',
    'agent_name TEXT',
    'call_start_time TEXT',
    'agent_answer_time TEXT',
    'call_end_time TEXT',
    'call_recording TEXT',
    'agent_duration INTEGER DEFAULT 0',
  ];
  for (const col of newCols) {
    const name = col.split(' ')[0];
    await db.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS ${name} ${col.slice(name.length + 1)}`).catch(() => {});
  }

  return db;
}

module.exports = { getPool, initDb };
