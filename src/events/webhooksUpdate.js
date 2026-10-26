const { log } = require('../utils/logging');
module.exports = { name: 'webhooksUpdate', async execute(channel) { if (channel.guild) await log(channel.guild, 'Webhook değişikliği', `${channel} kanalında webhook listesi değişti.`, 0xfee75c); } };
