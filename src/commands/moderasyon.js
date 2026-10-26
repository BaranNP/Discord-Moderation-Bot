const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');
const config = require('../config');
const { updateStore, readStore } = require('../utils/store');
const { parseDuration, formatDuration } = require('../utils/duration');
const { getGuildSettings } = require('../utils/guildSettings');
const { lockGuild, unlockGuild } = require('../utils/guildLockdown');

const FLAGS = PermissionsBitField.Flags;
const FALLBACK = { guilds: {} };

function can(member, permission) {
  return member.permissions.has(FLAGS.Administrator) || member.permissions.has(permission);
}

function reply(interaction, description, color = config.embedColor) {
  const payload = {
    embeds: [new EmbedBuilder().setColor(color).setDescription(description).setTimestamp()],
  };
  return interaction.deferred || interaction.replied
    ? interaction.editReply(payload)
    : interaction.reply({ ...payload, ephemeral: true });
}

function addCase(data, guildId, entry) {
  data.guilds[guildId] ||= [];
  const items = data.guilds[guildId];
  const caseId = items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
  items.push({ id: caseId, createdAt: Date.now(), active: true, ...entry });
  return caseId;
}

async function recordCase(guildId, entry) {
  let caseId;
  await updateStore('moderation', FALLBACK, (data) => {
    caseId = addCase(data, guildId, entry);
  });
  return caseId;
}

