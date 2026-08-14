function updatePromo(){

  const promoStart = new Date("2026-03-12"); // CAMBIA SOLO QUESTO
  const promoDuration = 19;

  const today = new Date();
  const diffDays = Math.floor((today - promoStart) / (1000 * 60 * 60 * 24));

  let promoText = "";

  if (diffDays < 0) {
    promoText = "🔜 Bonus Revolut in arrivo: nuova promo a breve";
  }
  else if (diffDays < 7) {
    promoText = "🔥 Bonus Revolut attivo: approfittane ora";
  }
  else if (diffDays < 14) {
    promoText = "💸 Bonus Revolut disponibile: ancora per pochi giorni – non perderti i 10€";
  }
  else if (diffDays < promoDuration) {
    promoText = "⏳ Bonus Revolut in scadenza: ultimi giorni per ottenere i 10€";
  }
  else {
    promoText = "🔥 Nuova promo Revolut attiva: puoi ottenere il bonus";
  }

  document.querySelectorAll(".promo-text").forEach(el => {
    el.innerText = promoText;
  });

  initSiteSearch();

}

/* ============================================
   RICERCA — inizializzata qui perché updatePromo() viene già chiamata
   da ogni pagina subito dopo l'iniezione di includes/header.html
   (uno script <script> dentro header.html non verrebbe eseguito,
   perché iniettato via innerHTML: per questo la logica vive qui).
   ============================================ */
let siteSearchReady = false;

function initSiteSearch(){
  if (siteSearchReady) return; // evita doppie inizializzazioni se updatePromo() viene richiamata più volte
  const input = document.getElementById('siteSearchInput');
  const results = document.getElementById('siteSearchResults');
  const wrap = document.querySelector('.nav-search-inline');
  if (!input || !results || !wrap) return; // header non ancora nel DOM
  siteSearchReady = true;

  // Fuse.js servito localmente (js/fuse.min.js), niente dipendenza da CDN esterni:
  // un file in meno che può rallentare o fallire il caricamento della ricerca
  loadScriptOnce('/js/fuse.min.js')
    .then(() => fetch('/search-index.json').then(r => r.json()))
    .then(data => {
      const fuse = new Fuse(data, { keys: ['title', 'category'], threshold: 0.35, ignoreLocation: true });

      function render(list){
        if (!list.length){
          results.innerHTML = '<div class="search-empty">Nessun risultato</div>';
          return;
        }
        results.innerHTML = list.slice(0, 10).map(r => {
          const item = r.item || r;
          return `<a href="${item.url}"><span class="res-cat">${item.category}</span>${item.title}</a>`;
        }).join('');
      }

      input.addEventListener('focus', () => {
        results.classList.add('open');
        render(input.value.trim() ? fuse.search(input.value.trim()) : data.slice(0, 10));
      });

      input.addEventListener('input', () => {
        const q = input.value.trim();
        render(q ? fuse.search(q) : data.slice(0, 10));
      });

      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) results.classList.remove('open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape'){ results.classList.remove('open'); input.blur(); }
      });
    })
    .catch(err => console.error('Ricerca sito non disponibile:', err));
}

function loadScriptOnce(src){
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
