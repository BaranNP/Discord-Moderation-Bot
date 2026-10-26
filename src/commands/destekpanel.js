const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Bu kanala destek ticket panelini gönderir.'),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '🚫 Bu komutu kullanma yetkin yok.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🎫 ${config.botName} Destek Sistemi`)
      .setDescription(
        '📨 Destek talebi açıp bir yetkilinin bakmasını bekleyin. Lütfen talep içerisinde saygılı olun; aksi takdirde talebiniz kapatılabilir ve işlem uygulanabilir.\n\n' +
          '🛒 **Satın Alım**\n' +
          'Ürün veya hizmet satın almak için bu bileti seç.\n\n' +
          '🤝 **Diğer**\n' +
          'Diğer destek talepleri için bu bileti seç.\n\n' +
          '📁 **Bilgi Al**\n' +
          'Ek bilgi almak için bu bileti seç.'
      )
      .setFooter({ text: '👇 Bir kategori seçerek ticket açabilirsin.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('🎫 Bir kategori seç...')
        .addOptions(
          { label: 'Satın Alım', description: 'Ürün veya hizmet satın almak için bu bileti seç.', value: 'satin_alim', emoji: '🛒' },
          { label: 'Diğer', description: 'Diğer destek talepleri için bu bileti seç.', value: 'diger', emoji: '🤝' },
          { label: 'Bilgi Al', description: 'Ek bilgi almak için bu bileti seç.', value: 'bilgi_al', emoji: '📁' }
        )
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel gönderildi.', ephemeral: true });
  },
};
