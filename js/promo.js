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

}
