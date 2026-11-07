const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

function buildPendingRequestMessage(pendingRequest, guestRows) {
  const names = guestRows.map((g) => `• ${g.guest_name}`).join('\n');
  const embed = new EmbedBuilder()
    .setTitle('Guest approval needed')
    .setDescription(
      `**${pendingRequest.inviter_name}** is already at the 2-guest limit for this week and is ` +
        `requesting room for:\n${names}`
    )
    .setColor(0xf5a623)
    .setFooter({ text: `Request #${pendingRequest.id}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_pending:${pendingRequest.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_pending:${pendingRequest.id}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
  );

  const content = config.adminRoleId ? `<@&${config.adminRoleId}>` : undefined;

  return { content, embeds: [embed], components: [row] };
}

function buildResolvedMessage(pendingRequest, guestRows, resolution) {
  const names = guestRows.map((g) => `• ${g.guest_name}`).join('\n');
  const verb = { approved: 'Approved ✅', rejected: 'Rejected ❌', cancelled: 'Cancelled (withdrawn) ⚪' }[
    resolution
  ];
  const embed = new EmbedBuilder()
    .setTitle('Guest approval needed')
    .setDescription(
      `**${pendingRequest.inviter_name}** requested room for:\n${names}\n\n**${verb}**`
    )
    .setColor(resolution === 'approved' ? 0x2ecc71 : resolution === 'rejected' ? 0xe74c3c : 0x95a5a6)
    .setFooter({ text: `Request #${pendingRequest.id}` });

  return { embeds: [embed], components: [] };
}

module.exports = { buildPendingRequestMessage, buildResolvedMessage };
