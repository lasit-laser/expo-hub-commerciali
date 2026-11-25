// copia dal kit ARES Glass del 2026-10-25 (Expo Hub, pannello dei commerciali): NON modificare, si ricopia dal kit
// KIT ARES GLASS - funzioni comuni della pagina (dal cruscotto ARES in HTML/CSS approvato il 25/10/2026,
// riferimento/web/cruscotto.js e lasit_glass.js). Stessa logica, stessi tempi e stesse curve, raccolte come funzioni che
// non dipendono da ARES. Chi le usa: AG.configura({...}) all'avvio, poi le funzioni sotto.
// Nel cruscotto lo stesso oggetto si chiama LG (viene dal kit di Media Hub) e le funzioni stanno dentro `app`.
// NON cambiare tempi o curve qui senza cambiarli anche nel cruscotto, in SPECIFICA.md e in prove/verifica_statica.py.
"use strict";

// gli errori della pagina restano in memoria: le prove li leggono (`window.__errori`), nessuno li perde in silenzio
window.__errori = [];
window.addEventListener("error", (e) => window.__errori.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) => window.__errori.push(String((e.reason && e.reason.message) || e.reason)));

const AG = {
  BASE_W: 1360, BASE_H: 1000,        // misure dell'interfaccia a scala 1 (ARES: la finestra Tk, 1360 x 1000)
  W: 1360, H: 1000,                  // il palco VERO a scala 1 (allungato fino ai bordi della finestra: adatta)
  ANIMA: true,                       // dal programma (animazioni_attive), MAI da prefers-reduced-motion
  T_DISSOLVENZA: 180,
  E_OUT: "cubic-bezier(0.25, 0.1, 0.15, 1)",
  E_SOFT: "cubic-bezier(0.35, 0.05, 0.2, 1)",
  E_PEN: "cubic-bezier(0.45, 0, 0.2, 1)",
  zoom: 1,
  icone: {},                         // nome -> carattere di Segoe Fluent, dal programma
  icone_font: "Segoe Fluent Icons",

  // Differenza da Media Hub: NESSUN "blu unico". I colori stanno gia' in colori_ares_glass.css (generato dal tema);
  // `colori` serve solo a un programma che li vuole mandare da Python.
  configura({ base_w, base_h, animazioni, colori, icone, icone_font } = {}) {
    if (base_w) this.BASE_W = this.W = base_w;
    if (base_h) this.BASE_H = this.H = base_h;
    if (animazioni !== undefined) this.ANIMA = !!animazioni;
    document.body.classList.toggle("senza-animazioni", !this.ANIMA);
    for (const [k, v] of Object.entries(colori || {})) document.documentElement.style.setProperty(`--c-${k}`, v);
    if (icone) this.icone = icone;
    if (icone_font) {
      this.icone_font = icone_font;
      document.documentElement.style.setProperty("--ic", `"${icone_font}", "Segoe MDL2 Assets"`);
    }
  },
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const numeroIt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ------------------------------------------------------------------------------------------- contro i lampi
// Un pezzo di pagina si rifa' SOLO se e' cambiato (rifarlo uguale toglie e rimette gli elementi sotto il mouse).
const setHTML = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };

// `morph(el, html)`: se l'HTML e' uguale a quello di prima non succede niente; se e' cambiato, l'albero nuovo si
// confronta con quello che c'e' e si cambia SOLO cio' che e' diverso (testi, attributi, figli in piu' o in meno): gli
// elementi con uno stato (interruttori, levette, caselle, barre) restano e SCORRONO invece di ricomparire. Un elemento
// con `data-proprio` gestisce i suoi figli da se' (dissolvenze, grafico); `data-k` e' la chiave di un figlio.
function morph(el, html) {
  if (el._html === html) return;
  el._html = html;
  const t = document.createElement("template");
  t.innerHTML = html;
  morphFigli(el, t.content);
}
function morphFigli(vecchio, nuovo) {
  const a = Array.from(vecchio.childNodes), b = Array.from(nuovo.childNodes);
  b.forEach((n, i) => {
    const o = a[i];
    if (!o) vecchio.appendChild(n);
    else if (stessoNodo(o, n)) morphNodo(o, n);
    else vecchio.replaceChild(n, o);
  });
  for (let i = b.length; i < a.length; i++) a[i].remove();
}
function stessoNodo(o, n) {
  if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) return false;
  return o.nodeType !== 1 || (o.dataset.k || "") === (n.dataset.k || "");
}
function morphNodo(o, n) {
  if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  for (const at of Array.from(o.attributes)) {
    if (!n.hasAttribute(at.name) && !(at.name === "style" && o.tagName === "I")) o.removeAttribute(at.name);   // lo stile di un'icona e' di centraIcone
  }
  for (const at of Array.from(n.attributes)) if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
  if (o.hasAttribute("data-proprio") || o.tagName === "INPUT" || o.tagName === "CANVAS") return;
  morphFigli(o, n);
}

// i blocchi di una pagina (schede, righe di schede), per chiave {k, cls, html, tag}: si tengono quelli gia' fatti, si
// crea solo quello che manca, si toglie solo quello che non c'e' piu', e ognuno si aggiorna con `morph`
function aggiornaBlocchi(box, blocchi) {
  const vecchi = new Map(Array.from(box.children).map((e) => [e.dataset.k, e]));
  let prima = null;
  for (const b of blocchi) {
    let el = vecchi.get(b.k);
    if (!el || el.tagName.toLowerCase() !== (b.tag || "section")) {
      el = document.createElement(b.tag || "section");
      el.dataset.k = b.k;
    }
    vecchi.delete(b.k);
    if (el.className !== b.cls) el.className = b.cls;
    morph(el, b.html);
    const dopo = prima ? prima.nextSibling : box.firstChild;
    if (el !== dopo) box.insertBefore(el, dopo);
    prima = el;
  }
  for (const el of vecchi.values()) el.remove();
}

// Righe con una chiave (tecnica del kit di Media Hub): si tengono gli elementi gia' fatti, si crea solo quello che
// manca, si toglie solo quello che non c'e' piu'. Il cruscotto usa aggiornaBlocchi + morph, che fanno lo stesso.
function aggiornaFigli(box, voci, chiave, html, classe) {
  const vecchi = new Map(Array.from(box.children).map((e) => [e.dataset.chiave, e]));
  let prima = null;
  voci.forEach((v, i) => {
    const k = String(chiave(v, i));
    let el = vecchi.get(k);
    if (!el) {
      el = document.createElement("div");
      el.dataset.chiave = k;
      el.className = classe;
    }
    vecchi.delete(k);
    setHTML(el, html(v, i));
    const dopo = prima ? prima.nextSibling : box.firstChild;
    if (el !== dopo) box.insertBefore(el, dopo);
    prima = el;
  });
  for (const el of vecchi.values()) el.remove();
}

// Un'immagine cambia SOLO a foto nuova gia' decodificata (mai un riquadro vuoto o mezza foto per un attimo).
function impostaFoto(img, url) {
  if ((img.dataset.url || "") === (url || "")) return;
  img.dataset.url = url || "";
  if (!url) { img.hidden = true; img.removeAttribute("src"); return; }
  const n = new Image();
  n.src = url;
  n.decode().catch(() => {}).then(() => {
    if (img.dataset.url !== url) return;      // nel frattempo ne e' stata chiesta un'altra
    img.src = url;
    img.hidden = false;
  });
}

// Dati nuovi dal programma, a parti ({nome: valore}): rende i nomi delle parti DAVVERO cambiate (JSON diverso da
// quello di prima). Le parti identiche non toccano lo schermo. (cruscotto: app.applica)
function partiCambiate(memoria, parti) {
  const cambiate = new Set();
  for (const [nome, valore] of Object.entries(parti || {})) {
    const testo = JSON.stringify(valore);
    if (memoria[nome] === testo) continue;
    memoria[nome] = testo;
    cambiate.add(nome);
  }
  return cambiate;
}

