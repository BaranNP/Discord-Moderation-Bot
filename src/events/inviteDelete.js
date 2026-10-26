const { log } = require('../utils/logging');
module.exports = { name: 'inviteDelete', async execute(invite) { if (invite.guild) await log(invite.guild, 'Davet silindi', `Kod: \`${invite.code}\` · Kanal: ${invite.channel || 'Bilinmiyor'}`, 0xed4245); } };
