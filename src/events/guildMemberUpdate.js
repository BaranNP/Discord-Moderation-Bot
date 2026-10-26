const { syncCommunityTagRole } = require('../utils/communityTagRole');
const { inspectDestructiveAction } = require('../utils/antiNuke');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
      await inspectDestructiveAction(newMember.guild, newMember.id);
    }
    await syncCommunityTagRole(newMember).catch((error) => {
      console.error(`[Community Tag] ${newMember.user.tag} üyesinin rolü güncellenemedi:`, error);
    });
  },
};
