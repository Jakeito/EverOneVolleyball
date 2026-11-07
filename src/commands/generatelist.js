const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { getCurrentOpenCycle, getMostRecentCycle, closeCycle } = require('../services/pollCycle');
const { buildRoster, formatRosterMessage } = require('../services/rosterBuilder');

async function postRoster(channel, guildId) {
  const cycle = getCurrentOpenCycle(guildId) || getMostRecentCycle(guildId);
  if (!cycle) {
    return { posted: false, reason: 'No volleyball poll has been started yet. Run /volleyballpoll first.' };
  }

  const roster = buildRoster(cycle.id);
  const header = `**${cycle.question} — RSVP List**`;
  await channel.send(`${header}\n${formatRosterMessage(roster)}`);

  if (cycle.status === 'open') closeCycle(cycle.id);

  return { posted: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatelist')
    .setDescription('Generates and posts the prioritized RSVP list for the current volleyball poll.'),

  async execute(interaction) {
    if (interaction.channelId !== config.channelId) {
      await interaction.reply({
        content: `This command can only be used in <#${config.channelId}>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const result = await postRoster(interaction.channel, interaction.guildId);
    if (!result.posted) {
      await interaction.editReply(result.reason);
      return;
    }
    await interaction.editReply('Roster posted.');
  },

  postRoster,
};
