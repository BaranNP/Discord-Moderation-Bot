const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('./guildSettings');

async function log(guild, title, description, color = 0x5865f2, fields = []) {
  try {
    const settings = await getGuildSettings(guild.id);
    if (!settings.logChannelId) return;
    const channel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description.slice(0, 4000)).addFields(fields.slice(0, 20)).setTimestamp();
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('[Log]', error.message);
  }
}

module.exports = { log };
