const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

if (!config.token || !config.clientId) {
  console.error('HATA: .env dosyasında TOKEN ve/veya CLIENT_ID eksik.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) {
    for (const data of Array.isArray(command.data) ? command.data : [command.data]) commands.push(data.toJSON());
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`${commands.length} slash komutu kaydediliyor...`);

    if (config.guildId) {
      // Sunucuya özel kayıt - anında yayınlanır, geliştirme için önerilir.
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log('Komutlar sunucuya (guild) başarıyla kaydedildi.');
    } else {
      // Global kayıt - tüm sunucularda yayılması ~1 saat sürebilir.
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Komutlar global olarak başarıyla kaydedildi.');
    }
  } catch (error) {
    console.error('Komutlar kaydedilirken hata oluştu:', error);
  }
})();
