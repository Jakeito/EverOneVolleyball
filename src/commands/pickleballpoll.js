const { createSportPollCommand } = require('../services/sportPollCommand');

module.exports = createSportPollCommand({
  key: 'pickleball',
  label: 'Pickleball/Badminton',
  commandName: 'pickleballpoll',
});