// ------------------------------------------------------------------------------------------- dissolvenze e passaggi
// Il contenuto di prima sfuma nel nuovo: una copia del vecchio SOPRA, il nuovo gia' pieno SOTTO, poi la copia svanisce
// (180 ms, curva morbida). Tutto nello stesso fotogramma: nessun lampo. Il nuovo NON parte trasparente.
// HTML: <div class="dissolvibile" id="..."><div class="strato">...</div></div>
function dissolvi(box, disegna) {
  const strato = $(".strato:not(.uscente)", box);
  if (!AG.ANIMA || !strato || !strato.childElementCount) { disegna(); return; }
  $$(".uscente", box).forEach((e) => e.remove());
  const vecchio = strato.cloneNode(true);
  vecchio.removeAttribute("id");
  vecchio.classList.add("uscente");
  box.appendChild(vecchio);
  disegna();
  vecchio.animate([{ opacity: 1 }, { opacity: 0 }], { duration: AG.T_DISSOLVENZA, easing: AG.E_SOFT })
    .onfinish = () => vecchio.remove();
}

// Un elenco che scorre (una conversazione) sfuma nel nuovo e torna in cima: la copia sopra tiene la sua posizione e
// il punto in cui era scorsa (cruscotto: disegnaMessaggi).
function dissolviScorrevole(box, html) {
  if (box._html === html) return;
  if (!AG.ANIMA || !box.childElementCount) { box.innerHTML = html; box._html = html; return; }
  const f = box.parentElement, copia = box.cloneNode(true), su = box.scrollTop;
  Object.assign(copia.style, { position: "absolute", left: `${box.offsetLeft}px`, top: `${box.offsetTop}px`,
    width: `${box.offsetWidth}px`, height: `${box.offsetHeight}px`, margin: "0", zIndex: 5, pointerEvents: "none" });
  copia.classList.add("uscente");
  f.appendChild(copia);
  copia.scrollTop = su;
  box.innerHTML = html;
  box._html = html;
  box.scrollTop = 0;
  copia.animate([{ opacity: 1 }, { opacity: 0 }], { duration: AG.T_DISSOLVENZA, easing: AG.E_SOFT }).onfinish = () => copia.remove();
}

// Il passaggio del kit di Media Hub (il cambio di un dettaglio: testi di prima fuori in 70 ms, i nuovi dentro in 130).
// Il cruscotto ARES NON lo usa (aggiorna con morph); resta qui con i tempi di Media Hub per chi ne ha bisogno.
// L'uscita ha fill "forwards" ma si ANNULLA appena finisce (fuori.cancel): mai animazioni ferme sull'ultimo fotogramma.
function passaggio(box, disegna) {
  const s = $(".strato", box);
  if (!AG.ANIMA || !s || !s.childElementCount) { disegna(); return; }
  box._disegna = disegna;
  if (box._esce) return;
  const da = parseFloat(getComputedStyle(s).opacity) || 0;
  s.getAnimations().forEach((a) => a.cancel());
  const fuori = s.animate([{ opacity: da }, { opacity: 0 }], { duration: Math.max(1, 70 * da), easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
  box._esce = fuori;
  fuori.onfinish = () => {
    box._esce = null;
    box._disegna();
    fuori.cancel();
    s.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 130, easing: AG.E_OUT });
  };
}

// La voce scelta di un elenco (la barra laterale): un riquadro (.evidenza) che SCORRE con transform (240 ms, curva a
// penna) dalla voce di prima a quella nuova; se prima non c'era compare sul posto.
function evidenza(ev, voce, daVoce, anima, elenco, altezza) {
  if (!voce) { ev.style.opacity = "0"; return; }
  const y = voce.offsetTop;
  if (!anima || !AG.ANIMA || !daVoce || ev.style.opacity === "0") {
    ev.style.transition = "none";
    ev.style.transform = `translateY(${y}px)`;
    ev.offsetHeight;      // la posizione vale subito, senza animazione
    ev.style.transition = "";
    ev.style.opacity = "1";
  } else {
    ev.style.transform = `translateY(${y}px)`;
  }
  if (elenco && (y < elenco.scrollTop || y + altezza > elenco.scrollTop + elenco.clientHeight)) {
    elenco.scrollTo({ top: Math.max(0, y - 40), behavior: anima && AG.ANIMA ? "smooth" : "auto" });
  }
}

// Il cambio di sezione: la pagina di prima sfuma SOPRA la nuova, gia' piena sotto (180 ms; mai una pagina vuota),
// poi il riflesso passa una volta sulle schede della nuova. Le pagine: .pagina, nascosta con .nascosta.
function cambiaPagina(vecchia, nuova, ancoraQui = () => true) {
  nuova.scrollTop = 0;
  nuova.classList.remove("nascosta");
  if (AG.ANIMA) {
    vecchia.classList.add("uscente");
    const via = vecchia.animate([{ opacity: 1 }, { opacity: 0 }], { duration: AG.T_DISSOLVENZA, easing: AG.E_SOFT, fill: "forwards" });
    via.onfinish = () => {
      if (ancoraQui()) vecchia.classList.add("nascosta");
      vecchia.classList.remove("uscente");
      via.cancel();
    };
  } else vecchia.classList.add("nascosta");
  riflesso(nuova);
}

// il riflesso sulle schede di una pagina (dopo la dissolvenza, 1800 ms), poi la classe si toglie: nessuna animazione
// resta attaccata
let _riflessoVia = null;
function riflesso(pagina) {
  if (!AG.ANIMA) return;
  clearTimeout(_riflessoVia);
  $$(".pagina.riflesso").forEach((p) => p.classList.remove("riflesso"));
  pagina.offsetHeight;
  setTimeout(() => {
    if (pagina.classList.contains("nascosta")) return;
    pagina.classList.add("riflesso");
    _riflessoVia = setTimeout(() => pagina.classList.remove("riflesso"), 1850);
  }, AG.T_DISSOLVENZA);
}

// ------------------------------------------------------------------------------------------- scala
// Tutta l'interfaccia in proporzione alla finestra: misure a scala 1 dentro #palco, ingrandite con CSS zoom (il browser
// ridisegna testi e bordi alla misura vera: sempre nitido). Poi il palco si ALLUNGA a scala 1 fino ai bordi della
// finestra (come la finestra Tk, che riempie sempre la finestra) e le parti si ancorano ai suoi bordi; AG.W / AG.H sono
// le misure del palco vero (tengono dentro menu e suggerimenti). Anche il dialogo e il caricamento con `zoom`, MAI con
// `scale` o transform (diventerebbero immagini: testi in grigio).
function adatta() {
  AG.zoom = Math.max(0.3, Math.min(innerWidth / AG.BASE_W, innerHeight / AG.BASE_H));
  AG.W = Math.floor(innerWidth / AG.zoom);
  AG.H = Math.floor(innerHeight / AG.zoom);
  const p = $("#palco");
  p.style.zoom = AG.zoom;
  p.style.width = `${AG.W}px`;
  p.style.height = `${AG.H}px`;
  if ($("#dialogo")) $("#dialogo").style.zoom = AG.zoom;
  const c = $("#caricamento .car-dentro"), tela = $("#caricamento canvas");
  if (c) c.style.zoom = AG.zoom;
  if (tela) { tela.width = Math.round(300 * AG.zoom); tela.height = Math.round(200 * AG.zoom); }
}

