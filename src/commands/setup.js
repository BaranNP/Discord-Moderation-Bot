const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');

const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Sunucu moderasyon botu ayarları')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addSubcommand((s) => s.setName('durum').setDescription('Sunucu ayarlarını göster.'))
  .addSubcommand((s) => s.setName('log').setDescription('Denetim ve moderasyon log kanalını ayarla; boş bırakarak sıfırla.').addChannelOption((o) => o.setName('kanal').setDescription('Log kanalı').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) => s.setName('hosgeldin').setDescription('Hoş geldin kanalını ayarla; boş bırakarak sıfırla.').addChannelOption((o) => o.setName('kanal').setDescription('Kanal').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) => s.setName('hosgeldin-mesaji').setDescription('Mesaj şablonunu düzenle. {user}, {server}, {count} alanlarını kullan.').addStringOption((o) => o.setName('metin').setDescription('Hoş geldin metni').setRequired(true).setMaxLength(500)))
  .addSubcommand((s) => s.setName('veda').setDescription('Ayrılan üye mesaj kanalını ayarla; boş bırakarak sıfırla.').addChannelOption((o) => o.setName('kanal').setDescription('Veda kanalı').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) => s.setName('veda-mesaji').setDescription('Veda metnini düzenle. {user}, {server}, {count} alanlarını kullan.').addStringOption((o) => o.setName('metin').setDescription('Veda mesajı').setRequired(true).setMaxLength(500)))
  .addSubcommand((s) => s.setName('oto-rol').setDescription('Yeni üyeye verilecek rolü ayarla; boş bırakarak sıfırla.').addRoleOption((o) => o.setName('rol').setDescription('Otomatik rol')))
  .addSubcommand((s) => s.setName('hapishane-rolu').setDescription('Hapishane rolünü ayarla; boş bırakarak sıfırla.').addRoleOption((o) => o.setName('rol').setDescription('Hapishane rolü')))
  .addSubcommand((s) => s.setName('dogrulanmis-rolu').setDescription('Doğrulama butonuyla verilecek rolü ayarla.').addRoleOption((o) => o.setName('rol').setDescription('Doğrulanmış rol').setRequired(true)))
  .addSubcommand((s) => s.setName('dogrulama-kanali').setDescription('Doğrulama panelinin kanalını ayarla.').addChannelOption((o) => o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) => s.setName('raid-esigi').setDescription('10 saniyedeki katılım saldırısı eşiğini ayarla.').addIntegerOption((o) => o.setName('uye').setDescription('Eşik (3-50)').setRequired(true).setMinValue(3).setMaxValue(50)))
  .addSubcommand((s) => s.setName('antinuke').setDescription('Yıkıcı işlem korumasını aç veya kapat.').addBooleanOption((o) => o.setName('aktif').setDescription('Açık mı?').setRequired(true)))
  .addSubcommand((s) => s.setName('antinuke-esigi').setDescription('Dakikadaki yıkıcı işlem eşiğini belirle.').addIntegerOption((o) => o.setName('islem').setDescription('Eşik (2-10)').setRequired(true).setMinValue(2).setMaxValue(10)));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    return interaction.reply({ content: 'Bu ayar için Sunucuyu Yönet yetkisi gerekir.', ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();
  const settingKey = {
    log: 'logChannelId', hosgeldin: 'welcomeChannelId', 'hosgeldin-mesaji': 'welcomeMessage', veda: 'farewellChannelId', 'veda-mesaji': 'farewellMessage',
    'oto-rol': 'autoRoleId', 'hapishane-rolu': 'jailRoleId', 'dogrulanmis-rolu': 'verifiedRoleId',
    'dogrulama-kanali': 'verificationChannelId', 'raid-esigi': 'raidThreshold',
    antinuke: 'antiNukeEnabled', 'antinuke-esigi': 'antiNukeThreshold',
  }[sub];

  if (sub === 'durum') {
    const settings = await getGuildSettings(interaction.guildId);
    return interaction.reply({ content: [
      `Log: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'kapalı'}`,
      `Hoş geldin: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'kapalı'}`,
      `Oto rol: ${settings.autoRoleId ? `<@&${settings.autoRoleId}>` : 'kapalı'}`,
      `Hapishane rolü: ${settings.jailRoleId ? `<@&${settings.jailRoleId}>` : 'ayarlanmadı'}`,
      `Doğrulama rolü: ${settings.verifiedRoleId ? `<@&${settings.verifiedRoleId}>` : 'ayarlanmadı'}`,
      `Raid eşiği: ${settings.raidThreshold} üye/10 saniye`,
      `Anti-nuke: ${settings.antiNukeEnabled ? 'açık' : 'kapalı'} · eşik ${settings.antiNukeThreshold} işlem/dakika`,
    ].join('\n'), ephemeral: true, allowedMentions: { parse: [] } });
  }

  let value;
  if (sub === 'hosgeldin-mesaji' || sub === 'veda-mesaji') value = interaction.options.getString('metin', true);
  else if (sub === 'raid-esigi') value = interaction.options.getInteger('uye', true);
  else if (sub === 'antinuke') value = interaction.options.getBoolean('aktif', true);
  else if (sub === 'antinuke-esigi') value = interaction.options.getInteger('islem', true);
  else if (sub === 'log' || sub === 'hosgeldin' || sub === 'veda' || sub === 'oto-rol' || sub === 'hapishane-rolu') {
    const type = sub.includes('rol') ? 'getRole' : 'getChannel';
    const option = sub === 'log' || sub === 'hosgeldin' || sub === 'veda' ? 'kanal' : 'rol';
    value = interaction.options[type](option)?.id || null;
  } else {
    const type = sub === 'dogrulama-kanali' ? 'getChannel' : 'getRole';
    value = interaction.options[type](sub === 'dogrulama-kanali' ? 'kanal' : 'rol', true).id;
  }

  await updateGuildSettings(interaction.guildId, (settings) => { settings[settingKey] = value; });
  return interaction.reply({ content: value ? '✅ Ayar kaydedildi.' : '✅ Ayar kapatıldı.', ephemeral: true });
}

module.exports = { data, execute };
