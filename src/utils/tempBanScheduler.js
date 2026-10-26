const { readStore, updateStore } = require('./store');

async function expireBans(client) {
  const items = await readStore('tempBans', []);
  const expired = items.filter((item) => item.expiresAt <= Date.now());

  for (const item of expired) {
    const guild = client.guilds.cache.get(item.guildId)
      || await client.guilds.fetch(item.guildId).catch(() => null);
    if (!guild) continue;

    try {
      await guild.members.unban(item.userId, 'Süreli yasaklama süresi doldu.');
      console.log(`[TempBan] ${item.userId} yasağı kaldırıldı.`);
    } catch (error) {
      console.error(`[TempBan] ${item.userId} yasağı kaldırılamadı; tekrar denenecek:`, error.message);
      continue;
    }

    await updateStore('tempBans', [], (current) => {
      const index = current.findIndex((entry) => entry.guildId === item.guildId && entry.userId === item.userId && entry.expiresAt === item.expiresAt);
      if (index >= 0) current.splice(index, 1);
    });
  }
}

function startTempBanScheduler(client) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await expireBans(client); }
    catch (error) { console.error('[TempBan] Süreli yasaklamalar kontrol edilemedi:', error.message); }
    finally { running = false; }
  };

  void run();
  const timer = setInterval(() => void run(), 60_000);
  timer.unref();
}

module.exports = { startTempBanScheduler };
