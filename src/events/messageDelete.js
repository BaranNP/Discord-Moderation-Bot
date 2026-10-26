const { log } = require('../utils/logging');
module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    const content = message.content || '[metin yok]';
    await log(message.guild, 'Mesaj silindi', `${message.author?.tag || 'Bilinmeyen kullanıcı'} (${message.author?.id || 'ID yok'}) · ${message.channel}\n${content}`, 0xed4245);
  },
};
