const { parseGuestTokens, nameMatches } = require('./guestParser');
const guestInvites = require('./guestInvites');

const MAX_GUESTS_PER_MEMBER = 2;

/**
 * Parses a channel message for +/- guest tokens and applies them against the
 * given poll cycle. The first MAX_GUESTS_PER_MEMBER active (approved or
 * pending) guests for a member are auto-approved; anything beyond that is
 * recorded as 'pending' and bundled into one pending_request for admin review.
 */
function processMessage({ pollCycleId, authorId, authorName, messageId, content }) {
  const tokens = parseGuestTokens(content);
  const approved = [];
  const overflow = [];
  const cancelled = [];
  const notFound = [];

  let activeCount = guestInvites.getActiveGuests(pollCycleId, authorId).length;

  for (const token of tokens) {
    if (token.sign === '+') {
      const status = activeCount < MAX_GUESTS_PER_MEMBER ? 'approved' : 'pending';
      const row = guestInvites.insertGuest({
        pollCycleId,
        inviterId: authorId,
        inviterName: authorName,
        guestName: token.name,
        status,
        sourceMessageId: messageId,
      });
      activeCount += 1;
      (status === 'approved' ? approved : overflow).push(row);
    } else {
      const cancelledRow = guestInvites.cancelGuestByName(pollCycleId, authorId, (name) =>
        nameMatches(name, token.name)
      );
      if (cancelledRow) {
        activeCount = Math.max(0, activeCount - 1);
        cancelled.push(cancelledRow);
      } else {
        notFound.push(token.name);
      }
    }
  }

  let pendingRequest = null;
  if (overflow.length > 0) {
    pendingRequest = guestInvites.createPendingRequest({
      pollCycleId,
      inviterId: authorId,
      inviterName: authorName,
    });
    guestInvites.attachToPendingRequest(
      overflow.map((row) => row.id),
      pendingRequest.id
    );
  }

  const finalActive = guestInvites.getActiveGuests(pollCycleId, authorId);
  const approvedCount = finalActive.filter((g) => g.status === 'approved').length;
  const pendingCount = finalActive.filter((g) => g.status === 'pending').length;

  return { approved, overflow, cancelled, notFound, pendingRequest, approvedCount, pendingCount };
}

/**
 * Cancels every active guest entry sourced from a deleted message, and marks
 * any pending_request fully cancelled if nothing pending remains on it.
 */
function processMessageDeletion(messageId) {
  const cancelled = guestInvites.cancelGuestsBySourceMessage(messageId);
  const affectedPendingRequestIds = [
    ...new Set(cancelled.map((row) => row.pending_request_id).filter(Boolean)),
  ];
  const fullyCancelledRequestIds = [];
  for (const id of affectedPendingRequestIds) {
    if (guestInvites.countPendingForRequest(id) === 0) {
      guestInvites.markPendingRequestCancelled(id);
      fullyCancelledRequestIds.push(id);
    }
  }
  return { cancelled, fullyCancelledRequestIds };
}

/** Builds the text replied to a member confirming what their +/- message did. */
function buildConfirmationText(result) {
  const lines = [];

  if (result.approved.length > 0) {
    const names = result.approved.map((g) => `**${g.guest_name}**`).join(', ');
    const plural = result.approved.length === 1 ? 'guest' : 'guests';
    lines.push(
      `✅ Added ${result.approved.length} ${plural}: ${names} (${result.approvedCount}/${MAX_GUESTS_PER_MEMBER} spots used).`
    );
  }

  if (result.overflow.length > 0) {
    const names = result.overflow.map((g) => `**${g.guest_name}**`).join(', ');
    const verb = result.overflow.length === 1 ? 'is' : 'are';
    lines.push(
      `⏳ ${names} ${verb} over your ${MAX_GUESTS_PER_MEMBER}-guest limit — sent to admins for approval.`
    );
  }

  if (result.cancelled.length > 0) {
    const names = result.cancelled.map((g) => `**${g.guest_name}**`).join(', ');
    lines.push(`➖ Removed: ${names} (${result.approvedCount}/${MAX_GUESTS_PER_MEMBER} spots used).`);
  }

  if (result.notFound.length > 0) {
    const names = result.notFound.map((n) => `**${n}**`).join(', ');
    lines.push(`❓ Couldn't find an active guest matching: ${names}.`);
  }

  return lines.join('\n');
}

module.exports = { MAX_GUESTS_PER_MEMBER, processMessage, processMessageDeletion, buildConfirmationText };
