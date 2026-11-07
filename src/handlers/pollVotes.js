const { Events } = require('discord.js');
const { getCycleByMessageId } = require('../services/pollCycle');
const pollVotesService = require('../services/pollVotes');

async function resolveAnswerText(pollAnswer) {
  if (pollAnswer.text) return pollAnswer.text;
  try {
    const message = await pollAnswer.poll.message.fetch();
    return message.poll?.answers.get(pollAnswer.id)?.text ?? `Option ${pollAnswer.id}`;
  } catch {
    return `Option ${pollAnswer.id}`;
  }
}

async function resolveDisplayName(guild, userId) {
  try {
    const member = await guild.members.fetch(userId);
    return member.displayName;
  } catch {
    return userId;
  }
}

function register(client) {
  client.on(Events.MessagePollVoteAdd, async (pollAnswer, userId) => {
    try {
      const cycle = getCycleByMessageId(pollAnswer.poll.messageId);
      if (!cycle) return;

      const guild = pollAnswer.poll.message.guild;
      const [answerText, username] = await Promise.all([
        resolveAnswerText(pollAnswer),
        resolveDisplayName(guild, userId),
      ]);

      pollVotesService.upsertVote({
        pollCycleId: cycle.id,
        userId,
        username,
        answerId: pollAnswer.id,
        answerText,
      });
    } catch (err) {
      console.error('Failed to record poll vote:', err);
    }
  });

  client.on(Events.MessagePollVoteRemove, async (pollAnswer, userId) => {
    try {
      const cycle = getCycleByMessageId(pollAnswer.poll.messageId);
      if (!cycle) return;

      pollVotesService.removeVote({ pollCycleId: cycle.id, userId, answerId: pollAnswer.id });
    } catch (err) {
      console.error('Failed to remove poll vote:', err);
    }
  });
}

module.exports = { register };
