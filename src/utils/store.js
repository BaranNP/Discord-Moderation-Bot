const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
const writeQueues = new Map();

async function readStore(name, fallback = {}) {
  const filePath = path.join(dataDirectory, `${name}.json`);
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`[Store] ${name} okunamadı:`, error.message);
    return structuredClone(fallback);
  }
}

async function writeStore(name, value) {
  const filePath = path.join(dataDirectory, `${name}.json`);
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.promises.rename(tempPath, filePath);
}

async function updateStore(name, fallback, update) {
  const previous = writeQueues.get(name) || Promise.resolve();
  const next = previous.then(async () => {
    const value = await readStore(name, fallback);
    const result = await update(value);
    await writeStore(name, value);
    return result;
  });
  writeQueues.set(name, next.catch(() => null));
  return next;
}

module.exports = { readStore, writeStore, updateStore };
