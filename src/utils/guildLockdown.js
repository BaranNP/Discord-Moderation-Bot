const { ChannelType, PermissionsBitField } = require('discord.js');
const { readStore, updateStore } = require('./store');

const PERMISSIONS = PermissionsBitField.Flags;
const FALLBACK = { guilds: {} };

function currentState(overwrite, permission) {
  if (overwrite?.allow.has(permission)) return true;
  if (overwrite?.deny.has(permission)) return false;
  return null;
}

async function lockGuild(guild) {
  const store = await readStore('lockdowns', FALLBACK);
  const existing = store.guilds[guild.id];
  const entries = existing?.entries || [];
  if (!existing) {
    const types = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia];
    for (const channel of guild.channels.cache.values()) {
      if (!types.includes(channel.type)) continue;
      const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      entries.push({ channelId: channel.id, send: currentState(overwrite, PERMISSIONS.SendMessages), threads: currentState(overwrite, PERMISSIONS.SendMessagesInThreads) });
    }
    await updateStore('lockdowns', FALLBACK, (data) => { data.guilds[guild.id] = { createdAt: Date.now(), entries }; });
  }
  let changed = 0;
  let failed = 0;
  for (const entry of entries) {
    const channel = guild.channels.cache.get(entry.channelId);
    if (!channel) continue;
    const current = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (currentState(current, PERMISSIONS.SendMessages) === false
      && currentState(current, PERMISSIONS.SendMessagesInThreads) === false) continue;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false }, { reason: 'Sunucu kilitlenmesi' });
      changed++;
    } catch (error) {
      failed++;
      console.error(`[Lockdown] ${channel.name} kilitlenemedi:`, error.message);
    }
  }
  return { alreadyLocked: Boolean(existing) && changed === 0 && failed === 0, changed, failed };
}

async function unlockGuild(guild) {
  const store = await readStore('lockdowns', FALLBACK);
  const saved = store.guilds[guild.id];
  if (!saved) return { wasLocked: false, changed: 0 };

  let changed = 0;
  const pending = [];
  for (const entry of saved.entries) {
    const channel = guild.channels.cache.get(entry.channelId);
    if (!channel) continue;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: entry.send, SendMessagesInThreads: entry.threads }, { reason: 'Sunucu kilidi kaldırıldı' });
      changed++;
    } catch (error) {
      console.error(`[Lockdown] ${channel.name} açılamadı:`, error.message);
      pending.push(entry);
    }
  }
  await updateStore('lockdowns', FALLBACK, (data) => {
    if (pending.length) data.guilds[guild.id].entries = pending;
    else delete data.guilds[guild.id];
  });
  return { wasLocked: true, changed, pending: pending.length };
}

module.exports = { lockGuild, unlockGuild };
