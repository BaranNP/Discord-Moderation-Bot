const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'channelCreate', async execute(channel) { if (channel.guild) { await inspectDestructiveAction(channel.guild, channel.id); await log(channel.guild, 'Kanal oluşturuldu', `${channel} · ${channel.name} (${channel.id})`, 0x57f287); } } };
