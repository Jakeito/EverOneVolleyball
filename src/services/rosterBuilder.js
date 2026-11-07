const pollVotesService = require('./pollVotes');
const guestInvites = require('./guestInvites');
const config = require('../config');

/**
 * Builds the prioritized roster for a poll cycle: members who voted "Yes"
 * (earliest vote first), then approved guests (earliest request first).
 * Anything past the cap spills into the waitlist, in the same order.
 */
function buildRoster(pollCycleId, cap = config.rosterCap) {
  const members = pollVotesService.getVotesForCycle(pollCycleId, 'Yes');
  const watching = pollVotesService.getVotesForCycle(pollCycleId, 'Yes, but watching');
  const guests = guestInvites.getApprovedGuestsForCycle(pollCycleId);

  const combined = [
    ...members.map((v) => ({ type: 'member', name: v.username })),
    ...guests.map((g) => ({ type: 'guest', name: g.guest_name })),
  ];

  const rostered = combined.slice(0, cap);
  const waitlist = combined.slice(cap);

  return { rostered, waitlist, members, guests, watching };
}

function formatRosterMessage(roster) {
  const memberLines = roster.rostered.filter((x) => x.type === 'member').map((x) => `• ${x.name}`);
  const guestLines = roster.rostered.filter((x) => x.type === 'guest').map((x) => `• ${x.name}`);

  let text = `Member:\n${memberLines.length ? memberLines.join('\n') : '_none yet_'}`;
  text += `\n\nGuest:\n${guestLines.length ? guestLines.join('\n') : '_none yet_'}`;

  if (roster.waitlist.length > 0) {
    const waitlistLines = roster.waitlist.map((x) => `• ${x.name}${x.type === 'guest' ? ' (guest)' : ''}`);
    text += `\n\nWaitlist:\n${waitlistLines.join('\n')}`;
  }

  if (roster.watching.length > 0) {
    text += `\n\nWatching only:\n${roster.watching.map((v) => `• ${v.username}`).join('\n')}`;
  }

  return text;
}

module.exports = { buildRoster, formatRosterMessage };
