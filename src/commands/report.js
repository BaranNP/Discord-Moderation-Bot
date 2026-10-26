const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getGuildSettings } = require('../utils/guildSettings');

const data = new SlashCommandBuilder()
  .setName('report')
  .setDescription('Bir üyeyi moderatörlere bildir.')
  .addUserOption((o) => o.setName('uye').setDescription('Bildirilecek üye').setRequired(true))
  .addStringOption((o) => o.setName('sebep').setDescription('Rapor sebebi').setRequired(true).setMaxLength(500))
  .addStringOption((o) => o.setName('mesaj_linki').setDescription('İsteğe bağlı mesaj bağlantısı').setMaxLength(500));

async function execute(interaction) {
  const target = interaction.options.getUser('uye', true);
  const reason = interaction.options.getString('sebep', true);
  const link = interaction.options.getString('mesaj_linki');
  if (target.id === interaction.user.id || target.bot) return interaction.reply({ content: 'Bu kullanıcıyı raporlayamazsın.', ephemeral: true });
  const settings = await getGuildSettings(interaction.guildId);
  const logChannel = settings.logChannelId ? await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null) : null;
  if (!logChannel?.isTextBased()) return interaction.reply({ content: 'Rapor kanalı ayarlanmamış. Yönetici `/setup log` komutunu kullanmalı.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(config.warningColor)
    .setTitle('Yeni üye raporu')
    .addFields(
      { name: 'Raporlayan', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
      { name: 'Bildirilen', value: `${target.tag} (${target.id})`, inline: true },
      { name: 'Kanal', value: `${interaction.channel}`, inline: true },
      { name: 'Sebep', value: reason },
      ...(link ? [{ name: 'Mesaj bağlantısı', value: link }] : [])
    )
    .setTimestamp();
  await logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  return interaction.reply({ content: '✅ Raporun moderatör ekibine iletildi.', ephemeral: true });
}

module.exports = { data, execute };
