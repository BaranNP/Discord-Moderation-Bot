const { log } = require('../utils/logging');
const { inspectDestructiveAction } = require('../utils/antiNuke');
module.exports = { name: 'channelUpdate', async execute(oldChannel, newChannel) { if (newChannel.guild) { await inspectDestructiveAction(newChannel.guild, newChannel.id); if (oldChannel.name !== newChannel.name || oldChannel.topic !== newChannel.topic) await log(newChannel.guild, 'Kanal güncellendi', `${oldChannel.name} → ${newChannel.name}`, 0xfee75c); } } };
