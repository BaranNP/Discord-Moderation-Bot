const { log } = require('../utils/logging');
module.exports = { name: 'stickerUpdate', async execute(oldSticker, newSticker) { if (newSticker.guild) await log(newSticker.guild, 'Çıkartma güncellendi', `${oldSticker.name} → ${newSticker.name}`, 0xfee75c); } };
