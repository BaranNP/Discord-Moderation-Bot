
const NAMED_COLORS = {
  mavi: '#3B82F6',
  kirmizi: '#ED4245',
  kırmızı: '#ED4245',
  yesil: '#57F287',
  yeşil: '#57F287',
  sari: '#FEE75C',
  sarı: '#FEE75C',
  mor: '#9B59B6',
  turuncu: '#E67E22',
  pembe: '#EB459E',
  beyaz: '#FFFFFF',
  siyah: '#23272A',
  gri: '#95A5A6',
};

function parseColor(input) {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();

  if (NAMED_COLORS[trimmed]) return NAMED_COLORS[trimmed];

  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const isValidHex = /^#([0-9a-f]{6})$/i.test(hex);
  return isValidHex ? hex : null;
}

module.exports = { parseColor, NAMED_COLORS };
