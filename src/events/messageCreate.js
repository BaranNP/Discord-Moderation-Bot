const ipCommand = require('../commands/ip');
const { readStore, updateStore } = require('../utils/store');
const { handleTicketMessage } = require('../handlers/ticketHandler');

const xpCooldown = new Map();
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060]/g;

function normalizeText(value) {
  return value.normalize('NFKD').replace(/\u0307/g, '').replace(ZERO_WIDTH, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[0134578@$]/g, (character) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', '$': 's' })[character] || character)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

async function execute(message) {
  if (!message.guild || message.author.bot || !message.member) return;

  if (message.content.trim().toLocaleLowerCase('tr-TR') === '!ip' || message.content.trim().toLocaleLowerCase('tr-TR') === '/ip') {
    await message.reply({ embeds: [ipCommand.makeEmbed()], allowedMentions: { parse: [] } });
    return;
  }

  if (handleTicketMessage(message)) return;
  const triggerStore = await readStore('triggers', { guilds: {} });
  const normalized = normalizeText(message.content);
  const trigger = (triggerStore.guilds[message.guildId] || []).find((item) => normalizeText(item.phrase) === normalized);
  if (trigger) await message.reply({ content: trigger.response, allowedMentions: { parse: [] } }).catch(() => null);

  if (message.content.length < 5) return;
  const xpKey = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  if (now - (xpCooldown.get(xpKey) || 0) < 60_000) return;
  xpCooldown.set(xpKey, now);
  await updateStore('xp', { guilds: {} }, (store) => {
    store.guilds[message.guildId] ||= {};
    const stats = store.guilds[message.guildId][message.author.id] ||= { xp: 0, level: 0 };
    stats.xp += 10 + Math.floor(Math.random() * 11);
    stats.level = Math.floor(Math.sqrt(stats.xp / 100));
  });
}

module.exports = { name: 'messageCreate', async execute(message) {
  try {
    await execute(message);
  } catch (error) {
    console.error('[MessageCreate] Mesaj işlenemedi:', error.message);
  }
} };