// ------------------------------------------------------------------------------------------- apertura
// La pagina si disegna a finestra NASCOSTA (con la schermata di caricamento), poi il programma la mostra (api.pronta).
// ATTENZIONE: niente requestAnimationFrame prima di pronta(): a finestra nascosta il browser non disegna fotogrammi.
// Quando tutto e' letto e gia' disegnato (sotto, nascosto) `apri`: il caricamento sfuma (180 ms), le schede in vista
// salgono una dopo l'altra (80 + 80*i ms di ritardo, al massimo 8 passi; 700 ms ciascuna), quelle piu' in basso tutte a
// 720 ms; poi il riflesso passa una volta (1800 ms). `schede`: in ordine (barra laterale, barra in alto, schede in vista).
function apri(schede, altre = [], dopo = null) {
  schede.forEach((s, i) => (s.style.animationDelay = `${80 + 80 * Math.min(i, 7)}ms`));
  altre.forEach((s) => (s.style.animationDelay = "720ms"));
  if (AG.ANIMA) document.body.classList.add("apertura");
  document.body.classList.add("pronto");
  const car = $("#caricamento");
  if (car) {
    if (AG.ANIMA) {
      const via = car.animate([{ opacity: 1 }, { opacity: 0 }], { duration: AG.T_DISSOLVENZA, easing: AG.E_SOFT, fill: "forwards" });
      via.onfinish = () => { car.hidden = true; via.cancel(); };
    } else car.hidden = true;
  }
  const fine = AG.ANIMA ? 80 + 80 * 7 + 700 : 0;
  setTimeout(() => {
    document.body.classList.remove("apertura");
    $$(".scheda").forEach((s) => (s.style.animationDelay = ""));
    if (AG.ANIMA) {
      document.body.classList.add("riflesso");
      setTimeout(() => document.body.classList.remove("riflesso"), 1850);    // poco dopo la fine (1800 ms)
    }
    if (dopo) dopo();
  }, fine + 200);
}

// Il caricamento: il simbolo disegnato in una tela (in ARES la A con la busta che le gira intorno lasciando una scia:
// cruscotto_animazioni.orbita, giro di 2,4 s, ellisse 1 x 0,32 inclinata di -6 gradi) e la barretta che non sta mai
// ferma. Parte SOLO dopo pronta(). `stato()` -> {fatti, totale, caricato}; `fine()` quando e' tutto letto e la barra e'
// arrivata. Un fotogramma andato male non ferma il giro (e con tutto letto il caricamento si chiude lo stesso).
function caricamento({ periodo = 2.4, rapporto = 0.32, inclinazione = -6.0, stato, fine }) {
  const tela = $("#caricamento canvas"), cx2 = tela.getContext("2d"), barra = $("#caricamento .pieno");
  const t0 = performance.now();
  let progresso = 0, vivo = true;
  const lato = 132, ax = (300 - lato) / 2, ay = 18;
  const p = (x, y) => [ax + lato * (0.5 + (x - 400) / 420), ay + lato * (0.08 + (y - 40) / 420)];
  const orb = (t) => {
    const fase = 2 * Math.PI * ((t / periodo) % 1), x = -Math.cos(fase), y = rapporto * Math.sin(fase);
    const a = inclinazione * Math.PI / 180;
    return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), Math.sin(fase)];
  };
  const cx = 150, cy = ay + lato * 0.5 - lato * 0.62 * Math.sin(12 * Math.PI / 180), rx = lato * 0.62;
  const lettera = () => {
    const g = cx2.createLinearGradient(0, ay, 0, ay + lato);
    g.addColorStop(0, "rgb(110,222,255)");
    g.addColorStop(1, "rgb(0,112,200)");
    cx2.fillStyle = g;
    cx2.beginPath();
    for (const [i, pt] of [p(400, 40), p(238, 335), p(562, 335)].entries()) (i ? cx2.lineTo : cx2.moveTo).call(cx2, ...pt);
    cx2.closePath();
    for (const [i, pt] of [p(400, 152), p(326, 335), p(474, 335)].entries()) (i ? cx2.lineTo : cx2.moveTo).call(cx2, ...pt);
    cx2.closePath();
    cx2.fill("evenodd");
  };
  const busta = (x, y, ang, s, alfa) => {
    cx2.save();
    cx2.globalAlpha = alfa;
    cx2.translate(x, y);
    cx2.rotate(-ang * Math.PI / 180);
    cx2.scale(s, s);
    cx2.beginPath();
    cx2.roundRect(-15, -10, 30, 20, 3);
    cx2.fillStyle = "rgb(244,251,255)";
    cx2.fill();
    cx2.lineWidth = 1.6;
    cx2.strokeStyle = "rgb(14,45,92)";
    cx2.stroke();
    cx2.beginPath();
    cx2.moveTo(-13, -8); cx2.lineTo(0, 2.4); cx2.lineTo(13, -8);
    cx2.lineJoin = "round";
    cx2.lineWidth = 1.8;
    cx2.strokeStyle = "rgb(0,140,215)";
    cx2.stroke();
    cx2.restore();
  };
  const scia = (t, davanti) => {
    const n = 34;
    let prec = null;
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = orb(t - i * 0.022), pt = [cx + x * rx, cy + y * rx, z, 1 - i / n];
      if (prec && ((prec[2] + pt[2]) / 2 > 0) === davanti) {
        const f0 = prec[3];
        cx2.beginPath();
        cx2.moveTo(prec[0], prec[1]);
        cx2.lineTo(pt[0], pt[1]);
        cx2.lineCap = "round";
        cx2.lineWidth = Math.max(1, 1 + 5.5 * f0 * (0.75 + 0.25 * prec[2]));
        cx2.strokeStyle = `rgba(${Math.round(70 - 70 * (1 - f0))},${Math.round(196 - 86 * (1 - f0))},${Math.round(245 - 49 * (1 - f0))},${(210 * f0 ** 1.4 / 255).toFixed(3)})`;
        cx2.stroke();
      }
      prec = pt;
    }
  };
  const passo = (adesso) => {
    if (!vivo) return;
    const t = (adesso - t0) / 1000, st = stato();
    // la barra non sta mai ferma: avanza piano anche fra un passo e l'altro, senza arrivare al passo dopo
    const n = Math.max(1, st.totale), obiettivo = st.caricato ? 1.0
      : Math.min(0.98, st.fatti / n + (1 / n) * (1 - Math.exp(-(t % 8) / 3)) * 0.8);
    progresso = Math.max(progresso, progresso + (obiettivo - progresso) * 0.10);
    barra.style.transform = `scaleX(${progresso.toFixed(4)})`;
    cx2.setTransform(AG.zoom, 0, 0, AG.zoom, 0, 0);
    cx2.clearRect(0, 0, 300, 200);
    const [x, y, z] = orb(t), [xa, ya] = orb(t + 0.02);
    // l'inclinazione segue la PENDENZA della curva ed e' continua in tutto il giro: -14,3 * sin(2 * direzione)
    // (con -direzione / 2 dietro la A la busta scattava di 60 gradi); salto massimo fra due fotogrammi 3,8 gradi
    const dir = Math.atan2(ya - y, xa - x);
    const ang = -14.3 * Math.sin(2 * dir);
    const bx = cx + x * rx, by = cy + y * rx, s = 0.78 + 0.26 * (z + 1) / 2;
    const alfa = z < 0 ? 1 + 0.18 * z : 1;               // dietro e' velata, piano piano
    scia(t, false);
    if (z < 0) busta(bx, by, ang, s, alfa);
    lettera();
    scia(t, true);
    if (z >= 0) busta(bx, by, ang, s, alfa);
    if (st.caricato && progresso > 0.985) { vivo = false; fine(); return; }
    requestAnimationFrame(fotogramma);
  };
  const fotogramma = (adesso) => {
    try { passo(adesso); } catch (e) {
      window.__errori.push(`caricamento: ${e.message || e}`);
      if (stato().caricato) { vivo = false; fine(); return; }
      requestAnimationFrame(fotogramma);
    }
  };
  requestAnimationFrame(fotogramma);
}

// ------------------------------------------------------------------------------------------- icone
function ic(nome) { return `<i data-ic="${nome}">${AG.icone[nome] || ""}</i>`; }
function icone(radice = document) {
  for (const i of $$("i[data-ic]", radice)) if (!i.textContent) i.textContent = AG.icone[i.dataset.ic] || "";
}

