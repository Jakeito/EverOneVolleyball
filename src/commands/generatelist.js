const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { getCurrentOpenCycle, getMostRecentCycle, closeCycle } = require('../services/pollCycle');
const { buildRoster, formatRosterMessage } = require('../services/rosterBuilder');
const { endPollMessage } = require('../services/discordPoll');

async function postRoster(channel, guildId) {
  const cycle = getCurrentOpenCycle(guildId) || getMostRecentCycle(guildId);
  if (!cycle) {
    return {
      posted: false,
      reason:
        'No poll has been started yet. Run /volleyballpoll, /basketballpoll, /pickleballpoll, or /soccerpoll first.',
    };
  }

  const roster = buildRoster(cycle.id, cycle.roster_cap);
  const header = `**${cycle.question} — RSVP List**`;
  await channel.send(`${header}\n${formatRosterMessage(roster)}`);

  if (cycle.status === 'open') {
    await endPollMessage(channel, cycle.message_id);
    closeCycle(cycle.id);
  }

  return { posted: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatelist')
    .setDescription('Generates and posts the prioritized RSVP list for the current poll (any sport).'),

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
