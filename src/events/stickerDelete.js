const { log } = require('../utils/logging');
module.exports = { name: 'stickerDelete', async execute(sticker) { if (sticker.guild) await log(sticker.guild, 'Çıkartma silindi', `${sticker.name} (${sticker.id})`, 0xed4245); } };
