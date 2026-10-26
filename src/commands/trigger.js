const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { readStore, updateStore } = require('../utils/store');

const data = new SlashCommandBuilder()
  .setName('trigger')
  .setDescription('Özel mesaj tetikleyicilerini yönet.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addSubcommand((s) => s.setName('ekle').setDescription('Mesaj tetikleyicisi ekle.').addStringOption((o) => o.setName('ifade').setDescription('Tam eşleşecek mesaj').setRequired(true).setMaxLength(150)).addStringOption((o) => o.setName('yanit').setDescription('Bot yanıtı').setRequired(true).setMaxLength(1500)))
  .addSubcommand((s) => s.setName('sil').setDescription('Tetikleyiciyi sıra numarasıyla sil.').addIntegerOption((o) => o.setName('numara').setDescription('Liste numarası').setRequired(true).setMinValue(1)))
  .addSubcommand((s) => s.setName('liste').setDescription('Tetikleyicileri göster.'));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: 'Sunucuyu Yönet yetkisi gerekir.', ephemeral: true });
  const entries = await readStore('triggers', { guilds: {} });
  const list = entries.guilds[interaction.guildId] || [];
  const action = interaction.options.getSubcommand();
  if (action === 'liste') return interaction.reply({ content: list.length ? list.map((item, index) => `${index + 1}. **${item.phrase}** → ${item.response}`).join('\n').slice(0, 1900) : 'Tetikleyici yok.', ephemeral: true });
  if (action === 'ekle') {
    const phrase = interaction.options.getString('ifade', true).trim();
    const response = interaction.options.getString('yanit', true).trim();
    await updateStore('triggers', { guilds: {} }, (store) => { store.guilds[interaction.guildId] ||= []; store.guilds[interaction.guildId].push({ phrase, response, addedBy: interaction.user.id }); });
    return interaction.reply({ content: `✅ **${phrase}** tetikleyicisi eklendi.`, ephemeral: true });
  }
  const index = interaction.options.getInteger('numara', true) - 1;
  let removed;
  await updateStore('triggers', { guilds: {} }, (store) => { const items = store.guilds[interaction.guildId] || []; if (index >= 0 && index < items.length) removed = items.splice(index, 1)[0]; });
  return interaction.reply({ content: removed ? `✅ **${removed.phrase}** kaldırıldı.` : 'Bu numarada tetikleyici yok.', ephemeral: true });
}

module.exports = { data, execute };
