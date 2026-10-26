require('dotenv').config();

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  welcomeChannelId: process.env.WELCOME_CHANNEL_ID,

  staffRoleId: process.env.STAFF_ROLE_ID,

  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID,
  communityTagRoleId: process.env.COMMUNITY_TAG_ROLE_ID,
  communityTag: process.env.COMMUNITY_TAG || 'COMMUNITY',

  prefix: process.env.PREFIX || '!',
  embedColor: process.env.EMBED_COLOR || '#3B82F6',
  successColor: '#57F287',
  dangerColor: '#ED4245',
  warningColor: '#FEE75C',

  defaultIp: process.env.DEFAULT_IP || process.env.MINECRAFT_SERVER_ADDRESS || 'play.example.com',
  minecraftServerAddress: process.env.MINECRAFT_SERVER_ADDRESS || process.env.DEFAULT_IP || 'play.example.com',
  minecraftServerPort: Number(process.env.MINECRAFT_SERVER_PORT || 25565),
  bedrockPort: Number(process.env.BEDROCK_PORT || 19132),
  defaultVersion: process.env.DEFAULT_VERSION || 'Java 1.20.x - 1.21.x',
  defaultType: process.env.DEFAULT_TYPE || 'Minecraft',
  serverName: process.env.SERVER_NAME || 'Community Server',
  websiteUrl: process.env.WEBSITE_URL || 'https://example.com',
  voteUrl: process.env.VOTE_URL || 'https://example.com/vote',

  botName: process.env.BOT_NAME || 'Community Bot',
};
