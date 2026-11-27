// Expo Hub · pannello dei commerciali: le icone DISEGNATE (SVG a tratto, nello stile di Segoe Fluent).
// Il kit ARES Glass usa il carattere Segoe Fluent Icons, che c'è solo su Windows: i commerciali possono avere un Mac,
// quindi qui ogni icona è un SVG alto 1em dentro lo stesso <i data-ic="nome">. Questa `ic` sostituisce quella del kit
// (stesso nome, caricata dopo): dialoghi, tendine e menu del kit usano queste.
"use strict";
const SVG_ICONE = {
  aggiungi: '<path d="M12 5v14M5 12h14"/>',
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  indietro: '<path d="M15 5l-7 7 7 7"/>',
  avanti: '<path d="M9 5l7 7-7 7"/>',
  giu: '<path d="M5 9l7 7 7-7"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
  invia: '<path d="M4 12l16-7-6 16-3-6.5L4 12z"/><path d="M11 14.5L20 5"/>',
  salva: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  carica: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  fiera: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/>',
  materiale: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  commento: '<path d="M4 5h16v11H9l-5 4z"/>',
  lingua: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17"/>',
  utente: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  errore: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  avviso: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  domanda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.9M12 17v.3"/>',
  cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
  aggiorna: '<path d="M19 8a7.5 7.5 0 1 0 1 6"/><path d="M19 3.5V8h-4.5"/>',
  scadenza: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 2M9 2.5h6"/>',
  stand: '<path d="M3 9l9-5 9 5v10l-9 2-9-2z"/><path d="M12 4v17"/>',
  letto: '<path d="M12 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  // fiere condivise (2026-11-27): chi partecipa, ed esci dalla fiera
  gruppo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.9-3.4 3.4-5 6.5-5s5.6 1.6 6.5 5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17.8 15.3c1.9.7 3.2 2.3 3.7 4.7"/>',
  esci: '<path d="M13 4H5v16h8"/><path d="M10 12h10M16 8l4 4-4 4"/>',
  installa: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 15.5V20h15v-4.5"/>',
};
function ic(nome) {
  const d = SVG_ICONE[nome];
  if (!d) return `<i data-ic="${nome}"></i>`;
  return `<i data-ic="${nome}" class="svg"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg></i>`;
}
