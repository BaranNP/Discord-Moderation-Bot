const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'roleDelete', async execute(role) { await inspectDestructiveAction(role.guild, role.id); await log(role.guild, 'Rol silindi', `${role.name} (${role.id})`, 0xed4245); } };
