const { log } = require('../utils/logging');
module.exports = { name: 'guildIntegrationsUpdate', async execute(guild) { await log(guild, 'Entegrasyon değişikliği', 'Sunucudaki entegrasyonlar güncellendi.', 0xfee75c); } };
