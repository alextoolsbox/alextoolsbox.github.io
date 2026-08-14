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
  initClusterNav();
  syncHeaderHeight();

}

/* ============================================
   ALTEZZA HEADER DINAMICA — l'header è fixed e la sua altezza reale
   varia (promo bar, ricerca che va a capo su mobile, larghezza schermo):
   un padding-top fisso in CSS può disallinearsi e nascondere l'inizio
   della pagina sotto l'header. Qui si misura l'header vero e si imposta
   il padding-top del body di conseguenza, così resta sempre corretto.
   I valori in CSS restano solo come fallback per il primo istante di
   caricamento, prima che questo script giri.
   ============================================ */
function syncHeaderHeight(){
  const header = document.querySelector('.site-header');
  if (!header) return;
  const h = header.offsetHeight;
  document.body.style.paddingTop = h + 'px';
  // stessa misura riusata dalla pillola-bar di cluster (.cluster-nav) per restare
  // agganciata subito sotto l'header quando è "sticky" — un solo punto di verità
  // per l'altezza dell'header, invece di ricalcolarla in due posti diversi
  document.documentElement.style.setProperty('--header-h', h + 'px');
}

let headerResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(headerResizeTimer);
  headerResizeTimer = setTimeout(syncHeaderHeight, 150);
});
window.addEventListener('load', syncHeaderHeight); // ricalcola dopo caricamento loghi/font

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

/* ============================================
   SOTTO-NAVIGAZIONE DI CLUSTER — quando l'utente è dentro una pagina
   di un gruppo (es. /revolut/bonus.html), mostra una riga di pillole
   con le altre pagine collegate a quel brand/servizio, evidenziando
   quella corrente. Iniettata via JS (stesso motivo della ricerca:
   niente <script> dentro header.html), zero modifiche alle pagine.
   Manifest in /cluster-nav.json, da aggiornare quando si aggiungono
   pagine a un cluster esistente o se ne crea uno nuovo.
   ============================================ */
let clusterNavReady = false;

function normClusterPath(p){
  return p.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
}

function initClusterNav(){
  if (clusterNavReady) return;
  const headerHost = document.getElementById('header');
  if (!headerHost) return; // header non ancora nel DOM
  clusterNavReady = true;

  fetch('/cluster-nav.json')
    .then(r => r.json())
    .then(manifest => {
      const path = window.location.pathname;
      let match = null, matchLen = -1;

      Object.values(manifest).forEach(cluster => {
        if (path.startsWith(cluster.prefix) && cluster.prefix.length > matchLen) {
          match = cluster;
          matchLen = cluster.prefix.length;
        }
      });

      if (!match || match.pages.length < 2) return; // nessun cluster o cluster con una sola pagina: niente da mostrare

      const here = normClusterPath(path);
      const links = match.pages.map(p => {
        const isActive = normClusterPath(p.url) === here;
        return `<a href="${p.url}"${isActive ? ' class="active" aria-current="page"' : ''}>${p.label}</a>`;
      }).join('');

      const bar = document.createElement('div');
      bar.className = 'cluster-nav';
      bar.innerHTML = `<div class="cluster-nav-inner"><span class="cluster-nav-label">${match.name}</span>${links}</div>`;

      // sotto la hero della pagina, non subito sotto la navbar — ogni pagina reale
      // ha una .hero (verificato su tutte le sezioni del sito); se per qualche
      // pagina mancasse, fallback subito sotto l'header come prima
      const hero = document.querySelector('.hero');
      if (hero) {
        hero.insertAdjacentElement('afterend', bar);
      } else {
        headerHost.insertAdjacentElement('afterend', bar);
      }
    })
    .catch(err => console.error('Sotto-navigazione non disponibile:', err));
}
