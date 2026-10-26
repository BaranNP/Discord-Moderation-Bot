const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

const data = new SlashCommandBuilder().setName('ip').setDescription('Sunucu ve bağlantı adreslerini göster.');

function makeEmbed() {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${config.serverName} | Sunucu Bilgileri`)
    .setDescription(`**Bağlantı Adresi:**\n${config.defaultIp}\n\n**Mobil Bağlantı Noktası**\n${config.bedrockPort}\n\n**Sürüm**\n${config.defaultVersion}\n\n**Web Sitesi**\n[Tıkla ve git](${config.websiteUrl})\n\n**Oy Ver**\n[Tıkla ve git](${config.voteUrl})`)
    .setTimestamp()
    .setColor(config.embedColor);
}

async function execute(interaction) {
  return interaction.reply({ embeds: [makeEmbed()] });
}

module.exports = { data, execute, makeEmbed };
