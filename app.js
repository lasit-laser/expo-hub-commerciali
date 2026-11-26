// Expo Hub · pannello dei commerciali: la logica della pagina. Usa le funzioni del kit ARES Glass (kit/ares_glass.js:
// adatta, apri, setHTML, morph, cambiaPagina, dialogo, apriTendina...) e parla col motore (Google Apps Script).
"use strict";
const CHIAVE_LS = "expohub_chiave", LINGUA_LS = "expohub_lingua";
const TIPI = ["stand", "rollup", "totem", "banco", "video", "brochure", "catalogo", "inviti", "gadget", "altro"];
const UNITA = ["mm", "cm", "m", "px"];
const ST = { chiave: null, io: null, dettagli: {}, richiesta: null, eventi: [], caricamenti: [], salvato: "", invio: false, pagina: "elenco" };

/* ---------------------------------------------------------------------------------------- motore */
async function chiama(azione, dati = {}) {
  let r, j;
  try {
    // corpo testo semplice: niente "preflight", Apps Script lo accetta da qualsiasi origine
    r = await fetch(EXPO.motore, { method: "POST", body: JSON.stringify(Object.assign({ azione, chiave: ST.chiave }, dati)) });
    j = await r.json();
  } catch (e) {
    const err = new Error(t("err_rete")); err.codice = "rete"; throw err;
  }
  if (!j.ok) {
    const tradotti = { fiera: "err_nome", date_o_documenti: "err_date_doc", accesso: "err_accesso" };
    const err = new Error(tradotti[j.codice] ? t(tradotti[j.codice]) : j.errore); err.codice = j.codice; throw err;
  }
  // ogni dettaglio appena letto (dopo un salvataggio, un file, una risposta) aggiorna anche quelli già in memoria:
  // riaprendo la fiera si vede subito com'è ora, non com'era all'ultima lettura dell'elenco
  if (azione === "leggi" && j.richiesta) (ST.dettagli = ST.dettagli || {})[j.richiesta.id] = { richiesta: j.richiesta, eventi: j.eventi };
  return j;
}
function avvisaErrore(e) {
  dialogo({ tipo: "errore", titolo: e.codice === "accesso" ? t("err_accesso_titolo") : t("err_titolo"), testo: e.message, si: t("ok") });
}

/* ---------------------------------------------------------------------------------------- formati */
const locale = () => ({ it: "it-IT", en: "en-GB", fr: "fr-FR", de: "de-DE", es: "es-ES", pl: "pl-PL" }[LINGUA] || "en-GB");
function data(iso, conOra = false) {
  if (!iso) return "";
  const d = new Date(String(iso).length === 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d)) return "";
  const o = { day: "numeric", month: "short", year: "numeric" };
  if (conOra) Object.assign(o, { hour: "2-digit", minute: "2-digit" });
  return new Intl.DateTimeFormat(locale(), o).format(d);
}
function periodo(a, b) {
  if (!a) return "";
  if (!b || b === a) return data(a);
  const da = new Date(a + "T12:00:00"), db = new Date(b + "T12:00:00");
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear())
    return `${da.getDate()}–${new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(db)}`;
  return `${data(a)} – ${data(b)}`;
}
function peso(n) {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"]; let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i ? 1 : 0)} ${u[i]}`;
}
const iniziali = (nome) => String(nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
const LIVELLO_STATO = { inviata: "acc", in_lavorazione: "warn", in_revisione: "warn", approvata: "ok", consegnata: "ok" };
const pillolaStato = (s) => sigla({ l: LIVELLO_STATO[s] || "mu", t: t("stato_" + s) });

/* ---------------------------------------------------------------------------------------- barra in alto */
function disegnaBarra() {
  const c = ST.io && ST.io.commerciale;
  const dove = ST.pagina === "richiesta" ? `<span class="c-tenue">›</span><b>${esc(nomeRichiesta())}</b>` : "";
  setHTML($("#barra"), `
    <div class="eh-marchio"><img class="segno" src="icona.svg" alt=""><b>EXPO HUB</b></div>
    <div class="briciole"><span class="c-tenue">LASIT</span><span class="c-tenue">›</span><span class="${dove ? "c-tenue" : ""}">${esc(t("titolo_elenco"))}</span>${dove}</div>
    <div class="barra-destra">
      <span class="letto" id="avviso-barra"></span>
      ${temaHTML()}
      <button class="pul medio eh-lingua" data-campo="lingua" id="b-lingua">${ic("lingua")}<span>${esc(LINGUE[LINGUA]._nome)}</span></button>
      ${c ? `<div class="utente"><span class="iniziali">${esc(iniziali(c.nome))}</span><span class="nome">${esc(c.nome)}</span></div>` : ""}
      ${c ? `<button class="pul principale medio" id="b-nuova">${ic("aggiungi")}<span>${esc(t("nuova_richiesta"))}</span></button>` : ""}
    </div>`);
}
// tema chiaro / scuro (utente 2026-11-25): il selettore del kit con le sole icone sole e luna; la scelta resta in questo
// browser (localStorage) e la classe "scuro" su <html> la mette già index.html prima del disegno (niente lampo chiaro)
const TEMA_LS = "expohub-tema";
const temaScuro = () => document.documentElement.classList.contains("scuro");
function temaHTML() {
  const s = temaScuro();
  return `<div class="interruttore eh-tema${s ? " destra" : ""}" data-int="tema"><div class="pillola-scelta"></div>
    <button data-i="0" class="${s ? "" : "scelto"}" data-tip="${esc(t("tema_chiaro"))}" aria-label="${esc(t("tema_chiaro"))}">${ic("sole")}</button>
    <button data-i="1" class="${s ? "scelto" : ""}" data-tip="${esc(t("tema_scuro"))}" aria-label="${esc(t("tema_scuro"))}">${ic("luna")}</button></div>`;
}
function scegliTema(scuro) {
  document.documentElement.classList.toggle("scuro", scuro);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = scuro ? "#0C1D38" : "#DCF1FF";
  try { localStorage.setItem(TEMA_LS, scuro ? "scuro" : "chiaro"); } catch (e) { /* solo comodità */ }
}
function avvisoBarra(testo) {
  const el = $("#avviso-barra"); if (!el) return;
  el.textContent = testo; el.classList.add("accento");
  clearTimeout(avvisoBarra.via); avvisoBarra.via = setTimeout(() => { el.textContent = ""; el.classList.remove("accento"); }, 4000);
}
function cambiaLingua(l) {
  if (!LINGUE[l] || l === LINGUA) return;
  const bozza = ST.pagina === "richiesta" ? leggiModulo() : null;
  LINGUA = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(LINGUA_LS, l); } catch (e) { /* solo comodità */ }
  if (ST.chiave) chiama("lingua", { lingua: l }).catch(() => {});
  disegnaBarra();
  disegnaElenco();
  if (bozza) disegnaRichiesta(bozza);
  if (ST.pagina === "accesso") disegnaAccesso();
}

