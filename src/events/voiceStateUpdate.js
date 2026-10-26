const { log } = require('../utils/logging');
module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;
    const from = oldState.channel?.name || 'Ses kanalında değildi';
    const to = newState.channel?.name || 'Ses kanalından çıktı';
    if (from !== to) await log(member.guild, 'Ses kanalı hareketi', `${member.user.tag}: **${from}** → **${to}**`, 0x5865f2);
  },
};
