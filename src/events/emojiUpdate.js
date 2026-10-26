const { log } = require('../utils/logging');
module.exports = { name: 'emojiUpdate', async execute(oldEmoji, newEmoji) { await log(newEmoji.guild, 'Emoji güncellendi', `${oldEmoji.name} → ${newEmoji.name} (${newEmoji.id})`, 0xfee75c); } };
