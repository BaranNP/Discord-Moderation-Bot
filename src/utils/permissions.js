const { PermissionsBitField } = require('discord.js');
const config = require('../config');


function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (config.staffRoleId && member.roles.cache.has(config.staffRoleId)) return true;
  return false;
}

module.exports = { isStaff };
