const { SlashCommandBuilder, PollLayoutType } = require('discord.js');
const config = require('../config');
const { nextThursday, formatShortDate, insertPollCycle, getCurrentOpenCycle } = require('../services/pollCycle');

const POLL_DURATION_HOURS = 7 * 24; // open for a week

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volleyballpoll')
    .setDescription('Posts the volleyball RSVP poll for the next upcoming Thursday.'),

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
        content: `There's already an open poll for this cycle (posted <t:${Math.floor(
          new Date(existing.created_at).getTime() / 1000
        )}:R>). Use /generatelist to close it out, or ask an admin to resolve it before starting a new one.`,
        ephemeral: true,
      });
      return;
    }

    const eventDate = nextThursday();
    const question = `Volleyball ${formatShortDate(eventDate)}`;

    await interaction.deferReply();

    const message = await interaction.channel.send({
      poll: {
        question: { text: question },
        answers: [{ text: 'Yes' }, { text: 'Yes, but watching' }],
        duration: POLL_DURATION_HOURS,
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
    });

    await interaction.editReply(
      `Poll posted for **${question}**! Vote in the poll above, and type things like ` +
        `\`+alex +chris\` in this channel to bring up to 2 guests each. Type \`-name\` or delete your ` +
        `message to cancel a guest.`
    );
  },
};