async function executeModeration(interaction) {
  const action = interaction.commandName;
  const actor = interaction.member;
  const guild = interaction.guild;
  if (!guild) return reply(interaction, 'Bu komut yalnızca sunucuda kullanılabilir.', config.dangerColor);

  const required = {
    ban: FLAGS.BanMembers,
    unban: FLAGS.BanMembers,
    kick: FLAGS.KickMembers,
    timeout: FLAGS.ModerateMembers,
    untimeout: FLAGS.ModerateMembers,
    warn: FLAGS.ModerateMembers,
    warnings: FLAGS.ModerateMembers,
    'warn-remove': FLAGS.ModerateMembers,
    purge: FLAGS.ManageMessages,
    nick: FLAGS.ManageNicknames,
    jail: FLAGS.ManageRoles,
    unjail: FLAGS.ManageRoles,
    lock: FLAGS.ManageChannels,
    unlock: FLAGS.ManageChannels,
    lockdown: FLAGS.ManageGuild,
    unlockdown: FLAGS.ManageGuild,
    cases: FLAGS.ModerateMembers,
  }[action];

  if (!can(actor, required)) return reply(interaction, 'Bu işlem için yetkin yok.', config.dangerColor);
  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember) return reply(interaction, 'Botun sunucu üyesi bilgisi alınamadı; tekrar dene.', config.dangerColor);
  const botRequirements = {
    ban: [FLAGS.BanMembers], unban: [FLAGS.BanMembers], kick: [FLAGS.KickMembers],
    timeout: [FLAGS.ModerateMembers], untimeout: [FLAGS.ModerateMembers],
    purge: [FLAGS.ManageMessages], nick: [FLAGS.ManageNicknames],
    jail: [FLAGS.ManageRoles], unjail: [FLAGS.ManageRoles],
  }[action] || [];
  const missingBotPermission = botRequirements.find((permission) => !botMember.permissions.has(permission));
  if (missingBotPermission) {
    const permissionNames = new Map([
      [FLAGS.BanMembers, 'Üyeleri Yasakla'], [FLAGS.KickMembers, 'Üyeleri At'],
      [FLAGS.ModerateMembers, 'Üyeleri Zaman Aşımına Uğrat'], [FLAGS.ManageNicknames, 'Takma Adları Yönet'],
      [FLAGS.ManageRoles, 'Rolleri Yönet'], [FLAGS.ManageMessages, 'Mesajları Yönet'],
      [FLAGS.ManageChannels, 'Kanalları Yönet'],
    ]);
    return reply(interaction, `Bu işlem için botta **${permissionNames.get(missingBotPermission)}** izni eksik. Bot rolüne bu izni ver.`, config.dangerColor);
  }
  await interaction.deferReply({ ephemeral: true });

  if (action === 'ban') {
    const user = interaction.options.getUser('uye', true);
    const durationText = interaction.options.getString('sure');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const duration = durationText ? parseDuration(durationText, 365 * 86_400_000) : null;
    if (durationText && !duration) return reply(interaction, 'Süre biçimi geçersiz. Örnek: `2h`, `3d`, `1w` (en fazla 365 gün).', config.dangerColor);
    const targetMember = await guild.members.fetch(user.id).catch(() => null);
    if (targetMember && !targetMember.bannable) return reply(interaction, 'Bot bu üyeyi yasaklayamıyor. Üye sunucu sahibi olabilir veya en yüksek rolü botun rolüyle aynı/yukarıda olabilir.', config.dangerColor);
    await guild.members.ban(user.id, { reason: `${reason} | Yetkili: ${interaction.user.tag}` });
    const caseId = await recordCase(guild.id, { type: 'ban', userId: user.id, moderatorId: interaction.user.id, reason, durationMs: duration });
    if (duration) {
      await updateStore('tempBans', [], (items) => {
        items.push({ guildId: guild.id, userId: user.id, expiresAt: Date.now() + duration, caseId });
      });
    }
    return reply(interaction, `🔨 **${user.tag}** yasaklandı. Ceza kaydı: **#${caseId}**${duration ? ` · Süre: **${formatDuration(duration)}**` : ' · Süresiz'}`, config.dangerColor);
  }

  if (action === 'unban') {
    const userId = interaction.options.getString('kullanici_id', true).trim();
    if (!/^\d{17,20}$/.test(userId)) return reply(interaction, 'Geçerli bir kullanıcı ID’si gir.', config.dangerColor);
    await guild.members.unban(userId, interaction.options.getString('sebep') || 'Yetkili tarafından kaldırıldı.');
    await updateStore('tempBans', [], (items) => {
      for (let i = items.length - 1; i >= 0; i--) if (items[i].guildId === guild.id && items[i].userId === userId) items.splice(i, 1);
    });
    const caseId = await recordCase(guild.id, { type: 'unban', userId, moderatorId: interaction.user.id, reason: interaction.options.getString('sebep') || 'Belirtilmedi.' });
    return reply(interaction, `✅ <@${userId}> yasağı kaldırıldı. Kayıt: **#${caseId}**`, config.successColor);
  }

  if (action === 'kick' || action === 'timeout' || action === 'untimeout' || action === 'warn' || action === 'nick' || action === 'jail' || action === 'unjail') {
    const member = interaction.options.getMember('uye', true);
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    if (member.id === interaction.user.id) return reply(interaction, 'Kendin üzerinde bu işlemi yapamazsın.', config.dangerColor);
    if (member.id === guild.ownerId || member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== guild.ownerId) {
      return reply(interaction, 'Bu üye rol hiyerarşisinde senden üstte veya sunucu sahibi.', config.dangerColor);
    }

    if (action === 'kick') {
      if (!member.kickable) return reply(interaction, 'Bot bu üyeyi sunucudan atamıyor. Bot rolünü hedef üyenin en yüksek rolünün üstüne taşı.', config.dangerColor);
      const userId = member.id;
      await member.kick(`${reason} | Yetkili: ${interaction.user.tag}`);
      const caseId = await recordCase(guild.id, { type: 'kick', userId, moderatorId: interaction.user.id, reason });
      return reply(interaction, `👢 **${member.user.tag}** sunucudan atıldı. Kayıt: **#${caseId}**`, config.warningColor);
    }

    if (action === 'timeout') {
      if (!member.moderatable) return reply(interaction, 'Bot bu üyeye zaman aşımı uygulayamıyor. Botun rol sırasını ve **Üyeleri Zaman Aşımına Uğrat** iznini kontrol et.', config.dangerColor);
      const durationText = interaction.options.getString('sure', true);
      const duration = parseDuration(durationText);
      if (!duration) return reply(interaction, 'Süre 1 dakikadan 28 güne kadar olmalı. Örnek: `30m`, `2h`, `3d`, `1w`.', config.dangerColor);
      await member.timeout(duration, `${reason} | Yetkili: ${interaction.user.tag}`);
      const caseId = await recordCase(guild.id, { type: 'timeout', userId: member.id, moderatorId: interaction.user.id, reason, durationMs: duration });
      return reply(interaction, `🔇 **${member.user.tag}** ${formatDuration(duration)} susturuldu. Kayıt: **#${caseId}**`, config.warningColor);
    }

    if (action === 'untimeout') {
      if (!member.moderatable) return reply(interaction, 'Bot bu üyenin zaman aşımını kaldıramıyor. Botun rol sırasını ve **Üyeleri Zaman Aşımına Uğrat** iznini kontrol et.', config.dangerColor);
      await member.timeout(null, reason);
      const caseId = await recordCase(guild.id, { type: 'untimeout', userId: member.id, moderatorId: interaction.user.id, reason });
      return reply(interaction, `🔊 **${member.user.tag}** susturması kaldırıldı. Kayıt: **#${caseId}**`, config.successColor);
    }

    if (action === 'warn') {
      const caseId = await recordCase(guild.id, { type: 'warn', userId: member.id, moderatorId: interaction.user.id, reason });
      const data = await readStore('moderation', FALLBACK);
      const activeWarnings = (data.guilds[guild.id] || []).filter((item) => item.type === 'warn' && item.userId === member.id && item.active !== false).length;
      let escalation = '';
      if (activeWarnings === 2 && member.moderatable) {
        await member.timeout(60 * 60_000, 'İkinci aktif uyarı: otomatik kademeli ceza.');
        escalation = ' İkinci aktif uyarı nedeniyle **1 saat susturma** uygulandı.';
      } else if (activeWarnings === 2) {
        escalation = ' Otomatik 1 saat susturma uygulanamadı; botun zaman aşımı iznini ve rol sırasını kontrol et.';
      } else if (activeWarnings === 3 && member.kickable) {
        await member.kick('Üçüncü aktif uyarı: otomatik kademeli ceza.');
        escalation = ' Üçüncü aktif uyarı nedeniyle üye **sunucudan atıldı**.';
      } else if (activeWarnings === 3) {
        escalation = ' Otomatik atma uygulanamadı; botun üyeleri atma iznini ve rol sırasını kontrol et.';
      } else if (activeWarnings >= 4 && member.bannable) {
        await member.ban({ reason: 'Dördüncü aktif uyarı: otomatik kademeli ceza.' });
        escalation = ' Dördüncü aktif uyarı nedeniyle üye **yasaklandı**.';
      } else if (activeWarnings >= 4) {
        escalation = ' Otomatik yasaklama uygulanamadı; botun üyeleri yasaklama iznini ve rol sırasını kontrol et.';
      }
      await member.send({ embeds: [new EmbedBuilder().setColor(config.warningColor).setDescription(`Sunucuda uyarı aldın. Sebep: **${reason}** · Kayıt **#${caseId}**${escalation}`).setTimestamp()] }).catch(() => null);
      return reply(interaction, `⚠️ **${member.user.tag}** uyarıldı. Aktif uyarı: **${activeWarnings}**. Kayıt: **#${caseId}**.${escalation}`, config.warningColor);
    }

    if (action === 'nick') {
      const nickname = interaction.options.getString('takma_ad');
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(FLAGS.ManageNicknames)) {
        return reply(interaction, 'Botta **Takma Adları Yönet** izni yok. Sunucu ayarlarından bot rolüne bu izni ver.', config.dangerColor);
      }
      if (!member.manageable) {
        return reply(interaction, 'Bot bu üyenin takma adını değiştiremiyor. Botun en yüksek rolünü hedef üyenin en yüksek rolünün üstüne taşı; sunucu sahibi için takma ad değiştirilemez.', config.dangerColor);
      }
      try {
        await member.setNickname(nickname || null, reason);
      } catch (error) {
        if (error.code === 50013) {
          return reply(interaction, 'Discord takma ad değişikliğine izin vermedi. Botun **Takma Adları Yönet** iznini ve rol sırasını kontrol et.', config.dangerColor);
        }
        throw error;
      }
      const caseId = await recordCase(guild.id, { type: 'nick', userId: member.id, moderatorId: interaction.user.id, reason, details: nickname || 'Takma ad temizlendi.' });
      return reply(interaction, `✏️ **${member.user.tag}** takma adı güncellendi. Kayıt: **#${caseId}**`, config.successColor);
    }

    const configuredJailRoleId = (await getGuildSettings(guild.id)).jailRoleId;
    const role = interaction.options.getRole('rol') || (configuredJailRoleId ? await guild.roles.fetch(configuredJailRoleId).catch(() => null) : null);
    if (!role) return reply(interaction, 'Hapishane rolünü `/setup hapishane-rolu` ile ayarla veya bu komutta rol seç.', config.dangerColor);
    if (role.managed || role.position >= botMember.roles.highest.position) return reply(interaction, 'Bu rolü bot yönetemiyor. Bot rolünü hedef rolün üstüne taşı.', config.dangerColor);
    if (!member.manageable) return reply(interaction, 'Bot bu üyeyi yönetemiyor. Bot rolünü hedef üyenin en yüksek rolünün üstüne taşı.', config.dangerColor);
    if (action === 'jail') {
      await member.roles.add(role, `Hapishane: ${reason}`);
    } else {
      await member.roles.remove(role, `Hapishaneden çıkarıldı: ${reason}`);
    }
    const caseId = await recordCase(guild.id, { type: action, userId: member.id, moderatorId: interaction.user.id, reason, details: role.id });
    return reply(interaction, action === 'jail' ? `🔒 **${member.user.tag}** hapishane rolüne alındı. Kayıt: **#${caseId}**` : `🔓 **${member.user.tag}** hapishane rolü kaldırıldı. Kayıt: **#${caseId}**`, config.warningColor);
  }

  if (action === 'warnings' || action === 'cases') {
    const user = interaction.options.getUser('uye', true);
    const data = await readStore('moderation', FALLBACK);
    const records = (data.guilds[guild.id] || []).filter((item) => item.userId === user.id && (action === 'cases' || item.type === 'warn')).slice(-10).reverse();
    if (!records.length) return reply(interaction, `**${user.tag}** için kayıt bulunamadı.`);
    const lines = records.map((item) => `**#${item.id}** · ${item.type} · ${item.active === false ? 'kaldırıldı' : 'aktif'} · <t:${Math.floor(item.createdAt / 1000)}:R> · ${item.reason || 'Sebep yok'}`);
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle(`${user.tag} — ${action === 'cases' ? 'Ceza geçmişi' : 'Uyarılar'}`).setDescription(lines.join('\n').slice(0, 4000))] });
  }

  if (action === 'warn-remove') {
    const user = interaction.options.getUser('uye', true);
    const caseId = interaction.options.getInteger('kayit', true);
    let found = false;
    await updateStore('moderation', FALLBACK, (data) => {
      const record = (data.guilds[guild.id] || []).find((item) => item.id === caseId && item.userId === user.id && item.type === 'warn' && item.active !== false);
      if (record) { record.active = false; record.removedBy = interaction.user.id; record.removedAt = Date.now(); found = true; }
    });
    return reply(interaction, found ? `✅ **#${caseId}** uyarısı kaldırıldı.` : 'Aktif uyarı kaydı bulunamadı.', found ? config.successColor : config.dangerColor);
  }

  if (action === 'purge') {
    const channelPermissions = interaction.channel.permissionsFor(botMember);
    if (!channelPermissions?.has([FLAGS.ViewChannel, FLAGS.ReadMessageHistory, FLAGS.ManageMessages])) {
      return reply(interaction, 'Bot bu kanalda mesajları göremiyor veya silemiyor. Kanal izinlerinden **Kanalı Görüntüle**, **Mesaj Geçmişini Oku** ve **Mesajları Yönet** izinlerini ver.', config.dangerColor);
    }
    const amount = interaction.options.getInteger('adet', true);
    const target = interaction.options.getUser('uye');
    if (target) {
      const recent = await interaction.channel.messages.fetch({ limit: 100 });
      const matches = recent.filter((message) => message.author.id === target.id).first(amount);
      const deleted = await interaction.channel.bulkDelete(matches, true);
      return reply(interaction, `🧹 **${deleted.size}** mesaj silindi${target ? ` (**${target.tag}**)` : ''}.`, config.successColor);
    }
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return reply(interaction, `🧹 **${deleted.size}** mesaj silindi.`, config.successColor);
  }

  if (action === 'lock' || action === 'unlock') {
    const channel = interaction.options.getChannel('kanal') || interaction.channel;
    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return reply(interaction, 'Yalnızca metin kanalları kilitlenebilir.', config.dangerColor);
    const channelPermissions = channel.permissionsFor(botMember);
    if (!channelPermissions?.has([FLAGS.ViewChannel, FLAGS.ManageChannels, FLAGS.ManageRoles])) {
      return reply(interaction, 'Bot bu kanalda izinleri değiştiremiyor. Kanal izinlerinde **Kanalları Yönet** ve **Rolleri Yönet** izinlerini kontrol et.', config.dangerColor);
    }
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: action === 'lock' ? false : null }, { reason: `${action === 'lock' ? 'Kanal kilitlendi' : 'Kanal açıldı'}: ${interaction.user.tag}` });
    return reply(interaction, action === 'lock' ? `🔒 ${channel} kilitlendi.` : `🔓 ${channel} kilidi kaldırıldı.`, config.successColor);
  }

  if (action === 'lockdown') {
    const result = await lockGuild(guild);
    return reply(interaction, result.alreadyLocked ? 'Sunucu zaten kilitli.' : `🚨 Sunucu kilitlendi. **${result.changed}** metin kanalı kapatıldı.${result.failed ? ` ${result.failed} kanalda bot izinleri yetersiz olduğu için kilitleme yapılamadı; botun kanal izinlerini kontrol et.` : ''} Kilidi kaldırmak için /unlockdown kullan.`, result.failed ? config.warningColor : config.dangerColor);
  }

  if (action === 'unlockdown') {
    const result = await unlockGuild(guild);
    return reply(interaction, result.wasLocked ? `✅ **${result.changed}** kanal önceki izinlerine döndürüldü.${result.pending ? ` ${result.pending} kanalda bot izni olmadığı için kayıt korundu; izni düzeltip komutu yeniden çalıştır.` : ''}` : 'Kayıtlı bir sunucu kilidi bulunamadı.', result.pending ? config.warningColor : config.successColor);
  }
}

