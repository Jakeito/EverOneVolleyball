const db = require('../db');

const THURSDAY = 4; // Date#getDay(): Sun=0 ... Thu=4

/** Returns the next Thursday as a Date, at local midnight. If today is Thursday, returns today. */
function nextThursday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (THURSDAY - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function insertPollCycle({ guildId, channelId, messageId, question, eventDate }) {
  const stmt = db.prepare(`
    INSERT INTO poll_cycles (guild_id, channel_id, message_id, question, event_date, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, 'open')
  `);
  const info = stmt.run(guildId, channelId, messageId, question, eventDate, new Date().toISOString());
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

function getMostRecentCycle(guildId) {
  return db.prepare('SELECT * FROM poll_cycles WHERE guild_id = ? ORDER BY id DESC LIMIT 1').get(guildId);
}

function closeCycle(id) {
  db.prepare("UPDATE poll_cycles SET status = 'closed' WHERE id = ?").run(id);
}

module.exports = {
  nextThursday,
  formatShortDate,
  insertPollCycle,
  getPollCycleById,
  getCurrentOpenCycle,
  getMostRecentCycle,
  getCycleByMessageId,
  closeCycle,
};
