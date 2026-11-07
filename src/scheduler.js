const cron = require('node-cron');
const config = require('./config');
const { postRoster } = require('./commands/generatelist');

function start(client) {
  cron.schedule(
    config.generateListCron,
    async () => {
      try {
        const channel = await client.channels.fetch(config.channelId);
        await postRoster(channel, config.guildId);
      } catch (err) {
        console.error('Scheduled roster generation failed:', err);
      }
    },
    { timezone: config.timezone }
  );
}

module.exports = { start };