/* ---------------------------------------------------------------------------------------- elenco */
function disegnaElenco() {
  // i filtri piccoli accanto al titolo (utente 2026-11-25, come nel pannello del marketing): Tutte, In corso,
  // Da completare, Consegnate, ognuno col suo numero; un clic mostra solo quelle
  const tutte = (ST.io && ST.io.richieste) || [];
  const passa = (x, f) => !f || (f === "in_corso" ? x.stato !== "consegnata" : f === "da_completare" ? (x.manca || []).length > 0
    : x.stato === "consegnata");
  const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const filtri = [["", t("filtro_tutte")], ["in_corso", maiuscola(t("tondo_in_corso"))], ["da_completare", maiuscola(t("tondo_da_completare"))],
    ["consegnata", maiuscola(t("tondo_consegnate"))]]
    .map(([f, et]) => `<span class="sigla cliccabile ${(ST.filtro || "") === f ? "l-acc scelta" : "l-mu"}" data-filtro="${f}">${esc(et)} · ${tutte.filter((x) => passa(x, f)).length}</span>`).join("");
  const r = tutte.filter((x) => passa(x, ST.filtro));
  const carte = r.map((x) => {
    const luogo = [x.citta, x.paese].filter(Boolean).join(", ");
    const manca = (x.manca || []).map((m) => sigla({ l: "warn", t: t("manca_" + m) })).join("");
    return `<article class="scheda eh-carta" data-apri="${esc(x.id)}">
      ${testa({ icona: "fiera", titolo: [x.fiera, x.edizione].filter(Boolean).join(" "),
        destra: pallinoNovita(novitaDi(x.id, (ST.dettagli[x.id] || {}).eventi)) + pillolaStato(x.stato) + `<button class="eh-elimina" data-elimina="${esc(x.id)}" title="${esc(t("elimina"))}">${ic("cestino")}</button>` })}
      <div class="corpo">
        <div class="eh-riga">${ic("calendario")}<span>${esc([periodo(x.inizio, x.fine), luogo].filter(Boolean).join(" · ") || "—")}</span></div>
        <div class="eh-riga">${ic("stand")}<span>${esc([x.padiglione, x.stand].filter(Boolean).join(" · ") || "—")}</span></div>
        <div class="eh-riga">${ic("materiale")}<span>${esc(t("materiali_n", { n: x.materiali }))} · ${esc(t("documenti_n", { n: x.documenti }))}</span></div>
        ${x.scadenza ? `<div class="eh-riga">${ic("scadenza")}<span>${esc(t("scadenza_il", { data: data(x.scadenza) }))}</span></div>` : ""}
        ${x.da_rivedere ? `<div class="eh-pillole">${sigla({ l: "acc", t: t("da_rivedere_n", { n: x.da_rivedere }) })}</div>` : ""}
        ${manca ? `<div class="eh-pillole"><span class="et">${esc(t("manca"))}</span>${manca}</div>` : ""}
        <div class="eh-riga tenue"><span>${esc(t("aggiornata_il", { data: data(x.aggiornata) }))}</span></div>
      </div></article>`;
  }).join("");
  const vuoto = `<section class="scheda eh-vuoto">${testa({ icona: "info", titolo: t("vuoto_titolo") })}
    <div class="corpo"><div>${esc(t("vuoto_testo"))}</div>
    <button class="pul principale" data-nuova>${ic("aggiungi")}<span>${esc(t("nuova_richiesta"))}</span></button></div></section>`;
  morph($("#p-elenco"), `<div class="eh-contenuto">
    <div class="intestazione"><div class="titoli"><div class="occhiello">${esc(t("occhiello_elenco"))}</div>
      <div class="eh-titolo-riga"><h1>${esc(t("titolo_elenco"))}</h1>${tutte.length ? `<div class="eh-filtri">${filtri}</div>` : ""}</div>
      <div class="frase"> </div></div></div>
    <div class="eh-griglia">${carte || (ST.filtro ? `<div class="eh-nessuna">${esc(t("filtro_nessuna"))}</div>` : vuoto)}</div></div>`);
}

/* ---------------------------------------------------------------------------------------- richiesta */
function vuota() {
  return { fiera: { nome: "", edizione: "", citta: "", paese: (ST.io && ST.io.commerciale.paese) || "", inizio: "", fine: "", padiglione: "", stand: "", sito: "" },
    allestitore: { azienda: "", referente: "", email: "", telefono: "" }, stand: { misure: "" },
    grafiche: { lingue: [LINGUA], macchine: "" }, materiali: [], note: "" };
}
function nomeRichiesta() {
  const d = ST.richiesta && ST.richiesta.dati;
  return (d && d.fiera && d.fiera.nome) || t("titolo_nuova");
}
const campo = (k, et, val, { tipo = "text", s = "s2", obbl = false, area = false, segnaposto = "" } = {}) =>
  `<label class="eh-campo ${s}"><span class="et">${esc(et)}${obbl ? `<b>${esc(t("obbligatorio"))}</b>` : ""}</span>` +
  (area ? `<span class="campo eh-area"><textarea data-f="${k}" placeholder="${esc(segnaposto)}" spellcheck="true">${esc(val)}</textarea></span>`
    : `<span class="campo"><input data-f="${k}" type="${tipo}" value="${esc(val)}" spellcheck="false" autocomplete="off"></span>`) + `</label>`;

function materialeHTML(m) {
  const id = m.id || "m" + Math.random().toString(36).slice(2, 9);
  const allegati = ST.richiesta.id ? listaFile("materiale", id) : `<div class="quieto">${esc(t("mat_salva_prima"))}</div>`;
  return `<div class="eh-mat-gruppo"><div class="eh-mat" data-mat="${esc(id)}">
    <div class="eh-mat-testa"><span class="tessera piccola">${ic("materiale")}</span><b>${esc(t("tipo_" + (m.tipo || "stand")))}</b>
      <button class="pul medio" data-togli="${esc(id)}">${ic("cestino")}<span>${esc(t("mat_togli"))}</span></button></div>
    <div class="eh-campi">
      <label class="eh-campo s3"><span class="et">${esc(t("mat_tipo"))}</span>
        <button class="tendina" data-campo="tipo-${esc(id)}" data-m="tipo" data-v="${esc(m.tipo || "stand")}"><span class="va">${esc(t("tipo_" + (m.tipo || "stand")))}</span>${ic("giu")}</button></label>
      <label class="eh-campo s3"><span class="et">${esc(t("mat_scadenza"))}</span><span class="campo"><input data-m="scadenza" type="date" value="${esc(m.scadenza || "")}"></span></label>
      <label class="eh-campo s2"><span class="et">${esc(t("mat_larghezza"))}</span><span class="campo"><input data-m="larghezza" inputmode="decimal" value="${esc(m.larghezza || "")}"></span></label>
      <label class="eh-campo s2"><span class="et">${esc(t("mat_altezza"))}</span><span class="campo"><input data-m="altezza" inputmode="decimal" value="${esc(m.altezza || "")}"></span></label>
      <label class="eh-campo s2"><span class="et">${esc(t("mat_unita"))}</span>
        <button class="tendina" data-campo="unita-${esc(id)}" data-m="unita" data-v="${esc(m.unita || "cm")}"><span class="va">${esc(m.unita || "cm")}</span>${ic("giu")}</button></label>
      <label class="eh-campo s3"><span class="et">${esc(t("mat_descrizione"))}</span><span class="campo eh-area"><textarea data-m="descrizione">${esc(m.descrizione || "")}</textarea></span></label>
      <label class="eh-campo s3"><span class="et">${esc(t("mat_specifiche"))}</span><span class="campo eh-area"><textarea data-m="specifiche">${esc(m.specifiche || "")}</textarea></span></label>
    </div>
    <div class="eh-allegati" data-allegati="${esc(id)}">${allegati}</div>
    ${ST.richiesta.id ? `<div class="eh-azioni"><button class="pul medio" data-allega="${esc(id)}">${ic("carica")}<span>${esc(t("mat_allega"))}</span></button></div>` : ""}
  </div>
  <div class="eh-consegne" data-versioni="${esc(id)}">${versioniHTML(id)}</div></div>`;
}

