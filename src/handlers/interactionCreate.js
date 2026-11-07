const { Events } = require('discord.js');
const guestInvites = require('../services/guestInvites');
const { isAdmin } = require('../services/permissions');
const { buildResolvedMessage } = require('../services/pendingApprovalView');

function register(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error executing command ${interaction.commandName}:`, err);
        const payload = { content: 'Something went wrong running that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply(payload);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const [action, idStr] = interaction.customId.split(':');
      if (action !== 'approve_pending' && action !== 'reject_pending') return;

      if (!isAdmin(interaction.member)) {
        await interaction.reply({
          content: 'Only admins (Manage Messages permission or the configured admin role) can resolve guest requests.',
          ephemeral: true,
        });
        return;
      }

      const id = parseInt(idStr, 10);
      const pendingRequest = guestInvites.getPendingRequest(id);
      if (!pendingRequest || pendingRequest.status !== 'pending') {
        await interaction.reply({ content: 'This request has already been resolved.', ephemeral: true });
        return;
      }

      const status = action === 'approve_pending' ? 'approved' : 'rejected';
      guestInvites.resolvePendingRequest(id, status, interaction.user.id);
      const guestRows = guestInvites.getGuestsForPendingRequest(id);
      await interaction.update(buildResolvedMessage(pendingRequest, guestRows, status));
    }
  });
}

module.exports = { register };
