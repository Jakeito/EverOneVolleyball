require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

module.exports = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  guildId: required('DISCORD_GUILD_ID'),
  channelId: required('VOLLEYBALL_CHANNEL_ID'),
  adminRoleId: process.env.ADMIN_ROLE_ID || null,
  rosterCap: parseInt(process.env.ROSTER_CAP || '30', 10),
  generateListCron: process.env.GENERATE_LIST_CRON || '0 18 * * 3',
  timezone: process.env.TIMEZONE || 'America/Los_Angeles',
};
