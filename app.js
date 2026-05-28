/* ═══════════════════════════════════════════════════════════
   app.js — Hoofd-app logica
   ═══════════════════════════════════════════════════════════ */

(async function () {
  let allProjects = [];
  let allContacts = [];
  let activeTab   = 'kaart';

  // ── Loading screen ────────────────────────────────────────
  function hideLoading() {
    const screen = document.getElementById('loading-screen');
    setTimeout(() => screen.classList.add('fade-out'), 1800);
    setTimeout(() => screen.remove(), 2500);
  }

  // ── Tab navigatie ─────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('#tab-bar button').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('active', v.id === `${tab}-view`));
    if (tab === 'kaart') {
      MapView.init();
      MapView.render(allProjects.filter(p => p.lat && p.lng));
    }
  }

  // ── Init componenten ──────────────────────────────────────
  ListView.init(p => ProjectDetail.show(p));
  ProfilesView.init();
  SearchOverlay.init(p => ProjectDetail.show(p));

  document.querySelector('.preview-open-btn').addEventListener('click', () => {
    const p = MapView.getActiveProject();
    if (p) ProjectDetail.show(p);
  });
  document.querySelector('#map-preview .close-btn').addEventListener('click', () =>
    MapView.closePreview());

  document.querySelectorAll('#tab-bar button').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  document.getElementById('btn-zoeken').addEventListener('click',    () => SearchOverlay.show(allProjects));
  document.getElementById('btn-filters').addEventListener('click',   () => {});
  document.getElementById('btn-favorieten').addEventListener('click',() => {});
  document.getElementById('btn-dashboard').addEventListener('click', () => {});
  document.getElementById('appbar-search').addEventListener('click', () => SearchOverlay.show(allProjects));

  // ── Data laden ────────────────────────────────────────────
  try {
    const { data: projs } = await db.from('projects').select('*').order('created_at', { ascending: false });

    if (projs) {
      allProjects = await Promise.all(projs.map(async p => {
        let thumbUrl = null;
        if (p.projectnummer) {
          try { const imgs = await Images.getForProject(p.projectnummer); thumbUrl = imgs[0] || null; } catch {}
        }
        return { ...p, thumbUrl };
      }));
      ListView.render(allProjects);
    }

    try {
      const { data: contacts } = await db.from('contacts').select('*');
      if (contacts) { allContacts = contacts; ProfilesView.render(allContacts); }
    } catch {}

  } catch (e) { console.error('Data laden mislukt:', e); }

  hideLoading();
  switchTab('kaart');

  // ── Geocoding op achtergrond ──────────────────────────────
  const needsGeocode = allProjects.filter(p => !p.lat && (p.straat || p.stad));
  if (needsGeocode.length) {
    const toast = document.getElementById('map-loading-toast');
    toast.style.display = 'block';

    for (let i = 0; i < Math.min(needsGeocode.length, 20); i++) {
      const p = needsGeocode[i];
      toast.textContent = `📍 Adres opzoeken ${i + 1}/${Math.min(needsGeocode.length, 20)}: ${p.projectnaam}…`;
      const resolved = await resolveCoords(p);
      if (resolved.lat && resolved.lng) {
        allProjects = allProjects.map(pp => pp.id === p.id ? { ...pp, lat: resolved.lat, lng: resolved.lng } : pp);
        db.from('projects').update({ lat: resolved.lat, lng: resolved.lng }).eq('id', p.id).then(() => {}).catch(() => {});
        if (activeTab === 'kaart') MapView.render(allProjects.filter(pp => pp.lat && pp.lng));
      }
      await sleep(1200);
    }
    toast.style.display = 'none';
  }
})();
