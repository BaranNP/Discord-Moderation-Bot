const { log } = require('../utils/logging');
module.exports = { name: 'emojiCreate', async execute(emoji) { await log(emoji.guild, 'Emoji oluşturuldu', `${emoji} · ${emoji.name} (${emoji.id})`, 0x57f287); } };