// Ogni icona di Segoe Fluent si centra sui suoi PIXEL (come _icona_centrata della finestra Tk): alle grandezze vere
// Windows aggiusta il glifo sulla griglia dei pixel, e il disegno non sta al centro del riquadro del carattere (1-2 px
// in alto, diverso a ogni grandezza di finestra; spostamenti fissi o calcolati dalle misure del carattere non
// bastano). Il glifo si disegna in una tela nascosta alla sua grandezza in pixel, se ne trova l'inchiostro, e l'icona
// si sposta di quanto serve (in memoria per glifo e grandezza; da capo quando cambia lo zoom). Le icone messe a mano
// (position absolute: la freccetta delle tendine) restano dove sono. `osservaIcone` trova le icone nuove prima che il
// browser le disegni. Da chiamare: all'avvio, a ogni adatta(), dopo document.fonts.ready (svuotando la memoria).
const _centriIcone = new Map();
let _baseIcone = null, _telaIcone = null;
function centraIcone(radice = document.body) {
  const z = AG.zoom || 1;
  if (_baseIcone === null) {
    // dove il browser mette la linea di base in un'icona alta un em (una sola volta: e' del carattere)
    const prova = document.createElement("i");
    prova.dataset.ic = "prova";
    prova.style.cssText = "position:absolute;left:-9999px;top:0;display:block;font-size:100px;visibility:hidden;";
    prova.innerHTML = `<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>${Object.values(AG.icone)[0] || ""}`;
    document.body.appendChild(prova);
    _baseIcone = (prova.firstChild.getBoundingClientRect().top - prova.getBoundingClientRect().top) / 100;
    prova.remove();
  }
  const tutte = radice.matches && radice.matches("i[data-ic]") ? [radice] : radice.querySelectorAll("i[data-ic]");
  for (const el of tutte) {
    const glifo = el.textContent;
    if (!glifo) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "absolute" || cs.position === "fixed") continue;
    const fs = parseFloat(cs.fontSize) * z;                           // la grandezza vera in pixel dello schermo
    if (!fs) continue;
    const k = `${glifo}|${fs.toFixed(2)}`;
    let sp = _centriIcone.get(k);
    if (!sp) {
      sp = inchiostroIcona(glifo, fs);
      _centriIcone.set(k, sp);
    }
    const top = `${(sp[1] / z).toFixed(3)}px`, left = `${(sp[0] / z).toFixed(3)}px`;
    if (el.style.top !== top) { el.style.position = "relative"; el.style.top = top; }
    if (el.style.left !== left) el.style.left = left;
  }
}
// di quanto spostare (x, y, in pixel dello schermo) il glifo disegnato a `fs` pixel perche' il centro del suo
// inchiostro cada al centro del riquadro (alto un em, largo quanto l'avanzamento)
function inchiostroIcona(glifo, fs) {
  const lato = Math.ceil(fs * 3), x0 = Math.round(fs), y0 = Math.round(fs * 2);
  const tela = _telaIcone || (_telaIcone = document.createElement("canvas"));
  tela.width = lato; tela.height = lato;
  const c = tela.getContext("2d", { willReadFrequently: true });
  c.clearRect(0, 0, lato, lato);
  c.font = `${fs}px "${AG.icone_font}"`;
  c.textBaseline = "alphabetic";
  c.fillStyle = "#000";
  c.fillText(glifo, x0, y0);
  const w = c.measureText(glifo).width;
  const d = c.getImageData(0, 0, lato, lato).data;
  let a = lato, b = -1, l = lato, r = -1;
  for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
    if (d[(y * lato + x) * 4 + 3] > 24) { if (y < a) a = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
  }
  if (b < 0) return [0, 0];
  const cy = (a + b + 1) / 2 - y0, cx = (l + r + 1) / 2 - x0;     // il centro dell'inchiostro dalla base e dall'inizio
  return [w / 2 - cx, fs / 2 - (_baseIcone * fs + cy)];
}
function osservaIcone() {
  new MutationObserver((cambi) => {
    for (const m of cambi) {
      if (m.type === "childList") m.addedNodes.forEach((n) => { if (n.nodeType === 1) centraIcone(n); });
      else {
        const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (el && el.closest("i[data-ic]")) centraIcone(el.closest("i[data-ic]"));
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-ic"] });
}

// ------------------------------------------------------------------------------------------- pezzi di HTML
//: i colori dei segni grafici (anelli, barrette, linee, testate dei messaggi) per livello: gli stessi delle pillole
//: e della finestra Tk (COLORI del Tk: acc = accento); "piena" = l'anello arrivato al 100%
const COLORE = { ok: "#15703F", warn: "#9C5E00", ko: "#B42335", mu: "#5D6F87", acc: "#0077B6", piena: "#2BC36B" };
const sigla = (c, extra = "") => `<span class="sigla l-${c.l}"${extra}>${esc(c.t)}</span>`;
const freccia = (aperta) => `<i class="freccia" data-ic="${aperta ? "giu" : "avanti"}">${AG.icone[aperta ? "giu" : "avanti"] || ""}</i>`;

// l'intestazione di un pannello: tessera con l'icona (o il disegno `icona_html`), titolo, pillole, parte destra,
// freccetta se si apre e chiude (commuta = la chiave)
function testa({ icona = "", icona_html = "", livello = null, titolo, chip = [], destra = "", commuta = null, aperta = true }) {
  return `<header class="testa${commuta ? " cliccabile" : ""}"${commuta ? ` data-commuta="${esc(commuta)}"` : ""}>
    <span class="numero${livello ? ` l-${livello}` : ""}">${icona_html || ic(icona)}</span><h2>${esc(titolo)}</h2>
    ${chip.length ? `<div class="chip-testa">${chip.map((c) => sigla(c)).join("")}</div>` : ""}
    <div class="a-destra">${destra}${commuta ? freccia(aperta) : ""}</div></header>`;
}

function avvisoHTML(a) {
  return `<div class="avviso l-${a.livello}"><b>${esc(a.titolo)}</b>${a.traccia ? `<div class="traccia">${esc(a.traccia)}</div>` : ""}${a.testo ? `<div class="testo">${esc(a.testo)}</div>` : ""}</div>`;
}

// l'intestazione della pagina: occhiello, titolo, e la frase, i numeri nelle pillole o la spia
function intestazioneHTML({ occhiello, titolo, frase = "", tondi = [], spia = null }) {
  return `<div class="titoli"><div class="occhiello">${esc(occhiello)}</div><h1>${esc(titolo)}</h1>
      ${frase ? `<div class="frase">${esc(frase)}</div>` : ""}${spia ? `<div class="spia-pagina c-${spia.l}"><span class="pallino"></span>${esc(spia.t)}</div>` : ""}</div>
      ${tondi.length ? `<div class="tondi">${tondi.map(([n, p]) => `<div class="tondo-n"><b>${esc(n)}</b><span>${esc(p)}</span></div>`).join("")}</div>` : ""}`;
}

// un anello: la traccia, l'arco proporzionale (dall'alto, in senso orario), il testo al centro (HTML: nitido).
// Spessore 13% del lato (stato 44), 11% (quote 58), 10% (tassi 58, con un minimo dell'1,2% visibile)
function anello(lato, frazione, livello, testo, { spessore = 0.13, colore = null, corpo = 11.5, minimo = 0 } = {}) {
  const sp = Math.max(4, Math.round(lato * spessore)), r = (lato - sp) / 2 - 1, c = 2 * Math.PI * r, m = lato / 2;
  const f = frazione == null ? 0 : Math.max(minimo, Math.min(1, frazione));
  const arco = frazione ? `<circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${colore || COLORE[livello] || COLORE.acc}"
    stroke-width="${sp}" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${m} ${m})"/>` : "";
  return `<div class="anello" style="width:${lato}px;height:${lato}px"><svg width="${lato}" height="${lato}" viewBox="0 0 ${lato} ${lato}">
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="#E1E8F1" stroke-width="${sp}"/>${arco}</svg>
    <div class="centro${frazione == null ? " ignoto" : ""}" style="font-size:${corpo}px">${esc(testo)}</div></div>`;
}

// l'anello della striscia di stato: 66 con la traccia di 4 (il minimo), il testo che si adatta alla lunghezza, cosi'
// dentro ci stanno numeri a tre e quattro cifre (Antonio, 27/10/2026, dalla dashboard marketing; prima 44)
function anelloStato(frazione, livello, testo) {
  return anello(66, frazione, livello, testo, { spessore: 0.06, corpo: testo.length <= 5 ? 13 : testo.length <= 7 ? 11.5 : 10 });
}

// una tabella: colonne {nome, da, a, destra, cls} (frazioni della larghezza), righe di celle (testo o {chip})
function tabellaHTML(colonne, righe, { classiRiga = null, attrRiga = null, classeCella = null } = {}) {
  const tpl = colonne.map((c) => `minmax(0, ${Math.max(1, Math.round((c.a - c.da) * 100))}fr)`).join(" ");
  const cella = (v, c, i, j) => {
    if (v && typeof v === "object" && v.chip) return sigla(v.chip);
    const cl = [c.destra ? "d" : "", c.cls || "", classeCella ? classeCella(i, j) : ""].filter(Boolean).join(" ");
    return `<span${cl ? ` class="${cl}"` : ""}>${esc(v)}</span>`;
  };
  return `<div class="tabella" style="--colonne:${tpl}"><div class="t-testa">${colonne.map((c) =>
    `<span${c.destra ? ' class="d"' : ""}>${esc(c.nome)}</span>`).join("")}</div>${righe.map((r, i) =>
    `<div class="t-riga${classiRiga ? classiRiga(i) : ""}"${attrRiga ? attrRiga(i) : ""}>${r.map((v, j) => cella(v, colonne[j], i, j)).join("")}</div>`).join("")}</div>`;
}

const tendinaHTML = (id, et, valore, acceso, aperta, largh = null) =>
  `<button class="tendina${acceso ? " acceso" : ""}${aperta ? " aperta" : ""}" data-campo="${esc(id)}"${largh ? ` style="width:${largh}px"` : ""}>
    <span class="et">${esc(et)}</span><span class="va">${esc(valore)}</span>${ic("giu")}</button>`;

// il selettore a pillola: ogni voce larga quanto la scritta piu' lunga + 22 (la pillola scorre su voci uguali), piu' il
// rientro di 3 per parte e il bordo
const _misuraTesto = document.createElement("canvas").getContext("2d");
function larghezzaSelettore(voci) {
  _misuraTesto.font = '600 10.5px "Segoe UI"';
  return Math.ceil(Math.max(...voci.map((v) => _misuraTesto.measureText(v).width)) + 22) * voci.length + 8;
}
function interruttoreHTML(id, voci, scelta, { largo = null, tre = false } = {}) {
  const pos = tre ? ` pos${scelta}` : (scelta === 1 ? " destra" : "");
  largo = largo || larghezzaSelettore(voci);
  return `<div class="interruttore${tre ? " tre" : ""}${pos}" data-int="${esc(id)}"${largo ? ` style="width:${largo}px"` : ""}>
    <div class="pillola-scelta"></div>${voci.map((v, i) =>
    `<button data-i="${i}" class="${i === scelta ? "scelto" : ""}"><span>${esc(v)}</span></button>`).join("")}</div>`;
}
// la pillola SCORRE subito al clic (prima che il programma risponda); rende l'indice scelto, o null se era gia' scelto
function scegliInterruttore(el, b) {
  if (!b || b.classList.contains("scelto")) return null;
  const i = +b.dataset.i;
  $$("button", el).forEach((x) => x.classList.toggle("scelto", x === b));
  if (el.classList.contains("tre")) { el.classList.remove("pos0", "pos1", "pos2"); el.classList.add(`pos${i}`); }
  else el.classList.toggle("destra", i === 1);
  return i;
}

// il grafico a corsie (l'Andamento): una corsia per serie {nome, livello, curva [[x,y]...], punti, valori}, le date
// sotto (una ogni `ogni`, sempre l'ultima, mai due addosso: quella prima dell'ultima si salta a meno di 48 px)
function graficoHTML(a, w) {
  const lw = w - 64 - 30, n = a.etichette.length, passo = (lw - 14) / Math.max(1, n - 1);
  const corsie = a.corsie.map((c, si) => {
    const col = COLORE[c.livello], X = (x) => 7 + x * (lw - 14), Y = (y) => 6 + 42 * y;
    const d = c.curva.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
    const cima = Math.min(...c.curva.map(([, y]) => Y(y)));
    const area = n > 1 ? `<defs><linearGradient id="ga${si}" x1="0" y1="${cima.toFixed(1)}" x2="0" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${col}" stop-opacity="0.27"/><stop offset="1" stop-color="${col}" stop-opacity="0.02"/></linearGradient></defs>
      <path d="${d}L${X(1).toFixed(1)} 52L${X(0).toFixed(1)} 52Z" fill="url(#ga${si})"/>
      <path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` : "";
    const punti = c.punti.map(([x, y], i) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${i === n - 1 ? 3.6 : 2.6}" fill="${col}" stroke="#FFFFFF" stroke-width="1.2"/>`
      + `<circle class="punto" cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="9" fill="transparent" data-punto="${si}:${i}"/>`).join("");
    const ultimo = c.valori.length ? c.valori[c.valori.length - 1] : "";
    return `<div class="corsia"><span class="eti">${esc(c.nome)}</span><svg width="${lw}" height="56" viewBox="0 -2 ${lw} 56">
      <line x1="0" y1="51.5" x2="${lw}" y2="51.5" stroke="#4D78A945" stroke-width="1"/>${area}${punti}</svg>
      <span class="ultimo" style="color:${col}">${esc(numeroIt(ultimo))}</span></div>`;
  }).join("");
  const ogni = Math.max(1, Math.ceil(48 / Math.max(passo, 1)));
  const periodi = a.etichette.map((e, i) => ((i % ogni === 0 && (n - 1 - i) * passo >= 48) || i === n - 1
    ? `<span style="left:${(7 + i * passo).toFixed(1)}px">${esc(e)}</span>` : "")).join("");
  return `${corsie}<div class="periodi">${periodi}</div>${a.nota ? `<div class="quieto" style="font-size:12px;margin-top:10px">${esc(a.nota)}</div>` : ""}`;
}

// ------------------------------------------------------------------------------------------- suggerimenti
// (coordinate divise per lo zoom: suggerimento e menu stanno DENTRO #palco)
function mostraSuggerimento(el) {
  const s = $("#suggerimento"), p = $("#palco").getBoundingClientRect(), r = el.getBoundingClientRect();
  s.textContent = el.dataset.tip;
  s.style.left = "0px";
  s.style.top = "0px";
  const w = s.offsetWidth;
  let x = ((r.left + r.right) / 2 - p.left) / AG.zoom - w / 2;
  x = Math.max(8, Math.min(AG.W - w - 8, x));
  s.style.left = `${x}px`;
  s.style.top = `${(r.bottom - p.top) / AG.zoom + 8}px`;
  s.classList.add("su");
}
function nascondiSuggerimento() { $("#suggerimento").classList.remove("su"); }
// quelli della barra laterale stanno 10 px a destra della voce, centrati su di lei (_mostra_tip_rail)
function suggerimentoAccanto(el) {
  const s = $("#suggerimento"), p = $("#palco").getBoundingClientRect(), r = el.getBoundingClientRect();
  s.style.left = `${(r.right - p.left) / AG.zoom + 10}px`;
  s.style.top = `${(r.top + r.height / 2 - p.top) / AG.zoom - s.offsetHeight / 2}px`;
}
// la scheda lunga (una notifica, i numeri di un periodo) accanto al mouse, o sopra il punto
function suggerimentoLungo(html, x, y, sopra = false) {
  const s = $("#suggerimento"), p = $("#palco").getBoundingClientRect();
  s.classList.add("lungo");
  s.innerHTML = html;
  const w = s.offsetWidth, h = s.offsetHeight;
  let px = (x - p.left) / AG.zoom + 18, py = (y - p.top) / AG.zoom + 18;
  if (sopra) { px = (x - p.left) / AG.zoom - w / 2; py = (y - p.top) / AG.zoom - h - 14; }
  px = Math.max(8, Math.min(AG.W - w - 8, px));
  if (py + h > AG.H - 8) py = (y - p.top) / AG.zoom - h - 12;
  s.style.left = `${px}px`;
  s.style.top = `${Math.max(8, py)}px`;
  s.classList.add("su");
}
// Un gestore per tutti: [data-tip] dopo 250 ms (nella barra laterale accanto alla voce), le schede lunghe con i loro
// tempi (lunghi: [{sel, ritardo, html(el, evento) -> {html, sopra}}]: nel cruscotto notifiche 350 ms, punti 120 ms).
// Un clic nasconde subito; il suggerimento lungo torna breve 150 ms dopo essere sparito.
function legaSuggerimenti(lunghi = []) {
  let tip = null, timer = null;
  const sel = ["[data-tip]", ...lunghi.map((l) => l.sel)].join(", ");
  const nascondi = () => {
    clearTimeout(timer);
    tip = null;
    const s = $("#suggerimento");
    s.classList.remove("su");
    setTimeout(() => { if (!s.classList.contains("su")) s.classList.remove("lungo"); }, 150);
  };
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest(sel);
    if (el === tip) return;
    nascondi();
    tip = el;
    if (!el) return;
    if (el.dataset.tip) {
      timer = setTimeout(() => {
        $("#suggerimento").classList.remove("lungo");
        mostraSuggerimento(el);
        if (el.closest(".rail")) suggerimentoAccanto(el);
      }, 250);
      return;
    }
    const l = lunghi.find((x) => el.matches(x.sel));
    timer = setTimeout(() => { const r = l.html(el, e); if (r) suggerimentoLungo(r.html, e.clientX, e.clientY, !!r.sopra); }, l.ritardo);
  });
  document.addEventListener("pointerdown", () => { nascondiSuggerimento(); clearTimeout(timer); }, true);
  return nascondi;
}

// ------------------------------------------------------------------------------------------- menu e tendine
function menu(x, y, voci) {
  const m = $("#menu"), p = $("#palco").getBoundingClientRect();
  m.innerHTML = voci.map((v, i) => `<button data-i="${i}">${ic(v.icona)}<span>${esc(v.testo)}</span></button>`).join("");
  m.hidden = false;
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = `${Math.min(AG.W - w - 8, (x - p.left) / AG.zoom)}px`;
  m.style.top = `${Math.min(AG.H - h - 8, (y - p.top) / AG.zoom + 6)}px`;
  m.style.animation = "none"; m.offsetHeight; m.style.animation = "";
}

// La tendina di un campo: il menu sotto il campo, largo quanto il campo (almeno 220), sopra se sotto non ci sta.
// scelte = [[valore, testo ("nome · dettaglio" = due righe), scelta]]; multipla = caselle e resta aperta (ogni clic
// mette o toglie, la spunta cambia SUBITO); singola = spunta e si chiude. Un secondo clic sul campo la chiude.
const tendina = { el: null, id: null, dati: null, scegli: null };
function apriTendina(el, dati, scegli) {
  if (tendina.id && tendina.id === el.dataset.campo) { chiudiTendina(); return; }
  chiudiTendina();
  Object.assign(tendina, { el, id: el.dataset.campo, dati, scegli });
  el.classList.add("aperta");
  const m = $("#menu"), p = $("#palco").getBoundingClientRect(), r = el.getBoundingClientRect();
  m.classList.add("scelte");
  vociTendina();
  m.hidden = false;
  const w = Math.max(220, r.width / AG.zoom);
  m.style.width = `${w}px`;
  const h = m.offsetHeight;
  let x = (r.left - p.left) / AG.zoom, y = (r.bottom - p.top) / AG.zoom + 6;
  x = Math.max(8, Math.min(AG.W - w - 8, x));
  if (y + h > AG.H - 8) y = Math.max(8, (r.top - p.top) / AG.zoom - h - 6);
  m.style.left = `${x}px`;
  m.style.top = `${y}px`;
  m.style.animation = "none"; m.offsetHeight; m.style.animation = "";
}
function vociTendina() {
  const d = tendina.dati;
  morph($("#menu"), d.scelte.map(([v, et, si], i) => {
    const [nome, dett] = String(et).split(/\s+·\s+/, 2);
    const segno = d.multipla ? `<span class="m-casella${si ? " si" : ""}">${ic("ok")}</span>` : `<i data-ic="ok">${si ? AG.icone.ok || "" : ""}</i>`;
    return `<button data-i="${i}" class="${si ? "scelta" : ""}">${segno}${dett !== undefined
      ? `<span class="due"><span>${esc(nome)}</span><small>${esc(dett)}</small></span>` : `<span>${esc(et)}</span>`}</button>`;
  }).join("") || `<button disabled><span class="c-tenue">Nessuna scelta disponibile</span></button>`);
}
function chiudiTendina() {
  if (!tendina.id) return;
  if (tendina.el) tendina.el.classList.remove("aperta");
  Object.assign(tendina, { el: null, id: null, dati: null, scegli: null });
  const m = $("#menu");
  m.hidden = true;
  m.classList.remove("scelte");
  m.style.width = "";
  m._html = null;
}
function legaTendine() {
  $("#menu").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !tendina.id || b.disabled) return;
    const i = +b.dataset.i, d = tendina.dati, scegli = tendina.scegli;
    if (d.multipla) { d.scelte[i][2] = !d.scelte[i][2]; vociTendina(); } else chiudiTendina();
    scegli(d.scelte[i][0], i);
  });
  document.addEventListener("pointerdown", (e) => {
    if (tendina.id && !e.target.closest("#menu") && !e.target.closest(`[data-campo="${CSS.escape(tendina.id)}"]`)) chiudiTendina();
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tendina.id) chiudiTendina(); });
}

