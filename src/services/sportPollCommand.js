const { SlashCommandBuilder, PollLayoutType } = require('discord.js');
const config = require('../config');
const {
  nextThursday,
  formatShortDate,
  hoursUntilEventMidnight,
  insertPollCycle,
  getCurrentOpenCycle,
} = require('./pollCycle');

/**
 * Builds a `/<key>poll` slash command (e.g. /basketballpoll) that behaves
 * exactly like /volleyballpoll — next-Thursday native poll, one open cycle
 * at a time, same +/- guest rules — just with a different title and an
 * optional `cap` argument to override the default roster cap for this run.
 */
function createSportPollCommand({ key, label, commandName }) {
  const name = commandName || `${key}poll`;

  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(`Posts the ${label} RSVP poll for the next upcoming Thursday.`)
      .addIntegerOption((option) =>
        option
          .setName('cap')
          .setDescription(`Max players before the waitlist kicks in (default ${config.rosterCap}).`)
          .setMinValue(1)
      ),

    async execute(interaction) {
      if (interaction.channelId !== config.channelId) {
        await interaction.reply({
          content: `This command can only be used in <#${config.channelId}>.`,
          ephemeral: true,
        });
        return;
      }

      const existing = getCurrentOpenCycle(interaction.guildId);
      if (existing) {
        await interaction.reply({
          content:
            `There's already an open **${existing.question}** poll (posted <t:${Math.floor(
              new Date(existing.created_at).getTime() / 1000
            )}:R>). Use /generatelist to close it out, or /cancelpoll to discard it, before starting a new one.`,
          ephemeral: true,
        });
        return;
      }

      const eventDate = nextThursday();
      const question = `${label} ${formatShortDate(eventDate)}`;
      const durationHours = hoursUntilEventMidnight(eventDate);
      const rosterCap = interaction.options.getInteger('cap') ?? config.rosterCap;

      await interaction.deferReply();

      const message = await interaction.channel.send({
        poll: {
          question: { text: question },
          answers: [{ text: 'Yes' }, { text: 'Yes, but watching' }],
          duration: durationHours,
          allowMultiselect: false,
          layoutType: PollLayoutType.Default,
        },
      });

      insertPollCycle({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: message.id,
        question,
        eventDate: eventDate.toISOString(),
        sport: key,
        rosterCap,
      });

      const closesAt = Math.floor(eventDate.getTime() / 1000);
      await interaction.editReply(
        `Poll posted for **${question}**! Vote in the poll above, and type things like ` +
          `\`+alex +chris\` in this channel to bring up to 2 guests each. Type \`-name\` or delete your ` +
          `message to cancel a guest. Roster cap: **${rosterCap}**. Poll closes <t:${closesAt}:F>.`
      );
    },
  };
}

module.exports = { createSportPollCommand };
