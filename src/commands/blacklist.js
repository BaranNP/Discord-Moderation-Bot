const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { readStore, updateStore } = require('../utils/store');

const data = new SlashCommandBuilder()
  .setName('blacklist')
  .setDescription('Sunucu kara listesini yönet.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addSubcommand((s) => s.setName('ekle').setDescription('Kullanıcıyı kara listeye al.').addStringOption((o) => o.setName('kullanici_id').setDescription('Discord kullanıcı ID’si').setRequired(true)).addStringOption((o) => o.setName('sebep').setDescription('Sebep').setRequired(true).setMaxLength(400)))
  .addSubcommand((s) => s.setName('sil').setDescription('Kullanıcıyı kara listeden çıkar.').addStringOption((o) => o.setName('kullanici_id').setDescription('Discord kullanıcı ID’si').setRequired(true)))
  .addSubcommand((s) => s.setName('liste').setDescription('Kara listeyi göster.'));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: 'Sunucuyu Yönet yetkisi gerekir.', ephemeral: true });
  const action = interaction.options.getSubcommand();
  const entries = await readStore('blacklist', []);
  if (action === 'liste') {
    const guildEntries = entries.filter((entry) => entry.guildId === interaction.guildId);
    return interaction.reply({ content: guildEntries.length ? guildEntries.map((entry) => `• <@${entry.userId}> — ${entry.reason}`).join('\n').slice(0, 1900) : 'Kara liste boş.', ephemeral: true, allowedMentions: { parse: [] } });
  }

  const userId = interaction.options.getString('kullanici_id', true).trim();
  if (!/^\d{17,20}$/.test(userId)) return interaction.reply({ content: 'Geçerli bir Discord kullanıcı ID’si gir.', ephemeral: true });
  let changed = false;
  if (action === 'ekle') {
    const reason = interaction.options.getString('sebep', true);
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'Botta **Üyeleri Yasakla** izni yok; kara listeye eklemeden önce bu izni bot rolüne ver.', ephemeral: true });
    }
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({ content: 'Bot bu üyeyi yasaklayamıyor. Bot rolünü hedef üyenin en yüksek rolünün üstüne taşı; sunucu sahibi yasaklanamaz.', ephemeral: true });
    }
    await updateStore('blacklist', [], (list) => {
      if (!list.some((entry) => entry.guildId === interaction.guildId && entry.userId === userId)) {
        list.push({ guildId: interaction.guildId, userId, reason, addedBy: interaction.user.id, addedAt: Date.now() });
        changed = true;
      }
    });
    if (member) await member.ban({ reason: `Kara liste: ${reason}` });
    return interaction.reply({ content: changed ? `✅ <@${userId}> kara listeye eklendi${member ? ' ve yasaklandı' : ''}.` : 'Bu kullanıcı zaten kara listede.', ephemeral: true, allowedMentions: { parse: [] } });
  }

  await updateStore('blacklist', [], (list) => {
    const index = list.findIndex((entry) => entry.guildId === interaction.guildId && entry.userId === userId);
    if (index >= 0) { list.splice(index, 1); changed = true; }
  });
  return interaction.reply({ content: changed ? `✅ <@${userId}> kara listeden çıkarıldı.` : 'Kullanıcı kara listede bulunamadı.', ephemeral: true, allowedMentions: { parse: [] } });
}

module.exports = { data, execute };
