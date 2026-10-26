const {
  handleTicketSelect,
  handleTicketReasonModalSubmit,
  handleTicketClose,
} = require('../handlers/ticketHandler');
const { getGuildSettings } = require('../utils/guildSettings');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // Slash komutları
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction);
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'ticket_close') {
          return await handleTicketClose(interaction);
        }
        if (interaction.customId === 'verification:confirm') {
          const settings = await getGuildSettings(interaction.guildId);
          const role = settings.verifiedRoleId ? await interaction.guild.roles.fetch(settings.verifiedRoleId).catch(() => null) : null;
          if (!role) return interaction.reply({ content: 'Doğrulama rolü ayarlanmamış.', ephemeral: true });
          if (role.managed || !role.editable) return interaction.reply({ content: 'Bot doğrulama rolünü yönetemiyor. Botta **Rolleri Yönet** izni olduğuna ve bot rolünün doğrulama rolünün üstünde bulunduğuna bak.', ephemeral: true });
          if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: 'Zaten doğrulanmışsın.', ephemeral: true });
          await interaction.member.roles.add(role, 'Üye doğrulama butonuna bastı.');
          return interaction.reply({ content: '✅ Doğrulama tamamlandı.', ephemeral: true });
        }
        if (interaction.customId.startsWith('role-toggle:')) {
          const roleId = interaction.customId.slice('role-toggle:'.length);
          const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
          if (!role || role.managed || !role.editable) return interaction.reply({ content: 'Bu rol bot tarafından yönetilemiyor. Botta **Rolleri Yönet** izni olduğuna ve bot rolünün bu rolün üstünde bulunduğuna bak.', ephemeral: true });
          const member = interaction.member;
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Rol paneli butonu');
            return interaction.reply({ content: `✅ **${role.name}** rolü alındı.`, ephemeral: true });
          }
          await member.roles.add(role, 'Rol paneli butonu');
          return interaction.reply({ content: `✅ **${role.name}** rolü verildi.`, ephemeral: true });
        }
      }

      // Seçim menüleri
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_select') {
          return await handleTicketSelect(interaction);
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('ticket_reason_modal_')) {
          return await handleTicketReasonModalSubmit(interaction);
        }
      }
    } catch (error) {
      console.error('interactionCreate hatası:', error);
      const content = error.code === 50013
        ? 'Discord bu işlem için bot izni vermedi. Botun gerekli sunucu/kanal iznini ve hedef üyeyle rol sırasını kontrol edin.'
        : 'Bir hata oluştu, lütfen tekrar dene.';
      const errMsg = { content, ephemeral: true };
      if (interaction.deferred && !interaction.replied) {
        interaction.editReply(errMsg).catch(() => null);
      } else if (interaction.replied) {
        interaction.followUp(errMsg).catch(() => null);
      } else {
        interaction.reply(errMsg).catch(() => null);
      }
    }
  },
};
