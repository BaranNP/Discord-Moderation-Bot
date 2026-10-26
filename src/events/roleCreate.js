const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'roleCreate', async execute(role) { await inspectDestructiveAction(role.guild, role.id); await log(role.guild, 'Rol oluşturuldu', `${role} · ${role.name} (${role.id})`, 0x57f287); } };
