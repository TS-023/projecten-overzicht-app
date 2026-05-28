/* ═══════════════════════════════════════════════════════════
   project-detail.js — Volledig project detailscherm
   ═══════════════════════════════════════════════════════════ */

const ProjectDetail = (() => {
  let activeTab = 'ALGEMEEN';
  let project   = null;
  const TABS    = ['ALGEMEEN', 'TEAM', 'METRAGE', 'PLANNING', 'OVERIG'];

  function fields(p) {
    return {
      ALGEMEEN: [
        ['PROJECTNUMMER', p.projectnummer], ['PROJECTNAAM', p.projectnaam],
        ['FUNCTIE', p.functie], ['PROJECT TYPE', p.project_type],
        ['OPGAVE', p.opgave], ['FASE', p.fase],
        ['OPDRACHTGEVER', p.opdrachtgever], ['ARCHITECT', p.architect],
        ['STAD', p.stad], ['PROVINCIE', p.provincie], ['LAND', p.land],
      ],
      TEAM: [
        ['OPDRACHTGEVER', p.opdrachtgever],
        ['GED. OPDRACHTGEVER', p.gedelegeerd_opdrachtgever],
        ['CONTACTPERSOON', p.contactpersoon],
        ['TELEFOON', p.telefoon], ['EMAIL', p.email],
      ],
      METRAGE: [
        ['TOTAAL BVO', formatM2(p.totaal_bvo)], ['WONEN', formatM2(p.m_wonen)],
        ['KANTOOR', formatM2(p.m_kantoor)], ['COMMERCIEEL', formatM2(p.m_commercieel)],
        ['SHORTSTAY', formatM2(p.m_shortstay)], ['PUBLIEK', formatM2(p.m_publiek)],
        ['ONDERWIJS', formatM2(p.m_onderwijs)],
      ],
      PLANNING: [
        ['OPLEVERDATUM', p.opleverdatum],
        ['VERKREGEN VIA', p.verkregen_dmv],
        ['BOUWHOOGTE', p.bouwhoogte ? `${p.bouwhoogte} m` : null],
      ],
      OVERIG: [
        ['NPG SCORE', p.npg_score],
        ['DAKTUIN', formatM2(p.daktuin)], ['ZONNEPANELEN', formatM2(p.zonnepanelen)],
        ['DUURZAAMHEIDSLABEL', p.duurzaamheidslabel],
        ['AUTOPARKEREN', p.autoparkeren], ['FIETSPARKEREN', p.fietsparkeren],
        ['TEVREDENHEID', p.tevredenheid], ['AWARDS', p.awards],
      ],
    };
  }

  function show(p) {
    project   = p;
    activeTab = 'ALGEMEEN';
    const color   = typeColor(p.project_type || p.functie);
    const overlay = document.getElementById('detail-overlay');

    overlay.querySelector('.detail-hero').innerHTML =
      (p.thumbUrl ? `<img src="${p.thumbUrl}" alt="">` : '')
      + `<button class="detail-back-btn" id="detail-back">←</button>
         <div class="detail-title-wrap">
           <div class="detail-color-bar" style="background:${color}"></div>
           <div class="detail-project-name">${p.projectnaam || '—'}</div>
         </div>`;

    document.getElementById('detail-back').addEventListener('click', hide);
    renderTabs();
    renderFields();
    overlay.classList.add('visible');
  }

  function renderTabs() {
    document.querySelector('.detail-tabs').innerHTML = TABS.map(t =>
      `<button class="${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</button>`
    ).join('');
    document.querySelectorAll('.detail-tabs button').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderTabs(); renderFields(); });
    });
  }

  function renderFields() {
    const rows = (fields(project)[activeTab] || []).filter(([,v]) => v != null && v !== '');
    document.querySelector('.detail-fields').innerHTML = rows.length
      ? rows.map(([l,v]) => `
          <div class="detail-field-row">
            <div class="detail-field-label">${l}</div>
            <div class="detail-field-value">${v}</div>
          </div>`).join('')
      : `<div class="detail-no-data">Geen data beschikbaar</div>`;
  }

  function hide() {
    document.getElementById('detail-overlay').classList.remove('visible');
    project = null;
  }

  return { show, hide };
})();
