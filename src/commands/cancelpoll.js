const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { getCurrentOpenCycle, cancelCycle } = require('../services/pollCycle');
const { isAdmin } = require('../services/permissions');
const { endPollMessage } = require('../services/discordPoll');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancelpoll')
    .setDescription('Cancels the current open volleyball poll without posting a roster, so a new one can start.'),

  async execute(interaction) {
    if (interaction.channelId !== config.channelId) {
      await interaction.reply({
        content: `This command can only be used in <#${config.channelId}>.`,
        ephemeral: true,
      });
      return;
    }

    if (!isAdmin(interaction.member)) {
      await interaction.reply({
        content: 'Only admins (Manage Messages permission or the configured admin role) can cancel a poll.',
        ephemeral: true,
      });
      return;
    }

    const cycle = getCurrentOpenCycle(interaction.guildId);
    if (!cycle) {
      await interaction.reply({ content: 'There is no open poll to cancel.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    await endPollMessage(interaction.channel, cycle.message_id);
    cancelCycle(cycle.id);

    await interaction.editReply(
      `Cancelled **${cycle.question}**. Any votes and guest requests recorded for it are discarded. ` +
        `Run /volleyballpoll to start a fresh one.`
    );
  },
};