// ------------------------------------------------------------------------------------------- dialoghi
// Messaggi e domande nello stile della pagina (MAI le finestre di Windows), uno alla volta (coda). Tipi: info, errore,
// avviso, domanda, scelta (opzioni), un campo; e quelli di ARES: "campi" (piu' campi con l'etichetta) e "critico" (le
// azioni che spediscono email o spendono crediti: domanda, cosa succede, la riga rossa, "Torna indietro" e il pulsante
// ROSSO; Esc = no, Invio NON conferma). Le domande di Python arrivano da `chiedi(q)`: dialogo(q).then(r =>
// api.risposta(q.id, r)).
let _codaDialoghi = Promise.resolve();
function dialogo(opz) {
  const p = _codaDialoghi.then(() => (opz.tipo === "campi" || opz.tipo === "critico" ? _dialogoAres(opz) : _dialogo(opz)));
  _codaDialoghi = p.catch(() => {});
  return p;
}
function _mostraDialogo(d) {
  const velo = $("#velo");
  velo.hidden = false;
  velo.style.animation = "none"; velo.offsetHeight; velo.style.animation = "";
  d.style.animation = "none"; d.offsetHeight; d.style.animation = "";
  nascondiSuggerimento();
}
function _dialogo({ tipo = "info", titolo = "", testo = "", campo = null, si = null, nascosto = false, opzioni = null }) {
  return new Promise((fine) => {
    const iconeTipo = { info: ["info", "l-acc"], errore: ["errore", "l-ko"], domanda: ["domanda", "l-acc"],
      avviso: ["avviso", "l-warn"], scelta: ["domanda", "l-acc"] };
    const [i, cl] = iconeTipo[tipo] || iconeTipo.info;
    const conferma = tipo === "domanda" || tipo === "scelta";
    const d = $("#dialogo");
    d.classList.remove("critico");
    const scelte = opzioni ? `<div class="d-scelte">${opzioni.map(([t, ico], n) =>
      `<button class="pul" data-n="${n}">${ic(ico)}<span>${esc(t)}</span></button>`).join("")}</div>` : "";
    d.innerHTML = `<div class="d-testa"><span class="d-icona ${cl}">${ic(i)}</span><h3>${esc(titolo)}</h3></div>
      <p>${esc(testo)}</p>${scelte}
      ${campo !== null && campo !== undefined ? `<label class="campo campo-d"><input id="d-campo" type="${nascosto ? "password" : "text"}" value="${esc(campo)}" spellcheck="false" autocomplete="off"></label>` : ""}
      <div class="d-pulsanti">${conferma ? `<button class="pul" data-r="no">${ic("chiudi")}<span>Annulla</span></button>` : ""}
        ${opzioni ? "" : `<button class="pul principale" data-r="si">${ic("ok")}<span>${esc(si || (conferma ? "Sì" : "OK"))}</span></button>`}</div>`;
    _mostraDialogo(d);
    const inp = $("#d-campo");
    if (inp) { inp.focus(); inp.select(); } else ($('[data-r="si"]', d) || $("button", d)).focus();
    const chiudi = (r) => {
      $("#velo").hidden = true;
      document.removeEventListener("keydown", tasti, true);
      if (opzioni) fine(r === false ? null : r);
      else fine(r ? (inp ? inp.value : true) : (inp ? null : false));
    };
    const tasti = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); chiudi(false); }
      else if (e.key === "Enter" && !opzioni) { e.preventDefault(); e.stopPropagation(); chiudi(true); }
    };
    document.addEventListener("keydown", tasti, true);
    d.onclick = (e) => {
      const n = e.target.closest("[data-n]");
      if (n) { chiudi(+n.dataset.n); return; }
      const b = e.target.closest("[data-r]");
      if (b) chiudi(b.dataset.r === "si");
    };
  });
}
function _dialogoAres({ tipo, titolo = "", testo = "", campi = [], si = null, rossa = "", finestra = "" }) {
  return new Promise((fine) => {
    const d = $("#dialogo"), critico = tipo === "critico";
    d.classList.toggle("critico", critico);
    const testaD = critico
      ? `<div class="d-testa"><span class="d-icona l-ko">${ic("avviso")}</span><div><h3>${esc(titolo)}</h3>${finestra ? `<div class="d-finestra">${esc(finestra)}</div>` : ""}</div></div>`
      : `<div class="d-testa"><span class="d-icona l-acc">${ic("domanda")}</span><h3>${esc(titolo)}</h3></div>`;
    d.innerHTML = `${testaD}${testo ? `<p>${esc(testo)}</p>` : ""}
      ${critico ? `<div class="d-rossa">${esc(rossa)}</div>` : `<div class="d-campi">${campi.map(([et, v], i) =>
        `<label class="et" for="d-campo${i}">${esc(et)}</label><label class="campo campo-d"><input id="d-campo${i}" type="text" value="${esc(v)}" spellcheck="false" autocomplete="off"></label>`).join("")}</div>`}
      <div class="d-pulsanti"><button class="pul" data-r="no">${ic(critico ? "indietro" : "chiudi")}<span>${critico ? "Torna indietro" : "Annulla"}</span></button>
        <button class="pul ${critico ? "critico" : "principale"}" data-r="si">${ic(critico ? "invia" : "ok")}<span>${esc(si || "OK")}</span></button></div>`;
    _mostraDialogo(d);
    const inp = $$("input", d);
    if (inp.length) { inp[0].focus(); inp[0].select(); } else $('[data-r="no"]', d).focus();
    const chiudi = (r) => {
      $("#velo").hidden = true;
      document.removeEventListener("keydown", tasti, true);
      if (critico) fine(!!r);
      else fine(r ? inp.map((x) => x.value) : null);
    };
    const tasti = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); chiudi(false); }
      else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!critico) chiudi(true); }    // Invio NON conferma una spesa
    };
    document.addEventListener("keydown", tasti, true);
    d.onclick = (e) => {
      const b = e.target.closest("[data-r]");
      if (b) chiudi(b.dataset.r === "si");
    };
  });
}

