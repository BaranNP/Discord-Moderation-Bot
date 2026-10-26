const { log } = require('../utils/logging');
module.exports = { name: 'stickerCreate', async execute(sticker) { if (sticker.guild) await log(sticker.guild, 'Çıkartma oluşturuldu', `${sticker.name} (${sticker.id})`, 0x57f287); } };
