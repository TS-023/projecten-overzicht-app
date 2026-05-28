/* ═══════════════════════════════════════════════════════════
   utils.js — Gedeelde hulpfuncties
   ═══════════════════════════════════════════════════════════ */

const TYPE_COLORS = {
  Wonen:     '#E8224A',
  Kantoor:   '#F5A623',
  Gemengd:   '#1B8B5A',
  Onderwijs: '#5CB85C',
  Zorg:      '#9B59B6',
  default:   '#9E9E9E',
};

function typeColor(type) {
  if (!type) return TYPE_COLORS.default;
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return TYPE_COLORS.default;
}

function formatM2(val) {
  if (!val) return null;
  return `${Number(val).toLocaleString('nl-NL')} m²`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function makePinSvg(color, w = 28, h = 36) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 24 32"
               style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));display:block;flex-shrink:0">
            <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23
                     c0-4.97-4.03-9-9-9z" fill="${color}"/>
            <circle cx="12" cy="9" r="3.5" fill="white"/>
          </svg>`;
}