// ------------------------------------------------------------------------------------------- fogli
// Una finestra secondaria DENTRO la pagina (la finestra di lettura del Tk): il velo sfuma (160 ms, curva morbida), il
// foglio sale di 10 px comparendo (160 ms, e_out); si chiude sfumando (120 ms). Posizione al centro del palco vero.
function apriFoglio(f, w, h) {
  f.style.left = `${(AG.W - w) / 2}px`;
  f.style.top = `${(AG.H - h) / 2}px`;
  f.hidden = false;
  nascondiSuggerimento();
  const v = $("#velo-fogli");
  v.hidden = false;
  if (AG.ANIMA) {
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: AG.E_SOFT });
    f.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: AG.E_OUT });
  }
}
function chiudiFoglio(f, ancoraChiuso = () => true) {
  if (!f || f.hidden) return;
  const v = $("#velo-fogli");
  if (AG.ANIMA) {
    f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: AG.E_SOFT }).onfinish = () => { if (ancoraChiuso()) f.hidden = true; };
    v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: AG.E_SOFT }).onfinish = () => { if (ancoraChiuso()) v.hidden = true; };
  } else { f.hidden = true; v.hidden = true; }
}

// ------------------------------------------------------------------------------------------- barra laterale
// Allargare o stringere la barra laterale come la finestra Tk (_corsa_rail, cruscotto_animazioni.ALLARGA: 420 ms, curva
// a penna): la barra cambia DAVVERO larghezza (la sola eccezione voluta a "si animano solo opacita' e transform": un
// pannello di vetro vuoto, senza scritte che si ridispongono) e dentro le voci restano ferme alla misura larga
// (.rail.corre), scoperte man mano; il simbolo scorre dalla posizione stretta a quella larga; il contenuto si dispone
// subito alla misura nuova, NASCOSTO, sotto una COPIA di quello di prima (con gli id e le misure di prima) che segue il
// bordo della barra; copia e nuovo si scambiano nel tratto 35-65% della corsa (147 + 126 ms, RAIL_FUSIONE). Stringendo,
// le scritte della barra spariscono nei primi 160 ms (il clic si vede subito) e il contenuto nuovo segue il bordo.
// Niente passa mai DIETRO la barra (e' di vetro). DENTRO la barra niente scatti (corsaInterna, sotto). `opz`: {rail,
// simbolo, contenuti: [el], stretta: 72, larga: 236, sposta: 164, scritte: [el], cambia(allarga) -> ridisegna alla
// misura nuova, fine()}. Dentro `rail`: le voci in `.rail-elenco`, il riquadro `.evidenza`, il pulsante `.b-rail`.
// La copia sta DOPO l'originale nel documento: `$("#id")` trova sempre l'originale.
function allargaBarra(allarga, { rail, simbolo, contenuti, stretta = 72, larga = 236, sposta = 164, scritte = [], cambia, fine }) {
  const x0 = simbolo.getBoundingClientRect().left;
  const prima = AG.ANIMA ? fotoBarra(rail) : null;          // dentro la barra, com'era (per la corsa interna)
  let copia = null;
  if (AG.ANIMA) {
    $$("#palco > .copia-struttura").forEach((e) => e.remove());
    copia = document.createElement("div");
    copia.className = `copia-struttura ${allarga ? "stretta" : "larga"}`;
    for (const el of contenuti) {
      const c = el.cloneNode(true);
      copia.append(c);
    }
    contenuti[contenuti.length - 1].parentElement.after(copia);
    contenuti.forEach((el, k) => {
      const c = copia.children[k];
      c.scrollTop = el.scrollTop;
      $$(".lista-reg, .scorre", el).forEach((l, j) => { const cl = $$(".lista-reg, .scorre", c)[j]; if (cl) cl.scrollTop = l.scrollTop; });
    });
  }
  // la misura nuova: allargando subito (la barra parte stretta e si allarga), stringendo il contenuto subito e la
  // barra alla fine (resta larga, e si stringe, fino all'ultimo fotogramma)
  document.body.classList.add("rail-larga");
  document.body.classList.toggle("contenuto-stretto", !allarga);
  rail.classList.add("corre");
  cambia(allarga);
  centraIcone(rail.querySelector(".b-rail"));         // la freccia nuova, gia' al suo posto per la foto
  const chiudi = () => {
    document.body.classList.toggle("rail-larga", allarga);
    document.body.classList.remove("contenuto-stretto");
    rail.classList.remove("corre");
    fine(allarga);
  };
  if (!AG.ANIMA) { if (copia) copia.remove(); chiudi(); return; }
  const annullaInterne = corsaInterna(rail, prima, fotoBarra(rail), fotoBarraFinale(rail, allarga), allarga);
  const x1 = simbolo.getBoundingClientRect().left;
  const xStretto = allarga ? x0 : rail.getBoundingClientRect().left + ((stretta - simbolo.offsetWidth) / 2) * AG.zoom;
  const xLargo = allarga ? x1 : x0;
  const d = (xStretto - xLargo) / AG.zoom;
  const tempo = { duration: 420, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" };
  const w = [`${stretta}px`, `${larga}px`];
  const corsa = rail.animate([{ width: allarga ? w[0] : w[1] }, { width: allarga ? w[1] : w[0] }], tempo);
  const scorre = simbolo.animate([{ transform: `translateX(${allarga ? d : 0}px)` }, { transform: `translateX(${allarga ? 0 : d}px)` }], tempo);
  const via = [];
  const segui = (el, da, a) => via.push(el.animate([{ transform: `translateX(${da}px)` }, { transform: `translateX(${a}px)` }],
    { duration: 420, easing: "cubic-bezier(0.45, 0, 0.2, 1)" }));
  for (const el of contenuti) {
    via.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 126, delay: 147, easing: AG.E_SOFT, fill: "backwards" }));
    if (!allarga) segui(el, sposta, 0);
  }
  if (!allarga) {
    for (const el of scritte) via.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: AG.E_SOFT, fill: "forwards" }));
  }
  if (copia) {
    for (const el of copia.children) segui(el, 0, allarga ? sposta : -sposta);
    copia.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 126, delay: 147, easing: AG.E_SOFT, fill: "forwards" })
      .onfinish = () => copia.remove();
  }
  corsa.onfinish = () => { chiudi(); annullaInterne(); corsa.cancel(); scorre.cancel(); via.forEach((a) => a.cancel()); };
}

