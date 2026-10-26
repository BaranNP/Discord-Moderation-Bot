const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { syncCommunityTagRole } = require('../utils/communityTagRole');
const { getGuildSettings } = require('../utils/guildSettings');
const { readStore } = require('../utils/store');
const { lockGuild } = require('../utils/guildLockdown');
const { log } = require('../utils/logging');

const joins = new Map();
const raidAlertAt = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await syncCommunityTagRole(member).catch((error) => {
      console.error(`[Community Tag] ${member.user.tag} üyesinin rolü güncellenemedi:`, error.message);
    });

    // Discord sunucu etiketini üye katılımından birkaç saniye sonra döndürebilir.
    // İlk kontrolde henüz görünmüyorsa yeni profil verisiyle tekrar dene.
    void (async () => {
      if (!config.communityTagRoleId) return;
      for (const delay of [3000, 7000]) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const freshMember = await member.guild.members.fetch({ user: member.id, force: true }).catch((error) => {
          console.error(`[Community Tag] ${member.user.tag} yeni üye kontrolü alınamadı:`, error.message);
          return null;
        });
        if (!freshMember) return;
        await syncCommunityTagRole(freshMember).catch((error) => {
          console.error(`[Community Tag] ${member.user.tag} gecikmeli rol kontrolü başarısız:`, error.message);
        });
        if (freshMember.roles.cache.has(config.communityTagRoleId)) return;
      }
    })();

    const blacklist = await readStore('blacklist', []);
    const listed = blacklist.find((entry) => entry.guildId === member.guild.id && entry.userId === member.id);
    if (listed) {
      await member.ban({ reason: `Kara liste: ${listed.reason || 'Sebep belirtilmedi.'}` }).catch((error) => {
        console.error(`[Blacklist] ${member.user.tag} otomatik yasaklanamadı:`, error.message);
      });
      return;
    }

    const settings = await getGuildSettings(member.guild.id);
    const now = Date.now();
    const recent = (joins.get(member.guild.id) || []).filter((time) => now - time < 10_000);
    recent.push(now);
    joins.set(member.guild.id, recent);
    const alertKey = member.guild.id;
    if (recent.length >= settings.raidThreshold && now - (raidAlertAt.get(alertKey) || 0) > 10 * 60_000) {
      raidAlertAt.set(alertKey, now);
      try {
        const result = await lockGuild(member.guild);
        await log(member.guild, '🚨 Raid algılandı', `${recent.length} üye 10 saniye içinde katıldı. Sunucu otomatik kilitlendi (${result.changed} kanal). Kilidi yetkili /unlockdown ile açabilir.`, 0xed4245);
      } catch (error) {
        console.error('[Raid]', error.message);
      }
    }
    if (settings.autoRoleId) {
      const autoRole = await member.guild.roles.fetch(settings.autoRoleId).catch(() => null);
      if (autoRole) await member.roles.add(autoRole, 'Otomatik üye rolü').catch((error) => console.error('[Oto Rol]', error.message));
    }

    const welcomeChannelId = settings.welcomeChannelId || config.welcomeChannelId;
    if (!welcomeChannelId) return;

    const channel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
    if (!channel) return;

    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${config.botName} - HOŞ GELDİN!`)
      .setDescription(settings.welcomeMessage
        .replaceAll('{user}', `${member}`)
        .replaceAll('{server}', member.guild.name)
        .replaceAll('{count}', String(memberCount)))
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: config.botName })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  },
};
