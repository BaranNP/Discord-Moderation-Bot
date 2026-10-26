const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const config = require('./config');

if (!config.token) {
  console.error('HATA: .env dosyasında TOKEN bulunamadı. Lütfen .env.example dosyasını .env olarak kopyalayıp doldur.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.on('error', (error) => console.error('[Discord Client] İstemci hatası:', error));
client.on('shardError', (error, shardId) => console.error(`[Discord Gateway] Shard ${shardId} hatası:`, error));

client.commands = new Collection();

// Slash komutlarını yükle
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command?.data && command?.execute) {
    for (const data of Array.isArray(command.data) ? command.data : [command.data]) {
      client.commands.set(data.name, { ...command, data });
    }
  }
}

// Eventleri yükle
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  const runEvent = (...args) => {
    Promise.resolve()
      .then(() => event.execute(...args))
      .catch((error) => console.error(`[Event: ${event.name}] İşlem başarısız:`, error));
  };
  if (event.once) {
    client.once(event.name, runEvent);
  } else {
    client.on(event.name, runEvent);
  }
}

client.login(config.token).catch((error) => {
  console.error('[Discord Login] Giriş başarısız:', error.message);
  process.exitCode = 1;
});
