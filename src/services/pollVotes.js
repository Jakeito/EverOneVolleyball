const db = require('../db');

function upsertVote({ pollCycleId, userId, username, answerId, answerText }) {
  db.prepare(
    `INSERT INTO poll_votes (poll_cycle_id, user_id, username, answer_id, answer_text, voted_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(poll_cycle_id, user_id) DO UPDATE SET
       username = excluded.username,
       answer_id = excluded.answer_id,
       answer_text = excluded.answer_text,
       voted_at = excluded.voted_at`
  ).run(pollCycleId, userId, username, answerId, answerText, new Date().toISOString());
}

function removeVote({ pollCycleId, userId, answerId }) {
  db.prepare('DELETE FROM poll_votes WHERE poll_cycle_id = ? AND user_id = ? AND answer_id = ?').run(
    pollCycleId,
    userId,
    answerId
  );
}

function getVotesForCycle(pollCycleId, answerText) {
  return db
    .prepare(
      'SELECT * FROM poll_votes WHERE poll_cycle_id = ? AND answer_text = ? ORDER BY voted_at ASC'
    )
    .all(pollCycleId, answerText);
}

module.exports = { upsertVote, removeVote, getVotesForCycle };