// DENTRO la barra senza scatti (cruscotto ARES, 27/10/2026, app.fotoBarra / corsaInterna; Antonio: "che non ci siano
// scatti ma che sia sempre tutto morbido"). Con la sola corsa di sopra la disposizione dentro la barra cambiava in un
// colpo: allargando al primo fotogramma, stringendo all'ultimo. Qui ogni pezzo va da com'era (A) a come sara' (B) con la
// durata e la curva della barra, partendo da com'e' adesso (n: allargando gia' come B, stringendo ancora come A):
// - le voci scorrono in verticale (passo 56 stretta, 54 larga);
// - le icone cambiano misura (15 / 14 px, il mirino 19 / 17) animando la misura, non scalando, e il loro spostamento
//   sui pixel (centraIcone) va da quello di A a quello di B, piu' mezza differenza d'altezza della voce (48 / 46);
// - il riquadro bianco della voce aperta (con la barretta ciano) e Allarga/Riduci crescono e calano con la barra,
//   sempre 12 px dentro il bordo (riquadri senza testo: la stessa eccezione della larghezza della barra);
// - la freccia del pulsante fa mezzo giro invece di cambiare carattere di colpo;
// - allargando, i nomi delle voci e "Riduci" compaiono sfumando (stringendo spariscono gia' nei primi 160 ms).
// Le animazioni restano su B (fill forwards) finche' allargaBarra non mette le classi finali: si annullano li', nello
// stesso blocco. Misurato fotogramma per fotogramma nel cruscotto: passo massimo 0,4 px (prima fino a 8 px le voci e
// 164 px riquadro e pulsante, al primo o all'ultimo fotogramma).
function fotoBarra(rail) {
  const z = AG.zoom || 1, r0 = rail.getBoundingClientRect();
  const pos = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - r0.left) / z, y: (r.top - r0.top) / z, h: r.height / z }; };
  const voci = [], icone = [];
  [...rail.querySelector(".rail-elenco").children].forEach((el, i) => {
    const ic = el.querySelector(".ic-voce > *");
    voci[i] = pos(el);
    if (ic) {
      const s = getComputedStyle(ic);
      icone[i] = { m: parseFloat(ic.matches("svg") ? s.width : s.fontSize), t: parseFloat(ic.style.top) || 0, l: parseFloat(ic.style.left) || 0 };
    }
  });
  // riquadro e pulsante: la misura CSS (width/height), non quella a schermo
  const misura = (el) => { const s = getComputedStyle(el); return { w: parseFloat(s.width), h: parseFloat(s.height) }; };
  const ev = rail.querySelector(".evidenza"), scelta = rail.querySelector(".voce-rail.scelta"), b = rail.querySelector(".b-rail");
  const f = b.querySelector("i");
  return { voci, icone, ev: misura(ev), evY: scelta ? scelta.offsetTop : 0, barretta: parseFloat(getComputedStyle(ev, "::before").top),
    b: misura(b), freccia: f ? pos(f) : null };
}

