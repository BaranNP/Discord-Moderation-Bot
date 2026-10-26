const { log } = require('../utils/logging');
module.exports = { name: 'inviteCreate', async execute(invite) { if (invite.guild) await log(invite.guild, 'Davet oluşturuldu', `Kod: \`${invite.code}\` · Oluşturan: ${invite.inviter?.tag || 'Bilinmiyor'} · Kanal: ${invite.channel || 'Bilinmiyor'}`, 0x57f287); } };
