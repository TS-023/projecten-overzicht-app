/* ═══════════════════════════════════════════════════════════
   geocode.js — Nominatim geocoder met localStorage cache
   ═══════════════════════════════════════════════════════════ */

const GEOCACHE_KEY = 'mvsa.geocache.v2';

function geocacheGet(key) {
  try { return JSON.parse(localStorage.getItem(GEOCACHE_KEY) || '{}')[key] || null; }
  catch { return null; }
}

function geocacheSet(key, val) {
  try {
    const all = JSON.parse(localStorage.getItem(GEOCACHE_KEY) || '{}');
    all[key] = val;
    localStorage.setItem(GEOCACHE_KEY, JSON.stringify(all));
  } catch {}
}

async function geocode(query) {
  if (!query) return null;
  const cached = geocacheGet(query);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { 'Accept-Language': 'nl', 'User-Agent': 'MVSA-App/2.0' } }
    );
    const data = await res.json();
    if (data?.[0]) {
      const v = { lat: +data[0].lat, lng: +data[0].lon };
      geocacheSet(query, v);
      return v;
    }
  } catch {}
  return null;
}

async function resolveCoords(project) {
  if (project.lat && project.lng) return project;
  const addr = [project.straat, project.huisnummer, project.postcode, project.stad]
    .filter(Boolean).join(' ');
  const coords = await geocode(addr) || await geocode(`${project.stad}, Nederland`);
  if (coords) return { ...project, ...coords };
  return project;
}
