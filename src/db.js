const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS poll_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  question TEXT NOT NULL,
  event_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  sport TEXT NOT NULL DEFAULT 'volleyball',
  roster_cap INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  answer_id INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  voted_at TEXT NOT NULL,
  UNIQUE(poll_cycle_id, user_id),
  FOREIGN KEY (poll_cycle_id) REFERENCES poll_cycles(id)
);

CREATE TABLE IF NOT EXISTS pending_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_cycle_id INTEGER NOT NULL,
  inviter_id TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  FOREIGN KEY (poll_cycle_id) REFERENCES poll_cycles(id)
);

CREATE TABLE IF NOT EXISTS guest_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_cycle_id INTEGER NOT NULL,
  inviter_id TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  source_message_id TEXT,
  pending_request_id INTEGER,
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  FOREIGN KEY (poll_cycle_id) REFERENCES poll_cycles(id),
  FOREIGN KEY (pending_request_id) REFERENCES pending_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_guest_invites_cycle ON guest_invites(poll_cycle_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_cycle ON poll_votes(poll_cycle_id);
`);

// Migrate poll_cycles for installs created before multi-sport support:
// CREATE TABLE IF NOT EXISTS doesn't add columns to an already-existing table.
const pollCycleColumns = db.prepare('PRAGMA table_info(poll_cycles)').all().map((c) => c.name);
if (!pollCycleColumns.includes('sport')) {
  db.exec("ALTER TABLE poll_cycles ADD COLUMN sport TEXT NOT NULL DEFAULT 'volleyball'");
}
if (!pollCycleColumns.includes('roster_cap')) {
  db.exec('ALTER TABLE poll_cycles ADD COLUMN roster_cap INTEGER NOT NULL DEFAULT 30');
}

module.exports = db;
