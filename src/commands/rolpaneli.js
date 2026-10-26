const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { getGuildSettings } = require('../utils/guildSettings');

const data = new SlashCommandBuilder()
  .setName('rolpaneli')
  .setDescription('Doğrulama veya buton rol paneli gönder.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
  .addSubcommand((s) => s.setName('dogrulama').setDescription('Doğrulama butonu paneli gönder.'))
  .addSubcommand((s) => s.setName('buton-rolu').setDescription('Tek butonla rol alma paneli gönder.').addRoleOption((o) => o.setName('rol').setDescription('Verilecek/alınacak rol').setRequired(true)).addStringOption((o) => o.setName('aciklama').setDescription('Panel açıklaması').setRequired(true).setMaxLength(500)));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) return interaction.reply({ content: 'Rolleri Yönet yetkisi gerekir.', ephemeral: true });
  const sub = interaction.options.getSubcommand();
  let row;
  let embed;
  if (sub === 'dogrulama') {
    const settings = await getGuildSettings(interaction.guildId);
    if (!settings.verifiedRoleId) return interaction.reply({ content: 'Önce `/setup dogrulanmis-rolu` ile rol belirle.', ephemeral: true });
    row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verification:confirm').setLabel('Doğrula').setStyle(ButtonStyle.Success));
    embed = new EmbedBuilder().setColor(0x57f287).setTitle('Üye doğrulama').setDescription('Sunucuya erişmek için aşağıdaki butona basıp doğrulan.');
  } else {
    const role = interaction.options.getRole('rol', true);
    if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) return interaction.reply({ content: 'Bot bu rolü yönetemiyor. Bot rolünü hedef rolün üstüne taşı.', ephemeral: true });
    const description = interaction.options.getString('aciklama', true);
    row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`role-toggle:${role.id}`).setLabel(role.name.slice(0, 80)).setStyle(ButtonStyle.Primary));
    embed = new EmbedBuilder().setColor(0x5865f2).setDescription(description);
  }
  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({ content: '✅ Rol paneli gönderildi.', ephemeral: true });
}

module.exports = { data, execute };
