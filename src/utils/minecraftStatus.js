const dns = require('dns').promises;
const net = require('net');

function encodeVarInt(value) {
  const bytes = [];
  let remaining = value >>> 0;

  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining !== 0);

  return Buffer.from(bytes);
}

function encodeString(value) {
  const data = Buffer.from(value, 'utf8');
  return Buffer.concat([encodeVarInt(data.length), data]);
}

function makePacket(payload) {
  return Buffer.concat([encodeVarInt(payload.length), payload]);
}

function readVarInt(buffer, offset = 0) {
  let value = 0;
  let position = offset;
  let byte;

  do {
    if (position >= buffer.length || position - offset >= 5) return null;
    byte = buffer[position++];
    value |= (byte & 0x7f) << ((position - offset - 1) * 7);
  } while ((byte & 0x80) !== 0);

  return { value: value >>> 0, bytes: position - offset };
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function resolveServer(address, defaultPort) {
  const [host, explicitPort] = address.trim().split(':');
  if (!host) throw new Error('Minecraft sunucu adresi boş.');
  if (explicitPort) return { host, port: Number(explicitPort) };

  try {
    const records = await withTimeout(
      dns.resolveSrv(`_minecraft._tcp.${host}`),
      4000,
      'Minecraft DNS sorgusu zaman aşımına uğradı.'
    );
    if (records.length > 0) {
      const record = records.sort((a, b) => a.priority - b.priority)[0];
      return { host: record.name.replace(/\.$/, ''), port: record.port };
    }
  } catch {
    
  }

  return { host, port: defaultPort };
}

async function getMinecraftStatus(address, defaultPort = 25565) {
  const { host, port } = await withTimeout(
    resolveServer(address, defaultPort),
    5000,
    'Minecraft sunucu adresi çözümlenemedi.'
  );

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let settled = false;
    let hardTimeout;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };

    hardTimeout = setTimeout(() => finish(new Error('Minecraft durum sorgusu 8 saniyede tamamlanmadı.')), 8000);
    socket.setTimeout(5000, () => finish(new Error('Minecraft sunucu sorgusu zaman aşımına uğradı.')));
    socket.once('error', (error) => finish(error));

    socket.once('connect', () => {
      const handshake = Buffer.concat([
        encodeVarInt(0),
        encodeVarInt(767),
        encodeString(address.trim().split(':')[0]),
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        encodeVarInt(1),
      ]);
      socket.write(Buffer.concat([makePacket(handshake), makePacket(encodeVarInt(0))]));
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > 1_000_000) {
        finish(new Error('Minecraft durum yanıtı beklenenden büyük.'));
        return;
      }
      const packetLength = readVarInt(buffer);
      if (!packetLength) return;

      const packetStart = packetLength.bytes;
      if (buffer.length < packetStart + packetLength.value) return;

      const packet = buffer.subarray(packetStart, packetStart + packetLength.value);
      const packetId = readVarInt(packet);
      if (!packetId || packetId.value !== 0) {
        finish(new Error('Minecraft sunucusundan geçersiz durum yanıtı alındı.'));
        return;
      }

      const jsonLength = readVarInt(packet, packetId.bytes);
      if (!jsonLength) {
        finish(new Error('Minecraft durum yanıtı eksik.'));
        return;
      }

      const jsonStart = packetId.bytes + jsonLength.bytes;
      const jsonEnd = jsonStart + jsonLength.value;
      if (packet.length < jsonEnd) return;

      try {
        finish(null, JSON.parse(packet.toString('utf8', jsonStart, jsonEnd)));
      } catch (error) {
        finish(error);
      }
    });
  });
}

module.exports = { getMinecraftStatus };
