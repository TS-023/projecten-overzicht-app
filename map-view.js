/* ═══════════════════════════════════════════════════════════
   map-view.js — Kaart met Leaflet pins
   ═══════════════════════════════════════════════════════════ */

const MapView = (() => {
  let map = null;
  let markers = [];
  let activeProject = null;

  function init() {
    if (map) return;
    map = L.map('map', { zoomControl: false }).setView([52.2, 5.0], 8);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', e => {
      if (!e.originalEvent.target.closest('svg')) closePreview();
    });
  }

  function render(projects) {
    if (!map) init();
    markers.forEach(m => m.remove());
    markers = [];
    projects.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = typeColor(p.project_type || p.functie);
      const icon = L.divIcon({
        className: '',
        html: makePinSvg(color),
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      const m = L.marker([p.lat, p.lng], { icon })
        .addTo(map)
        .on('click', () => showPreview(p));
      markers.push(m);
    });
  }

  function showPreview(project) {
    activeProject = project;
    const color   = typeColor(project.project_type || project.functie);
    const preview = document.getElementById('map-preview');

    const heroEl = preview.querySelector('.preview-hero');
    heroEl.innerHTML = (project.thumbUrl ? `<img src="${project.thumbUrl}" alt="">` : `<div class="no-img">Geen afbeelding</div>`)
      + `<div class="preview-title-wrap">
           <div class="preview-color-bar" style="background:${color}"></div>
           <div class="preview-title">${project.projectnaam || '—'}</div>
         </div>`;

    preview.querySelector('.preview-meta').innerHTML = [
      ['ONTWIKKELAAR', project.opdrachtgever],
      ['METRAGE',      formatM2(project.totaal_bvo)],
      ['ARCHITECT',    project.architect],
      ['FUNCTIE',      project.functie || project.project_type],
    ].map(([l, v]) => `<div><div class="meta-label">${l}</div><div class="meta-value">${v || '—'}</div></div>`).join('');

    preview.classList.add('visible');
  }

  function closePreview() {
    document.getElementById('map-preview').classList.remove('visible');
    activeProject = null;
  }

  function getActiveProject() { return activeProject; }

  return { init, render, showPreview, closePreview, getActiveProject };
})();
