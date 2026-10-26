const config = require('../config');
const { syncCommunityTagRole } = require('../utils/communityTagRole');

module.exports = {
  name: 'userUpdate',
  async execute(_oldUser, newUser) {
    const guilds = config.guildId
      ? [newUser.client.guilds.cache.get(config.guildId)].filter(Boolean)
      : [...newUser.client.guilds.cache.values()];

    for (const guild of guilds) {
      let member = guild.members.cache.get(newUser.id);
      if (!member) {
        member = await guild.members.fetch(newUser.id).catch(() => null);
      }
      if (!member) continue;

      await syncCommunityTagRole(member).catch((error) => {
        console.error(`[Community Tag] ${newUser.tag} üyesinin etiketi güncellenemedi:`, error.message);
      });
    }
  },
};
