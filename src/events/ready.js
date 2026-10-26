const { ActivityType } = require('discord.js');
const config = require('../config');
const { syncCommunityTagRole } = require('../utils/communityTagRole');
const { getMinecraftStatus } = require('../utils/minecraftStatus');
const { startTempBanScheduler } = require('../utils/tempBanScheduler');

const PRESENCE_ROTATE_MS = 10_000;
const PLAYER_COUNT_REFRESH_MS = 30_000;

function startMinecraftPlayerPresence(client) {
  let playerCountText = 'Oyuncu bilgisi bekleniyor';
  let showServerAddress = true;
  let refreshInProgress = false;

  const refresh = async () => {
    if (refreshInProgress) return;
    refreshInProgress = true;

    try {
      const status = await getMinecraftStatus(
        config.minecraftServerAddress,
        config.minecraftServerPort
      );
      const online = status.players?.online;
      const maximum = status.players?.max;
      playerCountText = Number.isInteger(online)
        ? Number.isInteger(maximum) ? `Oyuncu: ${online}/${maximum}` : `Oyuncu: ${online}`
        : 'Oyuncu bilgisi yok';
    } catch (error) {
      playerCountText = 'Minecraft sunucusu çevrimdışı';
      console.error(`[Minecraft Durum] ${error.message}`);
    } finally {
      refreshInProgress = false;
    }
  };

  const rotatePresence = () => {
    const activity = showServerAddress
      ? `IP: ${config.minecraftServerAddress}`
      : playerCountText;
    client.user.setActivity(activity, { type: ActivityType.Watching });
    showServerAddress = !showServerAddress;
  };

  void refresh();
  rotatePresence();

  const refreshTimer = setInterval(() => void refresh(), PLAYER_COUNT_REFRESH_MS);
  const presenceTimer = setInterval(rotatePresence, PRESENCE_ROTATE_MS);
  refreshTimer.unref();
  presenceTimer.unref();
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[${config.botName}] ${client.user.tag} olarak giriş yapıldı.`);
    startMinecraftPlayerPresence(client);
    startTempBanScheduler(client);

    if (!config.communityTagRoleId) {
      console.error('[Community Tag] .env dosyasındaki COMMUNITY_TAG_ROLE_ID boş. Mevcut üyeler taranmadı.');
      return;
    }

    let guilds;
    if (config.guildId) {
      const guild = client.guilds.cache.get(config.guildId)
        || await client.guilds.fetch(config.guildId).catch(() => null);
      if (!guild) {
        console.error(`[Community Tag] GUILD_ID ${config.guildId} sunucusuna erişilemiyor.`);
        return;
      }
      guilds = [guild];
    } else {
      guilds = [...client.guilds.cache.values()];
    }

    for (const guild of guilds) {
      try {
        const members = await guild.members.fetch();
        console.log(`[Community Tag] ${guild.name}: ${members.size} üye kontrol ediliyor.`);

        for (const member of members.values()) {
          try {
            await syncCommunityTagRole(member);
          } catch (error) {
            console.error(`[Community Tag] ${member.user.tag} üyesi kontrol edilemedi:`, error.message);
          }
        }

        console.log(`[Community Tag] ${guild.name}: üye taraması tamamlandı.`);
      } catch (error) {
        console.error(`[Community Tag] ${guild.name} üyeleri alınamadı. Server Members Intent ve bot izinlerini kontrol et:`, error.message);
      }
    }
  },
};
