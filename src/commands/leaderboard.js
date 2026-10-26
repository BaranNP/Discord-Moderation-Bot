const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readStore } = require('../utils/store');
const config = require('../config');

const data = new SlashCommandBuilder().setName('leaderboard').setDescription('Sunucunun seviye/XP sıralamasını göster.');

async function execute(interaction) {
  const store = await readStore('xp', { guilds: {} });
  const entries = Object.entries(store.guilds[interaction.guildId] || {}).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
  if (!entries.length) return interaction.reply({ content: 'Henüz XP kaydı yok.', ephemeral: true });
  const lines = entries.map(([userId, stats], index) => `**${index + 1}.** <@${userId}> — Seviye **${stats.level}**, ${stats.xp} XP`);
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle(`${interaction.guild.name} — XP sıralaması`).setDescription(lines.join('\n'))], allowedMentions: { parse: [] } });
}

module.exports = { data, execute };