/* ---------------------------------------------------------------------------------------- versioni consegnate */
// in cronologia (REGOLE 11, come nel pannello): commenti e AZIONI del commerciale e del marketing (richiesta inviata, dati
// aggiornati, documenti e allegati caricati, versioni consegnate, risposte alle versioni). MAI i cambi di stato della
// lavorazione; i file di una consegna stanno già nella voce della versione.
const inCronologia = (e) => e.tipo !== "stato" && !(e.tipo === "file" && e.categoria === "consegna")
  && !(e.tipo === "commento" && String(e.testo || "").trim() === "");
// NOVITÀ dal marketing (utente 2026-11-26): commenti e versioni nuove arrivati dopo l'ultima volta che il commerciale
// ha aperto quella fiera SU QUESTO DISPOSITIVO (localStorage: id fiera -> `quando` dell'ultimo evento visto). Pillola
// rossa nella card "Cronologia e commenti" e sulla carta della fiera; sparisce quando la fiera è stata aperta.
// La prima volta su un dispositivo tutto ciò che c'è già conta come visto (niente pillole su fiere vecchie).
const VISTI_LS = "expohub_visti";
function visti() { try { return JSON.parse(localStorage.getItem(VISTI_LS) || "null"); } catch (e) { return null; } }
function salvaVisti(v) { try { localStorage.setItem(VISTI_LS, JSON.stringify(v)); } catch (e) { /* solo comodità */ } }
const daMarketing = (e) => (e.chi === "marketing" || e.chi === "Marketing") && (e.tipo === "commento" || e.tipo === "versione") && inCronologia(e);
const ultimoEvento = (eventi) => (eventi || []).reduce((m, e) => (String(e.quando) > m ? String(e.quando) : m), "");
function inizializzaVisti() {
  if (visti()) return;
  const v = {};
  Object.entries(ST.dettagli || {}).forEach(([id, d]) => { v[id] = ultimoEvento(d.eventi); });
  salvaVisti(v);
}
function novitaDi(id, eventi, dopo = null) {
  const da = dopo !== null ? dopo : ((visti() || {})[id] || "");
  return (eventi || []).filter((e) => daMarketing(e) && String(e.quando) > da);
}
function segnaVisto(id, eventi) { const v = visti() || {}; const u = ultimoEvento(eventi); if (u > (v[id] || "")) { v[id] = u; salvaVisti(v); } }
function pillolaNovita(nuovi) {
  if (!nuovi.length) return "";
  const soloCommenti = nuovi.every((e) => e.tipo === "commento");
  return sigla({ l: "ko", t: t(soloCommenti ? "nuovi_commenti" : "novita_n", { n: nuovi.length }) });
}
// sulla carta dell'elenco: solo un pallino rosso col numero, per non tagliare il nome della fiera
function pallinoNovita(nuovi) {
  return nuovi.length ? `<span class="eh-pallino" title="${esc(pillolaTesto(nuovi))}">${nuovi.length}</span>` : "";
}
function pillolaTesto(nuovi) { return t(nuovi.every((e) => e.tipo === "commento") ? "nuovi_commenti" : "novita_n", { n: nuovi.length }); }
// le versioni che il marketing ha consegnato per un materiale (dalla cronologia), con la risposta del commerciale
function versioniDi(materiale) {
  return ST.eventi.filter((e) => e.tipo === "versione" && e.materiale === materiale).map((e) => {
    const n = Number(e.versione);
    const r = ST.eventi.filter((x) => x.tipo === "revisione" && x.materiale === materiale && Number(x.versione) === n).pop();
    return { n, quando: e.quando, nota: e.testo, esito: r ? r.esito : "", risposta: r || null,
      files: ST.eventi.filter((x) => x.tipo === "file" && x.categoria === "consegna" && x.materiale === materiale && Number(x.versione) === n) };
  }).sort((a, b) => b.n - a.n);
}
function versioniHTML(materiale) {
  const ver = versioniDi(materiale);
  if (!ver.length) return "";
  const ultima = ver[0].n;
  return `<div class="eh-consegne-testa"><span class="tessera piccola l-acc">${ic("documento")}</span><b>${esc(t("ver_titolo"))}</b></div>` + ver.map((v) => {
    const pill = v.esito === "approvata" ? sigla({ l: "ok", t: t("ver_approvata") }) : v.esito === "modifiche" ? sigla({ l: "warn", t: t("ver_mod_chieste") })
      : v.n === ultima ? sigla({ l: "acc", t: t("ver_da_rivedere") }) : sigla({ l: "mu", t: t("ver_superata") });
    const files = v.files.map((f) => `<div class="eh-file-riga"><span class="eh-ic-file">${ic("file")}</span><span class="nome">${esc(f.file_nome)}</span><span class="peso">${esc(peso(f.dimensione))}</span>
      <a class="eh-apri" href="${esc(f.link)}" target="_blank" rel="noopener"><span>${esc(t("ver_apri"))}</span>${ic("avanti")}</a></div>`).join("");
    const azioni = v.n === ultima && !v.esito ? `<div class="eh-azioni" style="justify-content:flex-end">
      <button class="pul medio" data-modifiche="${esc(materiale)}" data-ver="${v.n}">${ic("commento")}<span>${esc(t("ver_modifiche"))}</span></button>
      <button class="pul principale medio" data-approva="${esc(materiale)}" data-ver="${v.n}">${ic("ok")}<span>${esc(t("ver_approva"))}</span></button></div>` : "";
    return `<div class="eh-versione"><div class="eh-versione-testa"><b>${esc(t("ver_versione", { n: v.n }))}</b><span class="c-tenue">${esc(data(v.quando, true))}</span>${pill}</div>
      ${v.nota ? `<div class="eh-versione-nota">${esc(v.nota)}</div>` : ""}<div class="eh-file">${files}</div>
      ${v.risposta && v.risposta.testo ? `<div class="eh-versione-nota" style="margin-top:8px"><b>${esc(v.risposta.chi)}</b> · ${esc(v.risposta.testo)}</div>` : ""}${azioni}</div>`;
  }).join("");
}
async function rispondiVersione(materiale, versione, esito) {
  let testo = "";
  if (esito === "modifiche") {
    const p = dialogo({ tipo: "domanda", titolo: t("ver_mod_titolo"), testo: t("ver_mod_testo"), campo: "", si: t("ver_mod_invia") });
    setTimeout(() => { const n = $('#dialogo [data-r="no"] span'); if (n) n.textContent = t("annulla"); }, 0);
    const r = await p;
    if (r === null || r === false || !String(r).trim()) return;
    testo = String(r).trim();
  } else if (!(await domanda(t("ver_ok_titolo", { n: versione }), t("ver_ok_testo"), t("ver_ok_si")))) return;
  try {
    await chiama("rispondi", { id: ST.richiesta.id, materiale, versione, esito, testo });
    const j = await chiama("leggi", { id: ST.richiesta.id });
    ST.eventi = j.eventi; ST.richiesta.stato = j.richiesta.stato; ST.richiesta.aggiornata = j.richiesta.aggiornata;
    aggiornaFile();
    aggiornaElenco();
  } catch (e) { avvisaErrore(e); }
}

