const { readStore, updateStore } = require('./store');

const DEFAULTS = { guilds: {} };
const EMPTY_GUILD = {
  logChannelId: null,
  welcomeChannelId: null,
  welcomeMessage: 'Hoş geldin {user}! Sunucuda artık {count} kişiyiz.',
  farewellChannelId: null,
  farewellMessage: '{user} sunucudan ayrıldı.',
  autoRoleId: null,
  jailRoleId: null,
  verifiedRoleId: null,
  verificationChannelId: null,
  raidThreshold: 8,
  antiNukeThreshold: 3,
  antiNukeEnabled: false,
};

async function getGuildSettings(guildId) {
  const store = await readStore('guildSettings', DEFAULTS);
  return { ...EMPTY_GUILD, ...(store.guilds[guildId] || {}) };
}

async function updateGuildSettings(guildId, update) {
  return updateStore('guildSettings', DEFAULTS, (store) => {
    store.guilds[guildId] ||= { ...EMPTY_GUILD };
    return update(store.guilds[guildId]);
  });
}

module.exports = { getGuildSettings, updateGuildSettings };
