const { Events } = require('discord.js');
const config = require('../config');
const rsvp = require('../services/rsvp');
const guestInvites = require('../services/guestInvites');
const { buildResolvedMessage } = require('../services/pendingApprovalView');

function register(client) {
  client.on(Events.MessageDelete, async (message) => {
    try {
      if (message.channelId !== config.channelId) return;

      const { cancelled, fullyCancelledRequestIds } = rsvp.processMessageDeletion(message.id);
      if (cancelled.length === 0) return;

      for (const requestId of fullyCancelledRequestIds) {
        const pendingRequest = guestInvites.getPendingRequest(requestId);
        if (!pendingRequest?.message_id) continue;
        try {
          const channel = await message.client.channels.fetch(config.channelId);
          const approvalMessage = await channel.messages.fetch(pendingRequest.message_id);
          const guestRows = guestInvites.getGuestsForPendingRequest(requestId);
          await approvalMessage.edit(buildResolvedMessage(pendingRequest, guestRows, 'cancelled'));
        } catch (err) {
          console.error(`Failed to update pending request #${requestId} after message delete:`, err);
        }
      }
    } catch (err) {
      console.error('Failed to process message deletion for RSVP cancellation:', err);
    }
  });
}

module.exports = { register };
