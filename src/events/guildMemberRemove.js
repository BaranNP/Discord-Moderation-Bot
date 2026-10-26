const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getGuildSettings } = require('../utils/guildSettings');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const settings = await getGuildSettings(member.guild.id);
    if (settings.logChannelId) {
      const log = await member.guild.channels.fetch(settings.logChannelId).catch(() => null);
      if (log?.isTextBased()) {
        await log.send({ embeds: [new EmbedBuilder().setColor(config.warningColor).setTitle('Üye ayrıldı').setDescription(`${member.user.tag} (${member.id})`).setTimestamp()] }).catch(() => null);
      }
    }
    if (settings.farewellChannelId) {
      const channel = await member.guild.channels.fetch(settings.farewellChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        const description = settings.farewellMessage.replaceAll('{user}', member.user.tag).replaceAll('{server}', member.guild.name).replaceAll('{count}', String(member.guild.memberCount));
        await channel.send({ embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(description).setThumbnail(member.user.displayAvatarURL({ size: 128 })).setTimestamp()] }).catch(() => null);
      }
    }
  },
};
