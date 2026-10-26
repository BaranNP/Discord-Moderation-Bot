const { AuditLogEvent, PermissionsBitField } = require('discord.js');
const { getGuildSettings } = require('./guildSettings');
const { log } = require('./logging');

const actions = new Map();
const destructiveEvents = new Set([
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.ChannelCreate,
  AuditLogEvent.RoleCreate,
  AuditLogEvent.ChannelUpdate,
  AuditLogEvent.RoleUpdate,
  AuditLogEvent.MemberRoleUpdate,
]);
const dangerous = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.ManageWebhooks,
];

async function inspectDestructiveAction(guild, targetId) {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antiNukeEnabled) return;
  let logs;
  try {
    logs = await guild.fetchAuditLogs({ limit: 6 });
  } catch (error) {
    console.error('[Anti-nuke] Denetim kaydı okunamadı:', error.message);
    return;
  }
  const now = Date.now();
  const entry = logs.entries.find((item) => destructiveEvents.has(item.action)
    && item.target?.id === targetId
    && now - item.createdTimestamp < 12_000);
  if (!entry?.executor || entry.executor.id === guild.client.user.id || entry.executor.id === guild.ownerId) return;

  const key = `${guild.id}:${entry.executor.id}`;
  const recent = (actions.get(key) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  actions.set(key, recent);
  if (recent.length < settings.antiNukeThreshold) return;
  actions.delete(key);

  const member = await guild.members.fetch(entry.executor.id).catch(() => null);
  if (!member) return;
  const botMember = guild.members.me;
  const removable = member.roles.cache.filter((role) => !role.managed && role.id !== guild.id
    && role.position < botMember.roles.highest.position
    && dangerous.some((permission) => role.permissions.has(permission)));
  let removed = 0;
  for (const role of removable.values()) {
    try { await member.roles.remove(role, 'Anti-nuke eşiği aşıldı'); removed++; }
    catch (error) { console.error(`[Anti-nuke] ${role.name} kaldırılamadı:`, error.message); }
  }
  await log(guild, '🛡️ Anti-nuke müdahalesi', `${entry.executor.tag} (${entry.executor.id}) 1 dakika içinde ${recent.length} yıkıcı işlem yaptı. Üzerinden ${removed} yönetici rolü alındı.`, 0xed4245);
}

module.exports = { inspectDestructiveAction };
