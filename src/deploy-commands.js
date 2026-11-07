const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commandsDir = path.join(__dirname, 'commands');
const commands = fs
  .readdirSync(commandsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(commandsDir, f)).data.toJSON());

const rest = new REST().setToken(config.token);

(async () => {
  console.log(`Registering ${commands.length} slash command(s) to guild ${config.guildId}...`);
  const data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commands,
  });
  console.log(`Registered: ${data.map((c) => c.name).join(', ')}`);
})().catch((err) => {
  console.error('Failed to register slash commands:', err);
  process.exit(1);
});