function disegnaRichiesta(d) {
  const nuova = !ST.richiesta.id;
  const f = d.fiera, a = d.allestitore;
  const lingue = ORDINE_LINGUE.map((l) => `<span class="sigla ${d.grafiche.lingue.includes(l) ? "l-acc scelta" : "spenta"}" data-lingua-g="${l}">${esc(LINGUE[l]._nome)}</span>`).join("");
  setHTML($("#p-richiesta"), `<div class="eh-contenuto">
    <button class="pul medio eh-indietro" id="b-indietro">${ic("indietro")}<span>${esc(t("indietro"))}</span></button>
    <div class="intestazione" id="i-richiesta"></div>
    <div class="eh-colonne">
      <div class="colonna">
        <section class="scheda">${testa({ icona: "calendario", titolo: t("sez_fiera") })}
          <div class="corpo"><div class="eh-campi">
            ${campo("fiera.nome", t("c_nome"), f.nome, { s: "s4", obbl: true })}
            ${campo("fiera.edizione", t("c_edizione"), f.edizione, { s: "s2" })}
            ${campo("fiera.citta", t("c_citta"), f.citta, { s: "s3" })}
            ${campo("fiera.paese", t("c_paese"), f.paese, { s: "s3" })}
            ${campo("fiera.inizio", t("c_inizio"), f.inizio, { tipo: "date", s: "s2" })}
            ${campo("fiera.fine", t("c_fine"), f.fine, { tipo: "date", s: "s2" })}
            ${campo("fiera.padiglione", t("c_padiglione"), f.padiglione, { s: "s1" })}
            ${campo("fiera.stand", t("c_stand"), f.stand, { s: "s1" })}
            ${campo("fiera.sito", t("c_sito"), f.sito, { s: "s6", tipo: "url" })}
          </div></div></section>

        <section class="scheda">${testa({ icona: "documento", titolo: t("sez_documenti") })}
          <div class="corpo">
            <div class="eh-rilascio" id="rilascio">${ic("carica")}<span>${esc(t("doc_trascina"))}</span>
              <button class="pul medio" id="b-scegli">${ic("documento")}<span>${esc(t("doc_scegli"))}</span></button></div>
            <div id="documenti">${listaFile("allestitore")}</div>
            <div class="eh-campi" style="margin-top:16px">
              <div class="eh-sotto-titolo">${esc(t("sez_allestitore"))}</div>
              ${campo("allestitore.azienda", t("c_azienda"), a.azienda, { s: "s3" })}
              ${campo("allestitore.referente", t("c_referente"), a.referente, { s: "s3" })}
              ${campo("allestitore.email", t("c_email"), a.email, { s: "s3", tipo: "email" })}
              ${campo("allestitore.telefono", t("c_telefono"), a.telefono, { s: "s3", tipo: "tel" })}
              ${campo("stand.misure", t("c_misure"), d.stand.misure, { s: "s6", area: true })}
            </div>
          </div></section>

        <section class="scheda">${testa({ icona: "materiale", titolo: t("sez_materiali") })}
          <div class="corpo">
                        <div id="materiali">${d.materiali.length ? d.materiali.map(materialeHTML).join("") : `<div class="vuoto-riga" id="mat-vuoto">${esc(t("mat_vuoto"))}</div>`}</div>
            <div class="eh-azioni"><button class="pul" id="b-materiale">${ic("aggiungi")}<span>${esc(t("mat_aggiungi"))}</span></button></div>
          </div></section>

        <section class="scheda">${testa({ icona: "commento", titolo: t("sez_grafiche") })}
          <div class="corpo"><div class="eh-campi">
            <div class="eh-campo s6"><span class="et">${esc(t("c_lingue"))}</span><div class="eh-lingue" id="lingue-g">${lingue}</div></div>
            ${campo("grafiche.macchine", t("c_macchine"), d.grafiche.macchine, { s: "s6", area: true })}
            ${campo("note", t("c_note"), d.note, { s: "s6", area: true })}
          </div></div></section>
      </div>

      <div class="colonna">
        <section class="scheda eh-stato" id="pannello-stato"></section>
        <section class="scheda" id="pannello-cronologia"></section>
      </div>
    </div></div>`);
  if (!nuova) $("#p-richiesta")._html = null;     // il modulo resta: le parti vive si aggiornano a parte
  aggiornaLato();
}

function leggiModulo() {
  const p = $("#p-richiesta"), d = vuota();
  d.grafiche.lingue = [];
  $$("[data-f]", p).forEach((el) => { const [a, b] = el.dataset.f.split("."); if (b) d[a][b] = el.value.trim(); else d[a] = el.value.trim(); });
  d.grafiche.lingue = $$("#lingue-g .sigla.scelta", p).map((el) => el.dataset.linguaG);
  d.materiali = $$(".eh-mat", p).map((m) => {
    const o = { id: m.dataset.mat };
    $$("[data-m]", m).forEach((el) => { o[el.dataset.m] = el.dataset.v !== undefined ? el.dataset.v : el.value.trim(); });
    return o;
  });
  return d;
}