// come sara' la barra A FINE corsa, presa durante la corsa: le classi finali e le icone centrate alla misura finale,
// poi tutto rimesso com'era, nello stesso blocco (nessun disegno in mezzo)
function fotoBarraFinale(rail, allarga) {
  const larga = document.body.classList.contains("rail-larga");
  document.body.classList.toggle("rail-larga", allarga);
  rail.classList.remove("corre");
  centraIcone(rail);
  const foto = fotoBarra(rail);
  document.body.classList.toggle("rail-larga", larga);
  rail.classList.add("corre");
  centraIcone(rail);
  return foto;
}

function corsaInterna(rail, A, n, B, allarga) {
  const via = [];
  function anima(el, k, pseudo = null) {
    via.push(el.animate(k, { duration: 420, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards", pseudoElement: pseudo }));
  }
  [...rail.querySelector(".rail-elenco").children].forEach((el, i) => {
    const a = A.voci[i], o = n.voci[i], b = B.voci[i];
    if (a && o && b && Math.abs(a.y - b.y) > 0.1) {
      anima(el, [{ transform: `translateY(${a.y - o.y}px)` }, { transform: `translateY(${b.y - o.y}px)` }]);
    }
    const ic = el.querySelector(".ic-voce > *"), ia = A.icone[i], ib = B.icone[i];
    if (ic && ia && ib && a && o && b) {
      const m = (v, h) => (ic.matches("svg") ? { width: `${v.m}px`, height: `${v.m}px`, transform: `translateY(${(h - o.h) / 2}px)` }
        : { fontSize: `${v.m}px`, top: `${v.t + (h - o.h) / 2}px`, left: `${v.l}px` });
      anima(ic, [m(ia, a.h), m(ib, b.h)]);
    }
  });
  const ev = rail.querySelector(".evidenza");
  if (ev.style.opacity !== "0") {
    anima(ev, [{ width: `${A.ev.w}px`, height: `${A.ev.h}px`, transform: `translateY(${A.evY}px)` },
      { width: `${B.ev.w}px`, height: `${B.ev.h}px`, transform: `translateY(${B.evY}px)` }]);
    anima(ev, [{ top: `${A.barretta}px` }, { top: `${B.barretta}px` }], "::before");
  }
  const b = rail.querySelector(".b-rail"), f = b.querySelector("i");
  anima(b, [{ width: `${A.b.w}px` }, { width: `${B.b.w}px` }]);
  if (f && A.freccia && n.freccia && B.freccia) {
    anima(f, [{ transform: `translateX(${A.freccia.x - n.freccia.x}px) rotate(180deg)` },
      { transform: `translateX(${B.freccia.x - n.freccia.x}px) rotate(0deg)` }]);
  }
  if (allarga) {
    for (const el of rail.querySelectorAll(".voce-rail .et, .b-rail span")) {
      via.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 140, easing: AG.E_SOFT, fill: "backwards" }));
    }
  }
  return () => via.forEach((a) => a.cancel());
}
