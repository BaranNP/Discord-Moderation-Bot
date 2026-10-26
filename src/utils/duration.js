const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

function parseDuration(input, maxMs = 28 * 86_400_000) {
  const match = String(input || '').trim().match(/^(\d{1,5})\s*(m|h|d|w)$/i);
  if (!match) return null;
  const milliseconds = Number(match[1]) * UNIT_MS[match[2].toLowerCase()];
  return milliseconds > 0 && milliseconds <= maxMs ? milliseconds : null;
}

function formatDuration(milliseconds) {
  const units = [['g', 86_400_000], ['sa', 3_600_000], ['dk', 60_000]];
  const parts = [];
  let remaining = milliseconds;
  for (const [label, size] of units) {
    const amount = Math.floor(remaining / size);
    if (amount) parts.push(`${amount}${label}`);
    remaining %= size;
  }
  return parts.join(' ') || '1 dakikadan az';
}

module.exports = { parseDuration, formatDuration };