/* ---------------------------------------------------------------------------------------- file */
function listaFile(categoria, materiale = "") {
  const caricati = ST.eventi.filter((e) => e.tipo === "file" && e.categoria === categoria && (categoria !== "materiale" || e.materiale === materiale));
  const inCorso = ST.caricamenti.filter((c) => c.categoria === categoria && (categoria !== "materiale" || c.materiale === materiale) && c.stato !== "ok");
  const righe = caricati.map((e) => `<div class="eh-file-riga"><span class="eh-ic-file">${ic("file")}</span><span class="nome">${esc(e.file_nome)}</span><span class="peso">${esc(peso(e.dimensione))}</span>${sigla({ l: "ok", t: t("doc_caricato") })}</div>`)
    .concat(inCorso.map((c) => `<div class="eh-file-riga"><span class="eh-ic-file">${ic("file")}</span><span class="nome">${esc(c.nome)}</span><span class="peso">${esc(peso(c.dimensione))}</span>${
      c.stato === "coda" ? sigla({ l: "mu", t: t("doc_in_coda") }) : c.stato === "errore" ? sigla({ l: "ko", t: t("doc_errore") })
        : `<div class="eh-avanzamento" title="${esc(t("doc_caricamento", { p: Math.round(c.p * 100) }))}"><div style="transform:scaleX(${c.p.toFixed(3)})"></div></div>`}</div>`));
  if (!righe.length) return categoria === "allestitore" ? `<div class="vuoto-riga" style="margin-top:10px">${esc(t("doc_nessuno"))}</div>` : "";
  return `<div class="eh-file">${righe.join("")}</div>`;
}
function aggiornaFile() {
  if (ST.pagina !== "richiesta") return;
  morph($("#documenti"), listaFile("allestitore"));
  $$("[data-allegati]").forEach((el) => morph(el, listaFile("materiale", el.dataset.allegati)));
  $$("[data-versioni]").forEach((el) => morph(el, versioniHTML(el.dataset.versioni)));
  aggiornaLato();
}
function aggiungiFile(files, categoria, materiale = "") {
  for (const file of files) {
    const voce = { id: Math.random().toString(36).slice(2), nome: file.name, dimensione: file.size, file, categoria, materiale, stato: "coda", p: 0 };
    ST.caricamenti.push(voce);
    if (ST.richiesta.id) carica(voce).catch(() => {});
  }
  aggiornaFile();
}
async function carica(voce) {
  voce.stato = "su"; voce.p = 0; aggiornaFile();
  try {
    const { sessione } = await chiama("inizia_file", { id: ST.richiesta.id, nome: voce.nome, tipo: voce.file.type || "application/octet-stream",
      dimensione: voce.dimensione, categoria: voce.categoria, materiale: voce.materiale, origine: location.origin });
    const pezzo = (EXPO.pezzo_mb || 32) * 1024 * 1024;
    let inizio = 0, esito = null, tentativi = 0;
    if (!voce.dimensione) esito = await put(sessione, voce.file, 0, 0, voce);
    while (!esito || !esito.finito) {
      const fine = Math.min(inizio + pezzo, voce.dimensione);
      try { esito = await put(sessione, voce.file.slice(inizio, fine), inizio, voce.dimensione, voce); tentativi = 0; }
      catch (e) { if (++tentativi > 3) throw e; await new Promise((r) => setTimeout(r, 1500 * tentativi)); continue; }
      if (!esito.finito) inizio = esito.arrivati;
    }
    await chiama("file_caricato", { id: ST.richiesta.id, file_id: esito.id, categoria: voce.categoria, materiale: voce.materiale });
    voce.stato = "ok";
    const j = await chiama("leggi", { id: ST.richiesta.id });
    ST.eventi = j.eventi;
  } catch (e) {
    voce.stato = "errore";
    throw e;
  } finally { aggiornaFile(); }
}
function put(sessione, blob, inizio, totale, voce) {
  return new Promise((ok, ko) => {
    const x = new XMLHttpRequest();
    x.open("PUT", sessione);
    x.setRequestHeader("Content-Range", totale ? `bytes ${inizio}-${inizio + blob.size - 1}/${totale}` : "bytes */0");
    x.upload.onprogress = (e) => { voce.p = totale ? (inizio + e.loaded) / totale : 1; aggiornaFile(); };
    x.onload = () => {
      if (x.status === 308) { const r = x.getResponseHeader("Range"); ok({ finito: false, arrivati: r ? Number(r.split("-")[1]) + 1 : inizio + blob.size }); }
      else if (x.status === 200 || x.status === 201) { const f = JSON.parse(x.responseText); ok({ finito: true, id: f.id }); }
      else ko(new Error("Drive " + x.status));
    };
    x.onerror = () => ko(new Error("rete"));
    x.send(blob);
  });
}

/* ---------------------------------------------------------------------------------------- colonna di destra */
function manca(d) {
  const out = [];
  if (!d.fiera.inizio) out.push("date");
  if (!d.fiera.stand) out.push("stand");
  const doc = ST.eventi.some((e) => e.tipo === "file" && e.categoria === "allestitore") || ST.caricamenti.some((c) => c.categoria === "allestitore" && c.stato !== "errore");
  if (!doc) out.push("documenti");
  if (!d.materiali.length) out.push("materiali");
  else if (d.materiali.some((m) => !m.scadenza)) out.push("scadenze");
  return out;
}
function daSalvare() {
  if (!ST.richiesta) return false;
  return JSON.stringify(leggiModulo()) !== ST.salvato || ST.caricamenti.some((c) => c.stato === "coda" && !ST.richiesta.id);
}
function aggiornaLato() {
  if (ST.pagina !== "richiesta" || !ST.richiesta) return;
  const d = leggiModulo(), r = ST.richiesta, nuova = !r.id, m = manca(d), sporco = daSalvare();
  morph($("#i-richiesta"), intestazioneHTML({ occhiello: t("occhiello_richiesta"), titolo: d.fiera.nome || t("titolo_nuova"),
    frase: nuova ? "" : [periodo(d.fiera.inizio, d.fiera.fine), [d.fiera.citta, d.fiera.paese].filter(Boolean).join(", ")].filter(Boolean).join(" · ") }));
  morph($("#pannello-stato"), `${testa({ icona: "info", titolo: t("sez_stato"), destra: nuova ? "" : pillolaStato(r.stato) })}
    <div class="corpo">
      ${nuova ? "" : `<div class="eh-riga tenue"><span>${esc(t("inviata_il", { data: data(r.creata) }))} · ${esc(t("aggiornata_il", { data: data(r.aggiornata) }))}</span></div>`}
      <div class="eh-pillole"><span class="et">${esc(t("cosa_manca"))}</span>${m.length ? m.map((x) => sigla({ l: "warn", t: t("manca_" + x) })).join("") : sigla({ l: "ok", t: t("niente_manca") })}</div>
      <button class="pul principale${ST.invio ? " occupato" : ""}" id="b-salva" ${ST.invio || (!nuova && !sporco) ? "disabled" : ""}>${ic(nuova ? "invia" : "salva")}<span>${esc(ST.invio ? t("salvataggio") : nuova ? t("invia") : t("salva"))}</span></button>
      ${nuova ? "" : `<div class="eh-salvato${sporco ? " da-salvare" : ""}">${esc(sporco ? t("non_salvate") : t("salvate"))}</div>`}
    </div>`);
  const nomeMat = (id) => { const m = d.materiali.find((x) => x.id === id); return m ? t("tipo_" + m.tipo) : ""; };
  const nuovi = nuova ? [] : novitaDi(r.id, ST.eventi, ST.vistoPrima || ""), idNuovi = new Set(nuovi.map((e) => e.id));
  const eventi = ST.eventi.filter(inCronologia).slice().reverse().map((e) => {
    const marketing = e.chi === "marketing" || e.chi === "Marketing";
    const cosa = e.tipo === "creata" ? t("ev_creata") : e.tipo === "aggiornata" ? t("ev_aggiornata", { cosa: String(e.testo || "").split(", ").map((k) => t("k_" + k)).join(", ") })
      : e.tipo === "file" ? t("ev_file", { nome: e.file_nome }) : e.tipo === "stato" ? t("ev_stato", { stato: t("stato_" + e.testo) })
      : e.tipo === "versione" ? t("ev_versione", { n: e.versione, mat: nomeMat(e.materiale) }) + (e.testo ? `\n${e.testo}` : "")
      : e.tipo === "revisione" ? t(e.esito === "approvata" ? "ev_rev_ok" : "ev_rev_mod", { n: e.versione, mat: nomeMat(e.materiale) }) + (e.testo ? `\n${e.testo}` : "")
      : e.testo;
    return `<div class="eh-evento ${e.tipo}${marketing ? " marketing" : ""}${idNuovi.has(e.id) ? " nuovo" : ""}"><span class="avatar piccolo">${esc(marketing ? "M" : iniziali(e.chi))}</span>
      <div><div class="chi"><b>${esc(marketing ? t("marketing") : e.chi)}</b>${esc(data(e.quando, true))}</div><div class="cosa">${esc(cosa)}</div></div></div>`;
  }).join("");
  const bozzaCommento = $("#commento") ? $("#commento").value : "";
  morph($("#pannello-cronologia"), `${testa({ icona: "commento", titolo: t("sez_cronologia"), destra: pillolaNovita(nuovi) })}
    <div class="corpo">${nuova ? `<div class="quieto">${esc(t("commento_dopo"))}</div>` : `<div class="eh-eventi">${eventi}</div>
      <div class="eh-commento"><span class="campo eh-area"><textarea id="commento" placeholder="${esc(t("commento_segnaposto"))}">${esc(bozzaCommento)}</textarea></span>
      <button class="pul medio" id="b-commento">${ic("commento")}<span>${esc(t("commento_invia"))}</span></button></div>`}</div>`);
  disegnaBarra();
}

