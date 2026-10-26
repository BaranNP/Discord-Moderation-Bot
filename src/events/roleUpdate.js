const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'roleUpdate', async execute(oldRole, newRole) { await inspectDestructiveAction(newRole.guild, newRole.id); if (oldRole.name !== newRole.name || oldRole.permissions.bitfield !== newRole.permissions.bitfield) await log(newRole.guild, 'Rol güncellendi', `${oldRole.name} → ${newRole.name} · ${newRole.id}`, 0xfee75c); } };
