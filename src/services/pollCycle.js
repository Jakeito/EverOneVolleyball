const db = require('../db');

const THURSDAY = 4; // Date#getDay(): Sun=0 ... Thu=4
const MIN_POLL_DURATION_HOURS = 1;
const MAX_POLL_DURATION_HOURS = 32 * 24; // Discord's hard cap on poll duration

/**
 * Returns the next upcoming Thursday as a Date, at local midnight (the
 * moment Wednesday night becomes Thursday). Always strictly in the future:
 * if today is Thursday, returns Thursday *next* week rather than today,
 * since a poll started on game day has nothing meaningful left to close at.
 */
function nextThursday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (THURSDAY - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Whole hours from `from` until `eventDate` (Thursday midnight), clamped to Discord's poll limits. */
function hoursUntilEventMidnight(eventDate, from = new Date()) {
  const rawHours = Math.floor((eventDate.getTime() - from.getTime()) / (60 * 60 * 1000));
  return Math.min(MAX_POLL_DURATION_HOURS, Math.max(MIN_POLL_DURATION_HOURS, rawHours));
}

function insertPollCycle({ guildId, channelId, messageId, question, eventDate, sport, rosterCap }) {
  const stmt = db.prepare(`
    INSERT INTO poll_cycles
      (guild_id, channel_id, message_id, question, event_date, created_at, status, sport, roster_cap)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `);
  const info = stmt.run(
    guildId,
    channelId,
    messageId,
    question,
    eventDate,
    new Date().toISOString(),
    sport,
    rosterCap
  );
  return getPollCycleById(info.lastInsertRowid);
}

function getPollCycleById(id) {
  return db.prepare('SELECT * FROM poll_cycles WHERE id = ?').get(id);
}

function getCurrentOpenCycle(guildId) {
  return db
    .prepare("SELECT * FROM poll_cycles WHERE guild_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1")
    .get(guildId);
}

function getCycleByMessageId(messageId) {
  return db.prepare('SELECT * FROM poll_cycles WHERE message_id = ?').get(messageId);
}

/** Most recent cycle worth reporting on — excludes cancelled cycles, which have discarded data. */
function getMostRecentCycle(guildId) {
  return db
    .prepare("SELECT * FROM poll_cycles WHERE guild_id = ? AND status != 'cancelled' ORDER BY id DESC LIMIT 1")
    .get(guildId);
}

function closeCycle(id) {
  db.prepare("UPDATE poll_cycles SET status = 'closed' WHERE id = ?").run(id);
}

function cancelCycle(id) {
  db.prepare("UPDATE poll_cycles SET status = 'cancelled' WHERE id = ?").run(id);
}

module.exports = {
  nextThursday,
  formatShortDate,
  hoursUntilEventMidnight,
  insertPollCycle,
  getPollCycleById,
  getCurrentOpenCycle,
  getMostRecentCycle,
  getCycleByMessageId,
  closeCycle,
  cancelCycle,
};