/* ---------------------------------------------------------------------------------------- azioni */
async function apriRichiesta(id) {
  // da dentro una richiesta (es. "Nuova richiesta" mentre se ne guarda un'altra, utente 2026-11-25): prima le modifiche
  // non salvate, come per "Le mie fiere"; poi la nuova si disegna al posto di quella, senza passare dall'elenco
  const gia = ST.pagina === "richiesta";
  if (gia && daSalvare()) {
    const via = await domanda(t("esci_titolo"), t("esci_domanda"), t("esci_si"));
    if (!via) return;
  }
  try {
    if (id) {
      // il dettaglio è già arrivato con l'elenco (io completo): si apre SUBITO; dal motore (3-4 s) solo se manca
      const pronto = ST.dettagli && ST.dettagli[id];
      const j = pronto ? JSON.parse(JSON.stringify(pronto)) : await chiama("leggi", { id });
      ST.richiesta = j.richiesta; ST.eventi = j.eventi;
      ST.vistoPrima = (visti() || {})[id] || "";       // le novità restano segnate finché la fiera è aperta
      segnaVisto(id, ST.eventi);
    } else { ST.richiesta = { id: null, stato: "inviata", dati: vuota() }; ST.eventi = []; }
    ST.caricamenti = [];
    const dati = Object.assign(vuota(), ST.richiesta.dati);
    $("#p-richiesta")._html = null;
    ST.pagina = "richiesta";
    disegnaRichiesta(dati);
    ST.salvato = JSON.stringify(leggiModulo());
    aggiornaLato();
    if (gia) { $("#p-richiesta").scrollTop = 0; apri($$(".scheda", $("#p-richiesta"))); }
    else cambiaPagina($("#p-elenco"), $("#p-richiesta"), () => ST.pagina === "richiesta");
  } catch (e) { avvisaErrore(e); }
}
// Il commerciale elimina una sua fiera (utente 2026-11-26): dopo la conferma sparisce SUBITO dall'elenco e il motore la
// toglie anche dal pannello del marketing. Se il motore dice di no, la fiera torna al suo posto con l'errore.
async function eliminaFiera(id) {
  const x = ((ST.io && ST.io.richieste) || []).find((r) => r.id === id);
  if (!x) return;
  const nome = [x.fiera, x.edizione].filter(Boolean).join(" ");
  if (!await domanda(t("elimina_titolo"), t("elimina_testo", { nome }), t("elimina_si"))) return;
  const prima = ST.io.richieste;
  ST.io.richieste = prima.filter((r) => r.id !== id);
  disegnaElenco(); disegnaBarra();
  try { await chiama("elimina", { id }); if (ST.dettagli) delete ST.dettagli[id]; }
  catch (e) { ST.io.richieste = prima; disegnaElenco(); disegnaBarra(); avvisaErrore(e); }
}
async function tornaElenco() {
  if (daSalvare()) {
    const via = await domanda(t("esci_titolo"), t("esci_domanda"), t("esci_si"));
    if (!via) return;
  }
  ST.pagina = "elenco"; ST.richiesta = null;
  disegnaBarra();
  // l'elenco si ridisegna SUBITO con quello che si sa già (utente 2026-11-26: il pallino della fiera appena letta
  // restava finché non rispondeva il motore, 3-4 s, e sembrava non sparire); poi la rilettura lo aggiorna
  disegnaElenco();
  cambiaPagina($("#p-richiesta"), $("#p-elenco"), () => ST.pagina === "elenco");
  aggiornaElenco();
}
async function aggiornaElenco() {
  try { applicaIo(await chiama("io", { completo: true })); } catch (e) { /* resta quello di prima */ }
}
// Ogni 20 s (e quando si torna sulla pagina): "è cambiato qualcosa?" con una chiamata leggerissima; se sì si rileggono
// l'elenco e la richiesta aperta (stato, cronologia, versioni). Il modulo che si sta scrivendo NON si tocca.
let _firma = null, _controllo = false;
// i dati di `io` appena arrivati: elenco, dettagli e firma ("com'erano i fogli") per il controllo successivo
function applicaIo(j) {
  ST.io = j; ST.dettagli = j.dettagli || {};
  if (j.firma) _firma = j.firma;
  inizializzaVisti(); disegnaElenco(); disegnaBarra();
}
// LIVE (utente 2026-11-26): UNA chiamata sola, `io` con la firma che la pagina conosce; se nei fogli non è cambiato
// niente il motore risponde subito "uguale", se no manda già elenco e dettagli. Con la fiera aperta si aggiornano
// anche stato, cronologia e versioni. Il modulo che si sta scrivendo NON si tocca.
async function controllaNovita() {
  if (!ST.chiave || !ST.io || _controllo || ST.invio) return;
  _controllo = true;
  try {
    const j = await chiama("io", { completo: true, firma_nota: _firma || "" });
    if (j.uguale) return;
    applicaIo(j);
    const id = ST.pagina === "richiesta" && ST.richiesta && ST.richiesta.id;
    const d = id && ST.dettagli[id];
    if (d) {
      ST.eventi = d.eventi; ST.richiesta.stato = d.richiesta.stato; ST.richiesta.aggiornata = d.richiesta.aggiornata;
      segnaVisto(id, ST.eventi);                  // arrivate mentre la si guarda: segnate ora, viste all'uscita
      aggiornaFile();
    }
  } catch (e) { /* si riprova al giro dopo */ }
  finally { _controllo = false; }
}
// un controllo ogni 2 s con la pagina davanti, ogni 15 s quando è dietro altre finestre o ridotta a icona (prima si
// fermava: le novità comparivano solo riaprendo l'app); tornandoci, un controllo subito
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
(async function giroLive() {
  for (;;) {
    const inizio = Date.now();
    await controllaNovita();
    await pausa(Math.max(500, (document.hidden ? 15000 : 2000) - (Date.now() - inizio)));
  }
})();
document.addEventListener("visibilitychange", () => { if (!document.hidden) controllaNovita(); });
function domanda(titolo, testo, si) {
  const p = dialogo({ tipo: "domanda", titolo, testo, si });
  setTimeout(() => { const n = $('#dialogo [data-r="no"] span'); if (n) n.textContent = t("annulla"); }, 0);
  return p;
}
async function salva() {
  const d = leggiModulo(), nuova = !ST.richiesta.id;
  if (!d.fiera.nome) { await dialogo({ tipo: "avviso", titolo: t("err_titolo"), testo: t("err_nome"), si: t("ok") }); $('[data-f="fiera.nome"]').focus(); return; }
  const inCoda = ST.caricamenti.filter((c) => c.stato === "coda");
  if (nuova && !d.fiera.inizio && !inCoda.length) { await dialogo({ tipo: "avviso", titolo: t("err_titolo"), testo: t("err_date_doc"), si: t("ok") }); return; }
  ST.invio = true; aggiornaLato();
  try {
    const r = await chiama("salva", { id: ST.richiesta.id, dati: d, con_documenti: inCoda.length > 0 });
    ST.richiesta.id = r.id;
    for (const voce of inCoda) { try { await carica(voce); } catch (e) { /* resta "non caricato" nell'elenco */ } }
    const j = await chiama("leggi", { id: r.id });
    ST.richiesta = j.richiesta; ST.eventi = j.eventi;
    ST.caricamenti = ST.caricamenti.filter((c) => c.stato === "errore");
    if (nuova) { $("#p-richiesta")._html = null; disegnaRichiesta(Object.assign(vuota(), j.richiesta.dati)); }
    ST.salvato = JSON.stringify(leggiModulo());
    avvisoBarra(nuova ? t("inviata_ok") : t("salvata_ok"));
    aggiornaElenco();
  } catch (e) { avvisaErrore(e); }
  finally { ST.invio = false; aggiornaLato(); }
}
async function commenta() {
  const el = $("#commento"), testo = el.value.trim();
  if (!testo) return;
  try {
    await chiama("commento", { id: ST.richiesta.id, testo });
    el.value = "";
    const j = await chiama("leggi", { id: ST.richiesta.id });
    ST.eventi = j.eventi; ST.richiesta.aggiornata = j.richiesta.aggiornata;
    aggiornaLato();
  } catch (e) { avvisaErrore(e); }
}

