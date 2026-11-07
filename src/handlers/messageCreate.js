const { Events } = require('discord.js');
const config = require('../config');
const { getCurrentOpenCycle } = require('../services/pollCycle');
const rsvp = require('../services/rsvp');
const guestInvites = require('../services/guestInvites');
const { buildPendingRequestMessage } = require('../services/pendingApprovalView');

function register(client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot) return;
      if (message.channelId !== config.channelId) return;
      if (!/[+-]/.test(message.content)) return;

      const cycle = getCurrentOpenCycle(message.guildId);
      if (!cycle) return;

      const result = rsvp.processMessage({
        pollCycleId: cycle.id,
        authorId: message.author.id,
        authorName: message.member?.displayName ?? message.author.username,
        messageId: message.id,
        content: message.content,
      });

      if (result.approved.length === 0 && result.overflow.length === 0 && result.cancelled.length === 0) {
        if (result.notFound.length > 0) await message.react('❓');
        return;
      }

      if (result.approved.length > 0) await message.react('✅');
      if (result.cancelled.length > 0) await message.react('➖');

      const confirmationText = rsvp.buildConfirmationText(result);
      if (confirmationText) {
        await message.reply({ content: confirmationText, allowedMentions: { repliedUser: false } });
      }

      if (result.overflow.length > 0 && result.pendingRequest) {
        await message.react('⏳');
        const guestRows = guestInvites.getGuestsForPendingRequest(result.pendingRequest.id);
        const payload = buildPendingRequestMessage(result.pendingRequest, guestRows);
        const sent = await message.channel.send(payload);
        guestInvites.setPendingRequestMessageId(result.pendingRequest.id, sent.id);
      }
    } catch (err) {
      console.error('Failed to process message for RSVP parsing:', err);
    }
  });
}

module.exports = { register };
