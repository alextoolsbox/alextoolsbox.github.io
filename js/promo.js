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
        if (cluster.prefix && path.startsWith(cluster.prefix) && cluster.prefix.length > matchLen) {
          match = cluster;
          matchLen = cluster.prefix.length;
        }
      });

      // Fallback per cluster senza prefix (es. macro-aree di /guide/, che
      // condividono tutte lo stesso percorso base e non si distinguono per
      // prefisso): matching per URL esatta nell'elenco pagine del cluster.
      // Scatta solo se il passaggio sopra non ha trovato nulla, quindi non
      // tocca in alcun modo i cluster con prefix esistenti.
      if (!match) {
        const hereFallback = normClusterPath(path);
        Object.values(manifest).forEach(cluster => {
          if (!cluster.prefix && cluster.pages.some(p => normClusterPath(p.url) === hereFallback)) {
            match = cluster;
          }
        });
      }

      if (!match || match.pages.length < 2) return; // nessun cluster o cluster con una sola pagina: niente da mostrare

      const here = normClusterPath(path);
      const links = match.pages.map(p => {
        const isActive = normClusterPath(p.url) === here;
        return `<a href="${p.url}"${isActive ? ' class="active" aria-current="page"' : ''}>${p.label}</a>`;
      }).join('');

      const bar = document.createElement('div');
      // cluster-nav-guide: distingue i cluster di macro-area (senza prefix, es.
      // le guide) da quelli di brand — serve solo in CSS per mostrare l'etichetta
      // anche su mobile: per le guide è l'unico indizio della macro-area (l'H1
      // è il titolo della guida, non il nome del cluster, a differenza delle
      // pagine brand dove il nome è già nell'H1).
      bar.className = 'cluster-nav' + (!match.prefix ? ' cluster-nav-guide' : '');
      bar.innerHTML = `<div class="cluster-nav-inner"><span class="cluster-nav-label">${match.name}</span>${links}</div>`;

      // sotto la hero della pagina, non subito sotto la navbar — ogni pagina reale
      // ha una .hero (verificato su tutte le sezioni del sito); se per qualche
      // pagina mancasse, fallback subito sotto l'header come prima
      const hero = document.querySelector('.hero');
      if (hero) {
        // altezza minima uniforme SOLO qui: solo le pagine con pillole soffrono
        // di sfarfallio navigando da una all'altra, le altre 38 pagine del sito
        // (confronti, classifiche, guide...) restano compatte sul loro contenuto
        // reale (vedi .hero.hero-cluster in style.css)
        hero.classList.add('hero-cluster');
        hero.insertAdjacentElement('afterend', bar);
      } else {
        headerHost.insertAdjacentElement('afterend', bar);
      }
    })
    .catch(err => console.error('Sotto-navigazione non disponibile:', err));
}

/* ============================================
   ULTIMO AGGIORNAMENTO — prima era uno <script> duplicato in ogni
   pagina (103 pagine), con testo di fallback diverso e spesso vecchio
   in ognuna, e in oltre metà dei casi (60/103) senza nemmeno la
   formattazione italiana (mostrava la stringa grezza del browser tipo
   "Thu Aug 14 2026..."). Ora ogni pagina ha solo
   <span id="last-modified"></span>, questa funzione unica la popola.
   document.lastModified riflette quando è stato toccato il FILE, non
   quando il dato è stato riverificato: resta un limite noto (da
   risolvere con dati-verificati.json, prossimo step), ma almeno oggi
   è coerente su tutto il sito invece che sbagliato in modi diversi
   pagina per pagina.
   ============================================ */
const LAST_MODIFIED_FALLBACK = "15 agosto 2026"; // unico punto da cambiare, se mai serve

function initLastModified(){
  const el = document.getElementById("last-modified");
  if (!el) return;
  const d = new Date(document.lastModified);
  el.textContent = isNaN(d.getTime()) ? LAST_MODIFIED_FALLBACK : d.toLocaleDateString("it-IT");
}

initLastModified();

/* ============================================
   DATI VERIFICATI — fonte unica di verità per i numeri che si ripetono
   su più pagine (tassi, soglie, bonus, fondo garanzia) e che cambiano
   nel tempo, invece di scriverli a mano in ogni file (vedi la review
   che ha trovato il tasso Trade Republic e il fondo di garanzia
   100.000€ duplicati manualmente in decine di pagine). Stesso pattern
   di cluster-nav.json + initClusterNav(): manifest JSON come fonte di
   verità, letto via fetch() e iniettato nel DOM. Se un dato cambia, si
   aggiorna SOLO in dati-verificati.json, non pagina per pagina.
   Uso in pagina:
     <span data-fact="trade-republic-tasso-nuovi-clienti"></span>
       → sostituito col campo "valore" del fatto
     <span class="verify-badge" data-fact="trade-republic-tasso-nuovi-clienti"></span>
       → riga "🔄 Ultima verifica: DATA — fonte" (tipo "ufficiale") o
         "🔄 Aggiornato: DATA — Dato personale di Alex (fonte)" (tipo "esperienza")
   ============================================ */
let verifiedDataReady = false;

function initVerifiedData(){
  if (verifiedDataReady) return;
  const valueEls = document.querySelectorAll('[data-fact]:not(.verify-badge)');
  const badgeEls = document.querySelectorAll('.verify-badge[data-fact]');
  if (!valueEls.length && !badgeEls.length) return;
  verifiedDataReady = true;

  fetch('/dati-verificati.json')
    .then(r => r.json())
    .then(data => {
      valueEls.forEach(el => {
        const fact = data[el.dataset.fact];
        if (fact) el.textContent = fact.valore;
        else console.warn('Fatto non trovato in dati-verificati.json:', el.dataset.fact);
      });
      badgeEls.forEach(el => {
        const fact = data[el.dataset.fact];
        if (!fact) { console.warn('Fatto non trovato in dati-verificati.json:', el.dataset.fact); return; }
        const dataIt = new Date(fact.verificato).toLocaleDateString('it-IT');
        el.innerHTML = fact.tipo === 'esperienza'
          ? `🔄 Aggiornato: ${dataIt} — Dato personale di Alex${fact.fonte ? ' (' + fact.fonte + ')' : ''}`
          : `🔄 Ultima verifica: ${dataIt}${fact.fonte ? ' — ' + fact.fonte : ''}`;
      });
    })
    .catch(err => console.error('Dati verificati non disponibili:', err));
}

initVerifiedData();

/* ============================================
   LIGHTBOX IMMAGINI — le pagine di guide/tutorial hanno spesso
   screenshot con testo piccolo (tabelle, dashboard) che alla dimensione
   naturale di .image-box (max 500px) sono illeggibili, specie su
   mobile. Click sull'immagine apre un overlay a schermo pieno con la
   versione ingrandita. Un solo overlay riusato per tutte le immagini
   della pagina, creato al primo giro. Le immagini sono già nell'HTML
   statico (non iniettate come l'header), quindi si inizializza subito
   come initLastModified/initVerifiedData, non dentro updatePromo().
   ============================================ */
function initImageLightbox(){
  const images = document.querySelectorAll('.image-box img');
  if (!images.length) return;

  let overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<span class="lightbox-close" aria-label="Chiudi">&times;</span><img alt="">';
    document.body.appendChild(overlay);

    const closeLightbox = () => overlay.classList.remove('open');
    overlay.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  const overlayImg = overlay.querySelector('img');
  images.forEach(img => {
    img.addEventListener('click', () => {
      overlayImg.src = img.src;
      overlayImg.alt = img.alt;
      overlay.classList.add('open');
    });
  });
}

initImageLightbox();
