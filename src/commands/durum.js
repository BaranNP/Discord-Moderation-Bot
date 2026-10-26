const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getMinecraftStatus } = require('../utils/minecraftStatus');

const data = new SlashCommandBuilder().setName('durum').setDescription('Minecraft sunucusunun çevrimiçi durumunu göster.');

async function execute(interaction) {
  await interaction.deferReply();
  try {
    const status = await getMinecraftStatus(config.minecraftServerAddress, config.minecraftServerPort);
    const description = status.description?.text || status.description?.extra?.map((part) => part.text || '').join('') || 'Sunucu çevrimiçi.';
    const embed = new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle(`${config.serverName} — Sunucu Durumu`)
      .setDescription(`🟢 **Çevrimiçi**\n${description}`)
      .addFields(
        { name: 'Bağlantı Adresi', value: config.defaultIp, inline: true },
        { name: 'Oyuncular', value: `${status.players?.online ?? 0}/${status.players?.max ?? '?'}`, inline: true },
        { name: 'Sürüm', value: status.version?.name || config.defaultVersion, inline: true },
      ).setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch {
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.dangerColor).setTitle(`${config.serverName} — Sunucu Durumu`).setDescription(`🔴 **Çevrimdışı veya yanıt vermiyor**\nBağlantı adresi: ${config.defaultIp}`).setTimestamp()] });
  }
}

module.exports = { data, execute };