/* ---------------------------------------------------------------------------------------- eventi della pagina */
let _allegaA = null;
function lega() {
  document.addEventListener("click", (e) => {
    const el = e.target;
    const tm = el.closest('[data-int="tema"] button');
    if (tm) { const i = scegliInterruttore(tm.closest("[data-int]"), tm); if (i !== null) scegliTema(i === 1); return; }
    const fl = el.closest("#p-elenco [data-filtro]"); if (fl) { ST.filtro = fl.dataset.filtro || null; disegnaElenco(); return; }
    if (el.closest("#b-nuova") || el.closest("[data-nuova]")) { apriRichiesta(null); return; }
    const el_ = el.closest("[data-elimina]"); if (el_) { eliminaFiera(el_.dataset.elimina); return; }
    const carta = el.closest("[data-apri]"); if (carta) { apriRichiesta(carta.dataset.apri); return; }
    if (el.closest("#b-indietro")) { tornaElenco(); return; }
    if (el.closest("#b-entra")) { entraConLink(); return; }
    if (el.closest("#b-salva")) { salva(); return; }
    if (el.closest("#b-commento")) { commenta(); return; }
    if (el.closest("#b-scegli")) { _allegaA = null; $("#scelta-file").click(); return; }
    const allega = el.closest("[data-allega]"); if (allega) { _allegaA = allega.dataset.allega; $("#scelta-file").click(); return; }
    const ap = el.closest("[data-approva]"); if (ap) { rispondiVersione(ap.dataset.approva, +ap.dataset.ver, "approvata"); return; }
    const mo = el.closest("[data-modifiche]"); if (mo) { rispondiVersione(mo.dataset.modifiche, +mo.dataset.ver, "modifiche"); return; }
    if (el.closest("#b-materiale")) {
      const box = $("#materiali"); if ($("#mat-vuoto")) $("#mat-vuoto").remove();
      box.insertAdjacentHTML("beforeend", materialeHTML({ tipo: "stand", unita: "cm" }));
      aggiornaLato(); return;
    }
    const togli = el.closest("[data-togli]");
    if (togli) { const m = togli.closest(".eh-mat-gruppo"); if (m) m.remove(); aggiornaLato(); return; }
    const lg = el.closest("[data-lingua-g]");
    if (lg) { const si = !lg.classList.contains("scelta"); lg.className = `sigla ${si ? "l-acc scelta" : "spenta"}`; aggiornaLato(); return; }
    const td = el.closest(".tendina[data-m]");
    if (td) {
      const tipo = td.dataset.m === "tipo", voci = tipo ? TIPI : UNITA;
      apriTendina(td, { scelte: voci.map((v) => [v, tipo ? t("tipo_" + v) : v, v === td.dataset.v]) }, (v) => {
        td.dataset.v = v; $(".va", td).textContent = tipo ? t("tipo_" + v) : v;
        if (tipo) { const b = $(".eh-mat-testa b", td.closest(".eh-mat")); if (b) b.textContent = t("tipo_" + v); }
        aggiornaLato();
      });
      return;
    }
    if (el.closest("#b-lingua")) {
      const b = $("#b-lingua");
      apriTendina(b, { scelte: ORDINE_LINGUE.map((l) => [l, LINGUE[l]._nome, l === LINGUA]) }, (l) => cambiaLingua(l));
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "link-personale") entraConLink(); });
  document.addEventListener("input", (e) => {
    if (e.target.id === "link-personale") { const er = $("#errore-link"); if (er) er.hidden = true; } if (e.target.closest("#p-richiesta") && e.target.id !== "commento") aggiornaLatoPresto(); });
  $("#scelta-file").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []); e.target.value = "";
    if (files.length) aggiungiFile(files, _allegaA ? "materiale" : "allestitore", _allegaA || "");
  });
  // trascinare i file sulla zona dei documenti
  document.addEventListener("dragover", (e) => { const z = e.target.closest && e.target.closest("#rilascio"); if (z) { e.preventDefault(); z.classList.add("sopra"); } });
  document.addEventListener("dragleave", (e) => { const z = e.target.closest && e.target.closest("#rilascio"); if (z) z.classList.remove("sopra"); });
  document.addEventListener("drop", (e) => {
    const z = e.target.closest && e.target.closest("#rilascio");
    if (!z) return;
    e.preventDefault(); z.classList.remove("sopra");
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (files.length) aggiungiFile(files, "allestitore");
  });
  window.addEventListener("dragover", (e) => e.preventDefault());   // un file lasciato fuori dalla zona non apre il browser
  window.addEventListener("drop", (e) => e.preventDefault());
  window.addEventListener("beforeunload", (e) => { if (ST.pagina === "richiesta" && daSalvare()) { e.preventDefault(); e.returnValue = ""; } });
}
let _presto = null;
function aggiornaLatoPresto() { clearTimeout(_presto); _presto = setTimeout(aggiornaLato, 120); }

