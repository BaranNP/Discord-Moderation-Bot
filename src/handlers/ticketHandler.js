const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');
const { getMinecraftStatus } = require('../utils/minecraftStatus');

const ticketQueues = new Map();
const ticketTurns = new Map();

const CATEGORY_LABELS = {
  satin_alim: '🛒 Satın Alım',
  diger: '🤝 Diğer',
  bilgi_al: '📁 Bilgi Al',
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

function normalizeReason(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function buildAutomaticSupportReply(reason) {
  const text = normalizeReason(reason);
  const connectionIssue = /\b(giremiyorum|giremiyom|giris yapamiyorum|baglanamiyorum|baglanti|connection|failed to connect|sunucuya girem|oyuna girem|kick atiyor)\b/.test(text);
  const statusQuestion = /\b(aktif mi|aktif olup|acik mi|acik olup|online mi|kapali mi|sunucu durumu|server durumu|sunucu online|durumunu kontrol|sunucuyu kontrol)\b/.test(text);
  const versionQuestion = /\b(surum|version|hangi versiyon|hangi surum)\b/.test(text);
  const lagIssue = /\b(lag|donuyor|donma|kasma|kasmalar|ping|fps)\b/.test(text);
  const featureQuestion = /\b(neler var|ne var|ozel|ozellik|kit|kasa|market|klan|etkinlik|oyun modu|nasil oynanir)\b/.test(text);
  const purchaseIssue = /\b(satin|odeme|magaza|kredi|vip|rank|siparis|alisveris)\b/.test(text);
  const punishmentIssue = /\b(ban|yasak|mute|sustur|ceza|itiraz|haksiz)\b/.test(text);
  const cheatReport = /\b(hile|hacker|cheat|kill aura|killaura|xray|aimbot|macro|makro|hile rapor|hile bildir|hile kullanan|hileci)\b/.test(text);
  const playerReport = /\b(rahatsiz|taciz|hakaret|tehdit|dolandir|dolandirici|scam|reklam|spam|kufur|oyuncu rapor|oyuncuyu bildir)\b/.test(text);
  const lostItems = /\b(item|esya|envanter|para|coin|bakir|altin|elmas).*(kaybol|kaybet|silindi|gitti|eksildi)|\b(kayboldu|kaybettim|item gitti|esya gitti|envanter bosaldi)\b/.test(text);
  const accountIssue = /\b(hesap|hesabim|giris yapamiyorum|sifrem|sifre|hesap calindi|hesabim calindi)\b/.test(text);
  const bugIssue = /\b(bug|hata|bozuk|calismiyor|calismadi|kayboldu|silindi|item gitti|esya gitti|envanter)\b/.test(text);
  const joinHelp = /\b(ip|adres|sunucu ekle|nasil gir|nasil baglan|oyuna nasil)\b/.test(text);

  if (connectionIssue || statusQuestion || versionQuestion) {
    try {
      const status = await getMinecraftStatus(config.minecraftServerAddress, config.minecraftServerPort);
      const online = Number.isInteger(status.players?.online) ? status.players.online : null;
      const maximum = Number.isInteger(status.players?.max) ? status.players.max : null;
      const version = status.version?.name || null;
      const state = `✅ **Sunucu erişilebilir**${online !== null ? ` · Oyuncu: ${online}${maximum !== null ? `/${maximum}` : ''}` : ''}.`;

      if (versionQuestion) {
        return {
          title: `🧩 ${config.defaultType} sürüm bilgisi`,
          description: `${version ? `Sunucu durum sorgusunun bildirdiği sürüm: **${version}**.` : 'Sunucudan sürüm bilgisi alınamadı.'}\nSunucu IP: **${config.minecraftServerAddress}**\n\nUyumlu istemci sürümünü seçtiğinden emin ol. Sorun devam ederse kullandığın Minecraft sürümünü ve aldığın hata mesajını yaz; yetkili kontrol etsin.`,
          color: version ? config.successColor : config.warningColor,
        };
      }

      return {
        title: connectionIssue ? '🔌 Sunucuya bağlantı yardımı' : '🟢 Sunucu durumu',
        description: `${state}\nSunucu IP: **${config.minecraftServerAddress}**${version ? `\nSunucunun bildirdiği sürüm: **${version}**` : ''}\n\nBağlanamıyorsan Minecraft sürümünü, aldığın hata mesajını ve ne zaman denediğini bu ticket'a yaz. Sunucu erişilebilir görünse bile hesabına veya istemcine özel bir sorun olabilir; yetkili inceleyebilir.`,
        color: config.successColor,
      };
    } catch {
      return {
        title: '🔌 Sunucu bağlantı yardımı',
        description: `Bot şu anda **${config.minecraftServerAddress}** adresinden sunucu durumunu alamadı; bu tek başına sunucunun kesin olarak kapalı olduğunu göstermez. Minecraft sürümünü, aldığın hata mesajını ve ne zaman denediğini yaz. Bir yetkili kontrol edecek.`,
        color: config.warningColor,
      };
    }
  }

  if (lagIssue) {
    return {
      title: '⚙️ Sunucu performans yardımı',
      description: 'Sorunun ne zaman başladığını, yaklaşık ping değerini, Minecraft sürümünü ve donmanın tüm oyuncularda mı yoksa yalnızca sende mi olduğunu yaz. Mümkünse hata ekranının görüntüsünü ekle; yetkili inceleyecek.',
      color: config.embedColor,
    };
  }

  if (joinHelp) {
    return {
      title: '🎮 Sunucuya bağlanma',
      description: `Minecraft Java Edition'da **Çok Oyunculu → Sunucu Ekle** yolunu açıp adres olarak **${config.minecraftServerAddress}** yaz ve kaydet. Bağlanma hatası alırsan kullandığın Minecraft sürümünü ve hata ekranını bu ticket'a ekle; bağlantı sorununu ayrıca kontrol edelim.`,
      color: config.embedColor,
    };
  }

  if (featureQuestion) {
    return {
      title: `${config.serverName} hakkında`,
      description: `${config.serverName} sunucusunun oyun modu **${config.defaultType}**. Sunucuya özel kit, kasa, market, klan veya etkinlik ayrıntıları botun doğrulanmış bilgi listesinde yok; yanlış özellik uydurmayacağım. **Tam olarak hangisini merak ediyorsun?** İlgili menünün/ekranın görüntüsünü veya oyun içindeki komut çıktısını eklersen yetkili doğru bilgiyi paylaşabilir.\nSunucu IP: **${config.minecraftServerAddress}**`,
      color: config.embedColor,
    };
  }

  if (/\b(komut|commands|nasil|nerden|nereden|nerde|nerede|yardim|basla|baslangic|oyuna gir|oyun ici)\b/.test(text)) {
    return {
      title: '🎮 Oyun içi yardım',
      description: `${config.serverName} sunucusunun oyun modu **${config.defaultType}**; adres **${config.minecraftServerAddress}**. Hangi işlemi yapmak istediğini (ör. takas, klan, kit, kasa, market veya eşya) ve denediğin menü/komutu yaz. Sunucuya özel komut listesini doğrulamadan uydurmayacağım; gerekirse yetkili doğru komutu paylaşır.`,
      color: config.embedColor,
    };
  }

  if (/\b(dogrula|dogrulama|rol alamadim|rol gelmedi|rol verilm|discord bagla|hesap bagla|whitelist|beyaz liste)\b/.test(text)) {
    return {
      title: '✅ Doğrulama ve rol yardımı',
      description: 'Doğrulama/rol işleminin hangi adımında kaldığını, Discord kullanıcı adını ve Minecraft kullanıcı adını yaz. Varsa doğrulama ekranının görüntüsünü ekle. Bot rolünü veya hesabını elle değiştiremez; adımları kontrol edip gerekirse yetkiliye aktaracağım. **Şifreni veya doğrulama kodunu paylaşma.**',
      color: config.embedColor,
    };
  }

  if (purchaseIssue) {
    return {
      title: '🛒 Satın alım desteği',
      description: 'İşlemi bulabilmemiz için Minecraft kullanıcı adını, satın aldığın ürünün adını ve yaklaşık işlem tarihini yaz. Varsa sipariş/işlem numarasını veya makbuz görüntüsünü ekle. **Şifreni, e-posta doğrulama kodunu veya ödeme kartı bilgilerini paylaşma.**',
      color: config.embedColor,
    };
  }

  if (accountIssue) {
    return {
      title: '🔐 Hesap erişim desteği',
      description: 'Hesabına erişimle ilgili sorun yaşadığını anladım. Minecraft kullanıcı adını, hangi aşamada takıldığını ve ekranda çıkan hata mesajını yaz. **Şifreni veya doğrulama kodunu bu ticketa gönderme.** Hesap güvenliği ve erişim işlemleri yetkili tarafından kontrol edilmeli.',
      color: config.warningColor,
    };
  }

  if (playerReport) {
    return {
      title: '🛡️ Oyuncu bildirimi',
      description: 'Bir oyuncuyla ilgili bildirimini yetkililere iletebilirim. Olayın **yaklaşık saatini**, ilgili oyuncunun adını, ne olduğunu ve varsa ekran görüntüsü/video kanıtını paylaş. Kişisel bilgileri veya özel mesajları gereksiz yere paylaşma; yetkili kanıtı inceleyip işlem gerekip gerekmediğini değerlendirsin.',
      color: config.warningColor,
    };
  }

  if (punishmentIssue) {
    return {
      title: '⚖️ Ceza inceleme talebi',
      description: 'İnceleme için Minecraft kullanıcı adını, cezanın yaklaşık tarihini, ekranda görünen ceza sebebini ve neden itiraz ettiğini yaz. Varsa kanıt ekran görüntüsünü ekle. Yetkili inceleyene kadar aynı itirazı tekrar tekrar açmana gerek yok.',
      color: config.warningColor,
    };
  }

  if (cheatReport) {
    return {
      title: '🛡️ Hile şüphesi bildirimi',
      description: 'Anladım, bir oyuncuyla ilgili hile şüphesini bildirmek istiyorsun. Yetkililerin inceleyebilmesi için şüpheli oyuncunun **Minecraft kullanıcı adını**, olayın **yaklaşık tarih ve saatini**, ne yaptığını ve varsa **video veya ekran görüntüsü kanıtını** bu ticketa ekle. Kanıt yoksa karşılaştığın olayı ayrıntılı anlat. Oyuncuyu genel sohbetten suçlamak yerine bilgileri burada paylaş; yetkili inceleyip karar versin.',
      color: config.warningColor,
    };
  }

  if (lostItems) {
    return {
      title: '📦 Kayıp eşya veya bakiye bildirimi',
      description: 'Kaybolan eşya/bakiye için Minecraft kullanıcı adını, kaybolan şeyin adını ve miktarını, yaklaşık tarih-saatini ve hemen öncesinde yaptığın işlemi (ölüm, takas, bağlantı kopması, kasa/market kullanımı gibi) yaz. Varsa ekran görüntüsü veya kayıt ekle. Bot envanteri geri yükleyemez; kayıtların incelenmesi için yetkiliyi çağırıyorum.',
      color: config.warningColor,
    };
  }

  if (bugIssue) {
    return {
      title: '🧰 Hata bildirimi',
      description: 'Sorunu yeniden oluşturmak için yaptığın adımları sırayla yaz; hangi eşya/menü/konum etkilendiğini ve yaklaşık saati belirt. Hata mesajının veya ekranın görüntüsü varsa ekle. Böylece yetkili sorunu tekrar deneyebilir.',
      color: config.warningColor,
    };
  }

  return {
    title: '🔎 Talebini netleştirelim',
    description: `Anladım, “${reason.trim().slice(0, 250)}” konusunda yardım istiyorsun. Sana doğru adımları önerebilmem için **ne yapmaya çalıştığını**, tam olarak **ne olduğunu** ve varsa ekrandaki **hata mesajını** yaz. Minecraft kullanıcı adını da ekleyebilirsin; şifre veya doğrulama kodu paylaşma.`,
    color: config.embedColor,
  };
}

function asksForStaff(text) {
  const normalized = normalizeReason(text);
  return /\b(yetkili(yi|leri)? (cagir|etiketle|istiyorum|gelsin|bagla|ulas|konusmak istiyorum)|canli destek|insanla konus|moderator cagir|staff cagir)\b/.test(normalized);
}

async function notifyTicketStaff(channel, reason) {
  const parts = (channel.topic || '').split('-');
  if (parts.at(-1) !== 'staff') {
    await channel.setTopic(`${channel.topic || ''}-staff`).catch(() => null);
  }
  const role = config.staffRoleId
    ? await channel.guild.roles.fetch(config.staffRoleId).catch(() => null)
    : null;
  await channel.send({
    content: `${role ? `${role} ` : ''}🛡️ **Yetkili desteği gerekiyor.** ${reason}`,
    allowedMentions: role ? { roles: [role.id] } : { parse: [] },
  });
}

function responseEmbed(result) {
  return new EmbedBuilder()
    .setColor(result.handoff ? config.warningColor : config.embedColor)
    .setAuthor({ name: `${config.serverName} · Otomatik Destek` })
    .setDescription(result.reply.slice(0, 3800))
    .setFooter({ text: result.handoff ? 'Yetkiliye aktarılıyor' : 'Çözüm olmadıysa ayrıntı yazabilir veya “yetkili çağır” diyebilirsin.' })
    .setTimestamp();
}

async function answerTicketMessage(message) {
  const topic = message.channel.topic || '';
  const pieces = topic.split('-');
  if (pieces.at(-1) === 'staff') return;

  if (asksForStaff(message.content)) {
    await notifyTicketStaff(message.channel, 'Kullanıcı doğrudan yetkili istedi.');
    await message.channel.send({ embeds: [responseEmbed({
      reply: 'Elbette, yetkili ekibi çağırdım. Daha hızlı inceleyebilmeleri için Minecraft kullanıcı adını, yaşadığın sorunu ve varsa tam hata mesajını paylaşabilirsin.',
      handoff: true,
    })] });
    return;
  }

  const turn = (ticketTurns.get(message.channel.id) || 0) + 1;
  ticketTurns.set(message.channel.id, turn);
  const normalized = normalizeReason(message.content);
  const needsStaff = /\b(satin|odeme|magaza|kredi|vip|rank|siparis|ban|yasak|mute|sustur|ceza|itiraz|haksiz|hesap|sifrem|sifre|hile|hacker|cheat|kill aura|killaura|xray|aimbot|hile rapor|hile bildir|hileci|rahatsiz|taciz|hakaret|tehdit|dolandir|scam|reklam|spam|kufur|oyuncu rapor|oyuncuyu bildir|item gitti|esya gitti|envanter bosaldi|kaybettim)\b/.test(normalized);
  const diagnosis = await buildAutomaticSupportReply(message.content);

  if (needsStaff || turn >= 3) {
    await message.channel.send({ embeds: [responseEmbed({
      reply: needsStaff
        ? `${diagnosis.description}\n\nYetkili ekibi incelemesi için çağırdım.`
        : `Öneriler sorunu çözmemiş görünüyor; aynı adımları tekrarlamayacağım. Yetkili ekibi incelemesi için çağırdım. Lütfen Minecraft kullanıcı adını, kullandığın sürümü ve tam hata mesajını paylaş.${diagnosis.description ? `\n\nÖnceki kontrol: ${diagnosis.description.slice(0, 500)}` : ''}`,
      handoff: true,
    })] });
    await notifyTicketStaff(message.channel, needsStaff
      ? 'Yetkili incelemesi gereken bir bildirim (hesap, ödeme, ceza, oyuncu davranışı, hile veya kayıp eşya) açıldı.'
      : 'Otomatik destek adımları sorunu çözemedi; kullanıcı tekrar yazdı.');
    return;
  }

  const followUp = turn === 1
    ? ''
    : '\n\nBu adımları denediysen sonucu ve ekranda çıkan tam hata mesajını yaz; ona göre bir sonraki kontrolü yapalım.';
  await message.channel.send({ embeds: [responseEmbed({
    reply: `**${diagnosis.title}**\n${diagnosis.description}${followUp}`,
    handoff: false,
  })] });
}

function handleTicketMessage(message) {
  const topic = message.channel.topic || '';
  if (!topic.startsWith('ticket-')) return false;
  const [, ownerId] = topic.split('-');
  if (message.author.id !== ownerId || isStaff(message.member)) return true;

  const previous = ticketQueues.get(message.channel.id) || Promise.resolve();
  const current = previous
    .catch(() => null)
    .then(() => answerTicketMessage(message))
    .catch((error) => console.error('[Ticket Destek] Ticket mesajı işlenemedi:', error.message));
  ticketQueues.set(message.channel.id, current);
  current.then(() => {
    if (ticketQueues.get(message.channel.id) === current) ticketQueues.delete(message.channel.id);
  });
  return true;
}

// Kullanıcı kategori seçince, önce "talep nedeni" formunu (modal) açar.
async function handleTicketSelect(interaction) {
  const secilen = interaction.values[0];

  const guild = interaction.guild;
  const existing = guild.channels.cache.find((c) => c.topic && c.topic.startsWith(`ticket-${interaction.user.id}-`));
  if (existing) {
    return interaction.reply({ content: `⚠️ Zaten açık bir talebin var: ${existing}`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_reason_modal_${secilen}`)
    .setTitle(`${CATEGORY_LABELS[secilen] || 'Destek'} Talebi`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Talep açma nedenin nedir?')
    .setPlaceholder('Örn: Çekiliş kazandım, ürünümü teslim alamadım...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(700);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

// Neden formu gönderilince asıl ticket kanalını oluşturur.
async function handleTicketReasonModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const secilen = interaction.customId.replace('ticket_reason_modal_', '');
  const kategoriAdi = CATEGORY_LABELS[secilen] || '🎫 Destek';
  const sebep = interaction.fields.getTextInputValue('reason');

  const guild = interaction.guild;

  const [ticketOwner, botMember, staffRole] = await Promise.all([
    guild.members.fetch(interaction.user.id),
    guild.members.me ? Promise.resolve(guild.members.me) : guild.members.fetchMe(),
    config.staffRoleId ? guild.roles.fetch(config.staffRoleId).catch(() => null) : Promise.resolve(null),
  ]);

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: ticketOwner,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: botMember,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  if (staffRole) {
    overwrites.push({
      id: staffRole,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  let ticketCategory = null;
  if (config.ticketCategoryId) {
    ticketCategory = await guild.channels.fetch(config.ticketCategoryId).catch(() => null);
    if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory || ticketCategory.guildId !== guild.id) {
      console.warn(`[Ticket] TICKET_CATEGORY_ID ${config.ticketCategoryId} bu sunucuda geçerli bir kategori değil; ticket kategorisiz açılacak.`);
      ticketCategory = null;
    }
  }

  const channel = await guild.channels.create({
    name: `🎫talep-${slugify(interaction.user.username) || interaction.user.id}`,
    type: ChannelType.GuildText,
    parent: ticketCategory?.id,
    topic: `ticket-${interaction.user.id}-${secilen}`,
    permissionOverwrites: overwrites,
  });

  const staffMention = config.staffRoleId ? `<@&${config.staffRoleId}>` : '🛡️ Yetkili Ekibi';

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`🎫 ${config.botName} Destek Talebi`)
    .setDescription(`👋 Merhaba ${interaction.user}, destek talebin oluşturuldu.`)
    .addFields(
      { name: '📂 Kategori', value: kategoriAdi, inline: true },
      { name: '👤 Açan Kişi', value: `${interaction.user}`, inline: true },
      { name: '📝 Talep Nedeni', value: sebep }
    )
    .setFooter({ text: '🕓 Bir yetkili en kısa sürede sana yardımcı olacaktır.' })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await channel.send({ content: `${staffMention} ${interaction.user}`, embeds: [embed], components: [closeRow] });
  await interaction.editReply({ content: `✅ Destek talebin oluşturuldu: ${channel}` });

  ticketTurns.set(channel.id, 0);
  const initialReply = await buildAutomaticSupportReply(sebep);
  await channel.send({ embeds: [new EmbedBuilder()
    .setColor(initialReply.color)
    .setTitle(initialReply.title)
    .setDescription(initialReply.description)
    .setFooter({ text: 'Otomatik destek · Devam etmek için ticket’a yaz.' })
    .setTimestamp()] });
}

// Kanaldaki tüm mesajları çekip okunabilir bir transkript metni oluşturur.
async function buildTranscript(channel) {
  let allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    allMessages = allMessages.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  allMessages.reverse();

  const lines = allMessages.map((m) => {
    const zaman = new Date(m.createdTimestamp).toLocaleString('tr-TR');
    let icerik = m.content || '';
    if (m.embeds.length > 0) {
      for (const e of m.embeds) {
        const parcalar = [];
        if (e.title) parcalar.push(`[Başlık: ${e.title}]`);
        if (e.description) parcalar.push(`[Açıklama: ${e.description}]`);
        if (e.fields?.length) {
          for (const f of e.fields) parcalar.push(`[${f.name}: ${f.value}]`);
        }
        icerik += ` ${parcalar.join(' ')}`;
      }
    }
    if (m.attachments.size > 0) {
      icerik += ` ${Array.from(m.attachments.values()).map((a) => a.url).join(' ')}`;
    }
    return `[${zaman}] ${m.author.tag}: ${icerik.trim()}`;
  });

  return lines.join('\n') || 'Kanalda mesaj bulunamadı.';
}

// "Talebi Kapat" butonuna basınca transkript alır, log kanalına atar ve kanalı siler.
async function handleTicketClose(interaction) {
  const topic = interaction.channel.topic || '';
  const isOwner = topic.startsWith(`ticket-${interaction.user.id}-`);

  if (!isOwner && !isStaff(interaction.member)) {
    return interaction.reply({ content: '🚫 Bu talebi kapatma yetkin yok.', ephemeral: true });
  }

  await interaction.reply({ content: '🔒 Bu talep 5 saniye içinde kapatılacak, transkript alınıyor...' });
  ticketTurns.delete(interaction.channel.id);

  const transcriptText = await buildTranscript(interaction.channel).catch(() => 'Transkript alınamadı.');

  if (config.ticketLogChannelId) {
    const logChannel = await interaction.guild.channels.fetch(config.ticketLogChannelId).catch(() => null);
    if (logChannel) {
      const [, ownerId, category] = topic.split('-');
      const owner = ownerId ? await interaction.client.users.fetch(ownerId).catch(() => null) : null;

      const buffer = Buffer.from(transcriptText, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}-transkript.txt` });

      const logEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('📄 Destek Talebi Transkripti')
        .addFields(
          { name: '📂 Kanal', value: `#${interaction.channel.name}`, inline: true },
          { name: '📁 Kategori', value: CATEGORY_LABELS[category] || 'Bilinmiyor', inline: true },
          { name: '👤 Açan Kişi', value: owner ? `${owner.tag} (\`${owner.id}\`)` : 'Bilinmiyor', inline: true },
          { name: '🔒 Kapatan Kişi', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => null);
    }
  }

  setTimeout(() => {
    interaction.channel.delete().catch(() => null);
  }, 5000);
}

module.exports = { handleTicketSelect, handleTicketReasonModalSubmit, handleTicketClose, handleTicketMessage };
