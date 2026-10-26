const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function sendRoleNotification(member, role, granted) {
  const embed = new EmbedBuilder()
    .setColor(granted ? config.successColor : config.dangerColor)
    .setDescription(
      `${config.serverName} topluluk etiketini ${granted ? 'kullanıp desteklediğin' : 'kaldırdığın'} için ` +
      `**${role.name}** rolü ${granted ? 'verildi.' : 'alındı.'}`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 64 }));

  await member.send({ embeds: [embed] }).catch(() => null);
}

async function syncCommunityTagRole(member) {
  if (!config.communityTagRoleId) return;

  const role = member.guild.roles.cache.get(config.communityTagRoleId)
    || await member.guild.roles.fetch(config.communityTagRoleId).catch(() => null);

  if (!role) {
    console.error(`[Community Tag] ${member.guild.name} sunucusunda COMMUNITY_TAG_ROLE_ID rolü bulunamadı.`);
    return;
  }

  const user = await member.user.fetch().catch(() => member.user);
  const primaryGuild = user.primaryGuild;
  const normalizeTag = (tag) => tag?.normalize('NFKD').replace(/\u0307/g, '').toUpperCase();
  const usesCommunityTag = primaryGuild?.identityEnabled === true
    && normalizeTag(primaryGuild.tag) === normalizeTag(config.communityTag);
  const hasRole = member.roles.cache.has(role.id);

  if (usesCommunityTag && !hasRole) {
    if (!role.editable) throw new Error(`"${role.name}" rolünü bot yönetemiyor. Botun Manage Roles izni ve en yüksek rolü bu rolün üstünde olmalı.`);
    await member.roles.add(role, 'Üye sunucu topluluk etiketini kullanmaya başladı.');
    await sendRoleNotification(member, role, true);
  } else if (!usesCommunityTag && hasRole) {
    if (!role.editable) throw new Error(`"${role.name}" rolünü bot yönetemiyor. Botun Manage Roles izni ve en yüksek rolü bu rolün üstünde olmalı.`);
    await member.roles.remove(role, 'Üye sunucu topluluk etiketini kullanmayı bıraktı.');
    await sendRoleNotification(member, role, false);
  }
}

module.exports = { syncCommunityTagRole };
