const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'calls.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE,
    status TEXT,
    customer_number TEXT,
    agent_number TEXT,
    caller_number TEXT,
    duration INTEGER,
    recording_url TEXT,
    start_time TEXT,
    end_time TEXT,
    call_type TEXT,
    dial_status TEXT,
    hangup_cause TEXT,
    direction TEXT,
    raw_payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
