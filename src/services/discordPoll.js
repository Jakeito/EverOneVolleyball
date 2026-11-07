/** Ends the native Discord poll on a message, if it's still open. Safe to call on a missing/expired poll. */
async function endPollMessage(channel, messageId) {
  try {
    const message = await channel.messages.fetch(messageId);
    if (message.poll && !message.poll.resultsFinalized) {
      await message.poll.end();
    }
  } catch (err) {
    console.error(`Could not end poll message ${messageId}:`, err.message);
  }
}

module.exports = { endPollMessage };
