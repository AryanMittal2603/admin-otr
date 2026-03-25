const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'calls.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
