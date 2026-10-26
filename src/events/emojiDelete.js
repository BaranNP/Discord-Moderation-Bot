const { log } = require('../utils/logging');
module.exports = { name: 'emojiDelete', async execute(emoji) { await log(emoji.guild, 'Emoji silindi', `${emoji.name} (${emoji.id})`, 0xed4245); } };
