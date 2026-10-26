const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'guildBanAdd', async execute(ban) { await inspectDestructiveAction(ban.guild, ban.user.id); await log(ban.guild, 'Üye yasaklandı', `${ban.user.tag} (${ban.user.id})\nSebep: ${ban.reason || 'Belirtilmedi.'}`, 0xed4245); } };