const commonReason = (option) => option.setName('sebep').setDescription('İşlem sebebi');
const user = (description = 'Üye') => (option) => option.setName('uye').setDescription(description).setRequired(true);
const string = (name, description, required = false) => (option) => option.setName(name).setDescription(description).setRequired(required);
const definitions = {
  ban: ['Üyeyi yasakla; isteğe bağlı süre ver.', (b) => b.addUserOption(user('Yasaklanacak üye')).addStringOption(commonReason).addStringOption(string('sure', 'Örn. 2h, 3d, 1w; boşsa süresiz'))],
  unban: ['Kullanıcı yasağını kaldır.', (b) => b.addStringOption(string('kullanici_id', 'Discord kullanıcı ID’si', true)).addStringOption(commonReason)],
  kick: ['Üyeyi sunucudan at.', (b) => b.addUserOption(user('Atılacak üye')).addStringOption(commonReason)],
  timeout: ['Üyeyi süreli sustur (en fazla 28 gün).', (b) => b.addUserOption(user('Susturulacak üye')).addStringOption(string('sure', 'Örn. 30m, 2h, 3d, 1w', true)).addStringOption(commonReason)],
  untimeout: ['Üyenin susturmasını kaldır.', (b) => b.addUserOption(user()).addStringOption(commonReason)],
  warn: ['Üyeye uyarı ver; kademeli ceza uygular.', (b) => b.addUserOption(user('Uyarılacak üye')).addStringOption((o) => o.setName('sebep').setDescription('Uyarı sebebi').setRequired(true))],
  warnings: ['Üyenin uyarı geçmişini göster.', (b) => b.addUserOption(user())],
  'warn-remove': ['Uyarı kaydını kaldır.', (b) => b.addUserOption(user()).addIntegerOption((o) => o.setName('kayit').setDescription('Uyarı kayıt numarası').setRequired(true).setMinValue(1))],
  cases: ['Üyenin ceza geçmişini göster.', (b) => b.addUserOption(user())],
  purge: ['Son mesajları toplu sil.', (b) => b.addIntegerOption((o) => o.setName('adet').setDescription('1-100 arası mesaj sayısı').setRequired(true).setMinValue(1).setMaxValue(100)).addUserOption((o) => o.setName('uye').setDescription('Yalnızca bu üyenin mesajlarını sil'))],
  nick: ['Üyenin takma adını değiştir veya boş bırakarak temizle.', (b) => b.addUserOption(user()).addStringOption((o) => o.setName('takma_ad').setDescription('Yeni ad; boş bırakırsan temizlenir.').setMaxLength(32)).addStringOption(commonReason)],
  jail: ['Üyeye hapishane rolü ver.', (b) => b.addUserOption(user()).addRoleOption((o) => o.setName('rol').setDescription('Varsayılan hapishane rolü kullanılabilir.')).addStringOption(commonReason)],
  unjail: ['Üyeden hapishane rolünü kaldır.', (b) => b.addUserOption(user()).addRoleOption((o) => o.setName('rol').setDescription('Varsayılan hapishane rolü kullanılabilir.')).addStringOption(commonReason)],
  lock: ['Metin kanalını kilitle.', (b) => b.addChannelOption((o) => o.setName('kanal').setDescription('Kanal; boşsa bu kanal'))],
  unlock: ['Metin kanalı kilidini aç.', (b) => b.addChannelOption((o) => o.setName('kanal').setDescription('Kanal; boşsa bu kanal'))],
  lockdown: ['Tüm metin kanallarını acil kilitle.', () => {}],
  unlockdown: ['Sunucu kilidini önceki kanal izinleriyle aç.', () => {}],
};

const data = Object.entries(definitions).map(([name, [description, addOptions]]) => {
  const builder = new SlashCommandBuilder().setName(name).setDescription(description);
  addOptions(builder);
  return builder;
});

module.exports = { data, execute: executeModeration };
