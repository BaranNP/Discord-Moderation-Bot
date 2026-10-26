const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'channelDelete', async execute(channel) { if (channel.guild) { await inspectDestructiveAction(channel.guild, channel.id); await log(channel.guild, 'Kanal silindi', `#${channel.name} (${channel.id})`, 0xed4245); } } };
