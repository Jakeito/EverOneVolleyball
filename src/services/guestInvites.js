const db = require('../db');

function getActiveGuests(pollCycleId, inviterId) {
  return db
    .prepare(
      `SELECT * FROM guest_invites
       WHERE poll_cycle_id = ? AND inviter_id = ? AND status IN ('approved', 'pending')
       ORDER BY requested_at ASC`
    )
    .all(pollCycleId, inviterId);
}

function insertGuest({ pollCycleId, inviterId, inviterName, guestName, status, sourceMessageId }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO guest_invites
         (poll_cycle_id, inviter_id, inviter_name, guest_name, status, source_message_id, requested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(pollCycleId, inviterId, inviterName, guestName, status, sourceMessageId, now);
  return db.prepare('SELECT * FROM guest_invites WHERE id = ?').get(info.lastInsertRowid);
}

function attachToPendingRequest(guestInviteIds, pendingRequestId) {
  const stmt = db.prepare('UPDATE guest_invites SET pending_request_id = ? WHERE id = ?');
  const tx = db.transaction((ids) => {
    for (const id of ids) stmt.run(pendingRequestId, id);
  });
  tx(guestInviteIds);
}

function createPendingRequest({ pollCycleId, inviterId, inviterName }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO pending_requests (poll_cycle_id, inviter_id, inviter_name, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`
    )
    .run(pollCycleId, inviterId, inviterName, now);
  return db.prepare('SELECT * FROM pending_requests WHERE id = ?').get(info.lastInsertRowid);
}

function setPendingRequestMessageId(id, messageId) {
  db.prepare('UPDATE pending_requests SET message_id = ? WHERE id = ?').run(messageId, id);
}

function getPendingRequest(id) {
  return db.prepare('SELECT * FROM pending_requests WHERE id = ?').get(id);
}

function getGuestsForPendingRequest(id) {
  return db.prepare('SELECT * FROM guest_invites WHERE pending_request_id = ?').all(id);
}

function resolvePendingRequest(id, status, resolverId) {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare('UPDATE pending_requests SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?').run(
      status,
      now,
      resolverId,
      id
    );
    const guestStatus = status === 'approved' ? 'approved' : 'rejected';
    db.prepare(
      `UPDATE guest_invites SET status = ?, resolved_at = ?, resolved_by = ?
       WHERE pending_request_id = ? AND status = 'pending'`
    ).run(guestStatus, now, resolverId, id);
  });
  tx();
  return getPendingRequest(id);
}

/** Cancels the most recent active (approved/pending) guest entry matching, by name, for an inviter. */
function cancelGuestByName(pollCycleId, inviterId, matcherFn) {
  const active = getActiveGuests(pollCycleId, inviterId);
  const match = [...active].reverse().find((g) => matcherFn(g.guest_name));
  if (!match) return null;
  return cancelGuestRow(match);
}

function cancelGuestRow(row) {
  const now = new Date().toISOString();
  db.prepare("UPDATE guest_invites SET status = 'cancelled', resolved_at = ? WHERE id = ?").run(now, row.id);
  return { ...row, status: 'cancelled', resolved_at: now };
}

/** Cancels every active guest entry that came from a given source message (used on message delete). */
function cancelGuestsBySourceMessage(sourceMessageId) {
  const rows = db
    .prepare(
      `SELECT * FROM guest_invites WHERE source_message_id = ? AND status IN ('approved', 'pending')`
    )
    .all(sourceMessageId);
  return rows.map(cancelGuestRow);
}

function countPendingForRequest(pendingRequestId) {
  return db
    .prepare(`SELECT COUNT(*) AS c FROM guest_invites WHERE pending_request_id = ? AND status = 'pending'`)
    .get(pendingRequestId).c;
}

function markPendingRequestCancelled(id) {
  const now = new Date().toISOString();
  db.prepare("UPDATE pending_requests SET status = 'cancelled', resolved_at = ? WHERE id = ?").run(now, id);
}

function getApprovedGuestsForCycle(pollCycleId) {
  return db
    .prepare(
      `SELECT * FROM guest_invites WHERE poll_cycle_id = ? AND status = 'approved' ORDER BY requested_at ASC`
    )
    .all(pollCycleId);
}

module.exports = {
  getActiveGuests,
  insertGuest,
  attachToPendingRequest,
  createPendingRequest,
  setPendingRequestMessageId,
  getPendingRequest,
  getGuestsForPendingRequest,
  resolvePendingRequest,
  cancelGuestByName,
  cancelGuestsBySourceMessage,
  countPendingForRequest,
  markPendingRequestCancelled,
  getApprovedGuestsForCycle,
};
