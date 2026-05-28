/* ═══════════════════════════════════════════════════════════
   list-view.js — Lijst- en rasterweergave
   ═══════════════════════════════════════════════════════════ */

const ListView = (() => {
  let viewMode = 'large';
  let projects = [];
  let onSelect = null;

  function init(cb) {
    onSelect = cb;
    document.getElementById('btn-view-large').addEventListener('click', () => setMode('large'));
    document.getElementById('btn-view-small').addEventListener('click', () => setMode('small'));
  }

  function setMode(mode) {
    viewMode = mode;
    document.getElementById('btn-view-large').classList.toggle('active', mode === 'large');
    document.getElementById('btn-view-small').classList.toggle('active', mode === 'small');
    render(projects);
  }

  function render(projs) {
    projects = projs;
    document.getElementById('list-count').textContent = `${projects.length} projecten`;
    const scroll = document.getElementById('list-scroll');

    if (!projects.length) {
      scroll.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Geen projecten gevonden</p></div>`;
      return;
    }

    if (viewMode === 'large') {
      scroll.innerHTML = projects.map(p => makeCard(p, 'large')).join('');
    } else {
      scroll.innerHTML = `<div class="proj-grid-small">${projects.map(p => makeCard(p, 'small')).join('')}</div>`;
    }

    scroll.querySelectorAll('.proj-card').forEach(el => {
      el.addEventListener('click', () => {
        const p = projects.find(x => x.id === el.dataset.id);
        if (p && onSelect) onSelect(p);
      });
    });
  }

  function makeCard(p, size) {
    const color = typeColor(p.project_type || p.functie);
    return `
      <div class="proj-card ${size}" data-id="${p.id}">
        <div class="proj-card-hero">
          ${p.thumbUrl ? `<img src="${p.thumbUrl}" alt="">` : ''}
          <div class="proj-card-bottom">
            <div class="proj-card-color-bar" style="background:${color}"></div>
            <div class="proj-card-name">${p.projectnaam || '—'}</div>
          </div>
        </div>
        <div class="proj-card-meta">
          ${[['ONTWIKKELAAR',p.opdrachtgever],['METRAGE',formatM2(p.totaal_bvo)],
             ['ARCHITECT',p.architect],['FUNCTIE',p.functie||p.project_type]]
            .map(([l,v])=>`<div><div class="meta-label">${l}</div><div class="meta-value">${v||'—'}</div></div>`).join('')}
        </div>
      </div>`;
  }

  return { init, render };
})();
