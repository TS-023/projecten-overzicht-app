/* ═══════════════════════════════════════════════════════════
   profiles-view.js — Contacten / profielen
   ═══════════════════════════════════════════════════════════ */

const ProfilesView = (() => {
  let contacts   = [];
  let filterType = 'bedrijven';

  function init() {
    document.querySelectorAll('#profielen-view .filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        filterType = btn.dataset.filter;
        document.querySelectorAll('#profielen-view .filter-pill')
          .forEach(b => b.classList.toggle('active', b.dataset.filter === filterType));
        render(contacts);
      });
    });
  }

  function render(data) {
    contacts = data;
    const list = document.querySelector('#profielen-view .contacts-list');

    if (!contacts.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Geen contacten gevonden</p></div>`;
      return;
    }

    list.innerHTML = contacts.map(c => {
      const adres = [
        c.straat ? `${c.straat}${c.huisnummer ? ' ' + c.huisnummer : ''}` : null,
        c.stad, c.postcode,
      ].filter(Boolean).map(l => `<div>${l}</div>`).join('');

      return `
        <div class="contact-card">
          <div class="contact-info">
            <div class="contact-naam">${c.naam || c.company || '—'}</div>
            <div class="contact-rol">${c.rol || c.type || ''}</div>
            <div class="contact-adres">
              ${adres}
              ${c.email    ? `<div style="margin-top:6px">${c.email}</div>` : ''}
              ${c.telefoon ? `<div>${c.telefoon}</div>` : ''}
            </div>
          </div>
          <div class="contact-avatar">
            ${c.avatar_url ? `<img src="${c.avatar_url}" alt="">` : ''}
          </div>
        </div>`;
    }).join('');
  }

  return { init, render };
})();
