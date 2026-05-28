/* ═══════════════════════════════════════════════════════════
   search-overlay.js — Zoekscherm
   ═══════════════════════════════════════════════════════════ */

const SearchOverlay = (() => {
  let projects = [];
  let onSelect = null;

  function init(cb) {
    onSelect = cb;
    document.getElementById('search-input').addEventListener('input', e => renderResults(e.target.value));
    document.getElementById('search-back').addEventListener('click', hide);
  }

  function show(allProjects) {
    projects = allProjects;
    document.getElementById('search-overlay').classList.add('visible');
    const input = document.getElementById('search-input');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 100);
  }

  function hide() {
    document.getElementById('search-overlay').classList.remove('visible');
  }

  function renderResults(q) {
    const container = document.getElementById('search-results');
    q = q.trim().toLowerCase();

    if (q.length <= 1) {
      container.innerHTML = `<div class="search-section-title">Recente projecten</div>`
        + projects.slice(0, 8).map(item).join('');
    } else {
      const hits = projects.filter(p =>
        (p.projectnaam   || '').toLowerCase().includes(q) ||
        (p.stad          || '').toLowerCase().includes(q) ||
        (p.opdrachtgever || '').toLowerCase().includes(q)
      ).slice(0, 15);
      container.innerHTML = hits.length
        ? hits.map(item).join('')
        : `<div class="search-empty">Geen resultaten voor "${q}"</div>`;
    }

    container.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const p = projects.find(x => x.id === el.dataset.id);
        if (p && onSelect) { onSelect(p); hide(); }
      });
    });
  }

  function item(p) {
    const sub = [p.stad, p.provincie].filter(Boolean).join(' • ');
    return `
      <div class="search-result-item" data-id="${p.id}">
        ${makePinSvg(typeColor(p.project_type || p.functie), 16, 21)}
        <div>
          <div class="search-result-name">${p.projectnaam || '—'}</div>
          ${sub ? `<div class="search-result-sub">${sub}</div>` : ''}
        </div>
      </div>`;
  }

  return { init, show, hide };
})();