/* ---------------------------------------------------------------------------------------- accesso e avvio */
// Due casi diversi (utente 2026-11-26): senza chiave su questo dispositivo (pagina aperta dall'indirizzo nudo, es. dal
// pulsante della mail) NON è un link sbagliato: si spiega di aprire il link personale una volta. "Link non valido" solo
// quando il motore rifiuta la chiave (link vecchio o disattivato).
function disegnaAccesso() {
  const senza = !ST.chiave;
  const titolo = t(senza ? "accesso_titolo" : "err_accesso_titolo"), testo = t(senza ? "accesso_testo" : "err_accesso");
  // il campo per INCOLLARE il link personale (utente 2026-11-26): chi arriva dal pulsante della mail su un dispositivo
  // nuovo non ha dove metterlo; si accetta il link intero o la sola chiave
  setHTML($("#p-accesso"), `<div class="eh-contenuto"><section class="scheda eh-accesso">${testa({ icona: senza ? "utente" : "avviso", titolo })}
    <div class="corpo"><div class="avviso ${senza ? "l-acc" : "l-warn"}"><b>${esc(titolo)}</b><div class="testo">${esc(testo)}</div></div>
      <label class="eh-campo eh-incolla"><span class="et">${esc(t("accesso_campo"))}</span>
        <span class="campo"><input id="link-personale" type="text" placeholder="https://lasit-laser.github.io/expo-hub-commerciali/#k=…" spellcheck="false" autocomplete="off"></span></label>
      <div class="eh-errore-link" id="errore-link" hidden>${esc(t("accesso_non_valido"))}</div>
      <button class="pul principale" id="b-entra">${ic("avanti")}<span>${esc(t("accesso_entra"))}</span></button>
    </div></section></div>`);
}
// il link incollato: se contiene una chiave valida per il motore si entra, altrimenti si dice sotto il campo
async function entraConLink() {
  const v = ($("#link-personale").value || "").trim();
  const m = v.match(/k=([A-Za-z0-9]+)/) || v.match(/^([A-Za-z0-9]{16,})$/);
  const errore = $("#errore-link");
  if (!m) { errore.hidden = false; return; }
  const b = $("#b-entra"); b.disabled = true; b.classList.add("occupato");
  try {
    const prima = ST.chiave;
    ST.chiave = m[1];
    try { ST.io = await chiama("io", { completo: true }); }
    catch (e) { ST.chiave = prima; if (e.codice === "accesso") { errore.hidden = false; return; } throw e; }
    try { localStorage.setItem(CHIAVE_LS, m[1]); } catch (e) { /* resta per questa volta */ }
    ST.dettagli = ST.io.dettagli || {}; _firma = ST.io.firma || null; inizializzaVisti();
    if (LINGUE[ST.io.commerciale.lingua] && !localStorage.getItem(LINGUA_LS)) { LINGUA = ST.io.commerciale.lingua; document.documentElement.lang = LINGUA; }
    ST.pagina = "elenco";
    $("#p-accesso").classList.add("nascosta");
    $("#p-elenco").classList.remove("nascosta");
    disegnaBarra(); disegnaElenco(); pronto(); controllaNovita();
  } catch (e) { avvisaErrore(e); }
  finally { if (b.isConnected) { b.disabled = false; b.classList.remove("occupato"); } }
}
function mostraAccesso() {
  ST.pagina = "accesso";
  disegnaAccesso();
  $("#p-elenco").classList.add("nascosta");
  $("#p-accesso").classList.remove("nascosta");
}
async function avvio() {
  const m = location.hash.match(/k=([A-Za-z0-9]+)/);
  try {
    if (m) { localStorage.setItem(CHIAVE_LS, m[1]); history.replaceState(null, "", location.pathname + location.search); }
    ST.chiave = m ? m[1] : localStorage.getItem(CHIAVE_LS);
  } catch (e) { ST.chiave = m ? m[1] : null; }
  let salvata = null;
  try { salvata = localStorage.getItem(LINGUA_LS); } catch (e) { /* solo comodità */ }
  LINGUA = LINGUE[salvata] ? salvata : linguaDelBrowser();
  document.documentElement.lang = LINGUA;
  adatta();
  window.addEventListener("resize", adatta);
  legaTendine();
  legaSuggerimenti();
  lega();
  disegnaBarra();
  if (!ST.chiave) { mostraAccesso(); return pronto(); }
  try {
    ST.io = await chiama("io", { completo: true }); ST.dettagli = ST.io.dettagli || {}; _firma = ST.io.firma || null; inizializzaVisti();
    if (!salvata && LINGUE[ST.io.commerciale.lingua]) { LINGUA = ST.io.commerciale.lingua; document.documentElement.lang = LINGUA; }
    disegnaBarra();
    disegnaElenco();
    controllaNovita();               // la prima firma: da qui in poi si rilegge solo se cambia
  } catch (e) {
    if (e.codice === "accesso") mostraAccesso(); else { disegnaElenco(); avvisaErrore(e); }
  }
  pronto();
}
function pronto() {
  const pagina = $$(".eh-pagina").find((p) => !p.classList.contains("nascosta"));
  const schede = [$("#barra"), ...$$(".scheda", pagina).filter((s) => s.getBoundingClientRect().top < innerHeight)];
  apri(schede, $$(".scheda", pagina).filter((s) => !schede.includes(s)));
}
// Installata come app (finestra propria): all'apertura la finestra prende le proporzioni dell'interfaccia (1360 x 1000,
// come il kit) e si centra nello schermo, così i contenuti la riempiono senza grandi spazi ai lati (utente 2026-11-25).
// Solo all'apertura: se poi la si allarga a mano, resta come la si è lasciata. Nel browser normale non fa niente.
function misuraFinestra() {
  const app = matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: minimal-ui)").matches;
  if (!app || sessionStorage.getItem("eh-misura")) return;
  sessionStorage.setItem("eh-misura", "1");
  const sh = screen.availHeight, sw = screen.availWidth;
  const bordoW = Math.max(0, outerWidth - innerWidth), bordoH = Math.max(0, outerHeight - innerHeight);
  const h = Math.min(sh, Math.round(sh * 0.94));
  const w = Math.min(sw, Math.round((h - bordoH) * 1360 / 1000) + bordoW);
  try {
    resizeTo(w, h);
    moveTo((screen.availLeft || 0) + Math.round((sw - w) / 2), (screen.availTop || 0) + Math.round((sh - h) / 2));
  } catch (e) { /* il browser non lo permette: resta com'è */ }
}
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
misuraFinestra();
avvio();
