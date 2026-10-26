const { log } = require('../utils/logging');
module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    await log(newMessage.guild, 'Mesaj düzenlendi', `${newMessage.author?.tag || 'Bilinmeyen kullanıcı'} · ${newMessage.channel}\n**Önce:** ${(oldMessage.content || '[önbellekte yok]').slice(0, 1500)}\n**Sonra:** ${(newMessage.content || '[boş]').slice(0, 1500)}`, 0xfee75c);
  },
};
