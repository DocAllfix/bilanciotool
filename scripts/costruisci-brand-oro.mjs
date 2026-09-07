// Costruisce i CINQUE originali di marchio dall'unica opera nuova consegnata dal
// committente (il lockup verticale in oro, 1024×1024, con le sfumature metalliche).
//
// ⚠️ Perche' si costruiscono invece di ricolorare i vecchi. Il marchio nuovo differisce
// dal precedente per l'oro, e l'oro non e' una tinta piatta: sono sei sfumature
// `linearGradient` ancorate a coordinate assolute, ciascuna disegnata sulla forma che
// riveste. Ricolorare i vecchi vettori con un oro medio darebbe un monogramma piatto
// nella barra laterale e uno metallico nella pagina d'accesso — lo stesso marchio in due
// modi, che e' il difetto che questo file esiste per non fare.
//
// ⚠️ E perche' `userSpaceOnUse` permette di farlo. Le sfumature vivono nello spazio utente
// dell'elemento che le riferisce: avvolgendo i path in un `<g transform>` si spostano con
// loro. Con `objectBoundingBox` non sarebbe stato possibile comporre nulla.
//
// Gli originali finiscono in `public/brand/`; da li' `prepara-brand.mjs` ricava i derivati
// tecnici e `genera-favicon.mjs` le icone. Questo file non tocca nessuno dei due.
//
//   node scripts/costruisci-brand-oro.mjs
//
// Rilanciabile: riscrive i cinque file in modo deterministico dalla stessa sorgente.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ⚠️ La sorgente sta NEL REPOSITORY, non in una cartella del mio computer: un generatore
// che punta a `Downloads` funziona una volta sola e per una persona sola, e il giorno che
// serve rifare un derivato nessuno sa piu' da dove era uscito.
const SORGENTE = process.argv[2] ?? "public/brand/deck-oro-originale.svg";
const OUT = "public/brand";

if (!existsSync(SORGENTE)) {
  console.error(`sorgente non trovata: ${SORGENTE}`);
  process.exit(1);
}

const grezzo = readFileSync(SORGENTE, "utf8");

// ⚠️ 27 KB di manifesto C2PA su 47 di file: piu' della meta' del peso, e viaggia a ogni
// caricamento di pagina. Si toglie.
const sorgente = grezzo.replace(/<metadata>[\s\S]*?<\/metadata>/g, "");

const defs = [...sorgente.matchAll(/<defs>[\s\S]*?<\/defs>/g)].map((m) => m[0]).join("");
const paths = [...sorgente.matchAll(/<path fill="([^"]+)" d="([^"]+)"\s*\/>/g)].map((m) => ({
  fill: m[1],
  d: m[2],
  intero: m[0],
}));

/** Il rettangolo che contiene un path, letto dai suoi numeri. */
function box(d) {
  const n = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
  const xs = n.filter((_, k) => k % 2 === 0);
  const ys = n.filter((_, k) => k % 2 === 1);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function unione(elenco) {
  const b = elenco.map((p) => box(p.d));
  return {
    x0: Math.min(...b.map((x) => x.x0)),
    y0: Math.min(...b.map((x) => x.y0)),
    x1: Math.max(...b.map((x) => x.x1)),
    y1: Math.max(...b.map((x) => x.y1)),
  };
}

// ── Le tre parti dell'opera ──────────────────────────────────────────────────
//
// Si separano per POSIZIONE e non per colore: il filo e le lettere di DECK hanno la
// stessa tinta, ma il filo e' alto quattro pixel e sta sopra. Separarle per fill le
// terrebbe insieme, e non si potrebbe comporre l'orizzontale.
const FILO_Y = 640; // fra il monogramma (finisce a 622) e le lettere (cominciano a 643)

// ⚠️ NON basta la posizione: il filo e' alto quattro pixel e finisce a y 622, cioe'
// SOPRA la soglia — una prima versione di questo file lo faceva entrare nel monogramma, e
// sarebbe comparso come una stanghetta nella favicon e sulla barra laterale. Serve anche
// il colore: il monogramma e' tutto oro, il filo e la parola sono petrolio.
const PETROLIO = "#3B5A56";
const monogramma = paths.filter((p) => p.fill !== PETROLIO && box(p.d).y1 < 630);
const filo = paths.filter((p) => {
  const b = box(p.d);
  return b.y0 >= 600 && b.y1 < FILO_Y && b.x1 - b.x0 > 200 && b.y1 - b.y0 < 20;
});
const deck = paths.filter((p) => box(p.d).y0 >= FILO_Y);

if (monogramma.length < 30 || filo.length !== 1 || deck.length < 4) {
  console.error(
    `separazione fallita: monogramma ${monogramma.length}, filo ${filo.length}, deck ${deck.length}. ` +
      "Il disegno e' cambiato: rivedere le soglie invece di fidarsi.",
  );
  process.exit(1);
}

const bM = unione(monogramma);
const bD = unione(deck);
const bF = unione(filo);

console.log(`monogramma: ${monogramma.length} path, ${(bM.x1 - bM.x0).toFixed(0)}×${(bM.y1 - bM.y0).toFixed(0)}`);
console.log(`filo: ${(bF.x1 - bF.x0).toFixed(0)} largo · DECK: ${deck.length} path, ${(bD.x1 - bD.x0).toFixed(0)}×${(bD.y1 - bD.y0).toFixed(0)}`);

const intestazione = (w, h, vb) =>
  `<?xml version="1.0" encoding="utf-8" ?><svg xmlns="http://www.w3.org/2000/svg" ` +
  `xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${vb}">`;

/** Un gruppo traslato: le sfumature `userSpaceOnUse` seguono la trasformazione. */
const gruppo = (elenco, dx = 0, dy = 0, scala = 1) =>
  dx || dy || scala !== 1
    ? `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scala.toFixed(6)})">` +
      elenco.map((p) => p.intero).join("") +
      "</g>"
    : elenco.map((p) => p.intero).join("");

const scrivi = (nome, contenuto) => {
  writeFileSync(join(OUT, nome), contenuto + "</svg>\n");
  console.log(`  ${nome}`);
};

// ── 1 · Il lockup verticale: l'opera com'e', ripulita ────────────────────────
//
// Nessun fondo: il file consegnato ne era gia' privo, ed e' cio' che serve — sulla
// pagina d'accesso il fondo lo mette la pagina, e su un tema scuro un rettangolo avorio
// sarebbe una toppa.
const MARGINE = 24;
{
  const b = unione([...monogramma, ...filo, ...deck]);
  const w = b.x1 - b.x0 + MARGINE * 2;
  const h = b.y1 - b.y0 + MARGINE * 2;
  scrivi(
    "lockupprincipale.svg",
    intestazione(Math.round(w), Math.round(h), `${(b.x0 - MARGINE).toFixed(2)} ${(b.y0 - MARGINE).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`) +
      defs +
      gruppo([...monogramma, ...filo, ...deck]),
  );
}

// ── 2 · Il monogramma da solo ────────────────────────────────────────────────
{
  const w = bM.x1 - bM.x0 + MARGINE * 2;
  const h = bM.y1 - bM.y0 + MARGINE * 2;
  scrivi(
    "solomonogramma.svg",
    intestazione(Math.round(w), Math.round(h), `${(bM.x0 - MARGINE).toFixed(2)} ${(bM.y0 - MARGINE).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`) +
      defs +
      gruppo(monogramma),
  );
}

// ── 3 · Il monogramma su fondo scuro ─────────────────────────────────────────
//
// ⚠️ E' il file che sta sulla barra laterale dell'app, dove il fondo e' quasi nero. Prima
// era in verde MENTA, perche' il petrolio su quel fondo sparisce. L'oro no: sta a meta'
// luminanza e si stacca da entrambi i lati — e' la ragione per cui questo file ora e' lo
// stesso disegno dell'altro invece di una variante schiarita.
{
  const w = bM.x1 - bM.x0 + MARGINE * 2;
  const h = bM.y1 - bM.y0 + MARGINE * 2;
  const vb = `${(bM.x0 - MARGINE).toFixed(2)} ${(bM.y0 - MARGINE).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
  scrivi(
    "monogrammasufondoscuro.svg",
    // ⚠️ NESSUN rettangolo scuro, ed e' il punto. Il file precedente ne aveva uno perche'
    // il monogramma era in menta e serviva vederlo su quel fondo; `prepara-brand.mjs` poi
    // lo toglieva. Il rettangolo che scrivevo io non ha la forma che quella regex cerca,
    // quindi sarebbe SOPRAVVISSUTO al ritaglio e la barra laterale avrebbe avuto una
    // toppa scura su fondo scuro, disallineata al primo cambio di misura.
    //
    // L'oro non ha bisogno di una variante: sta a meta' luminanza e si stacca da entrambi
    // i lati. Questo file resta perche' il componente sceglie fra due sorgenti e non
    // volevo toccarlo; il disegno e' lo stesso dell'altro.
    intestazione(Math.round(w), Math.round(h), vb) + defs + gruppo(monogramma),
  );
}

// ── 4 · La piastrella della favicon ──────────────────────────────────────────
//
// Un quadrato petrolio col monogramma in oro sopra. ⚠️ Il monogramma NON si spinge fino
// ai bordi: a 16 pixel una forma che tocca il bordo diventa una macchia, e la piastrella
// serve proprio alle misure piccole. Il disegno occupa il 62% del lato, come faceva la
// versione precedente.
{
  const LATO = 1024;
  const quota = 0.62;
  const lm = Math.max(bM.x1 - bM.x0, bM.y1 - bM.y0);
  const s = (LATO * quota) / lm;
  const dx = (LATO - (bM.x1 - bM.x0) * s) / 2 - bM.x0 * s;
  const dy = (LATO - (bM.y1 - bM.y0) * s) / 2 - bM.y0 * s;
  scrivi(
    "tilefavicon.svg",
    intestazione(LATO, LATO, `0 0 ${LATO} ${LATO}`) +
      `<path fill="#3B5A56" d="M0 0h${LATO}v${LATO}h-${LATO}Z"/>` +
      defs +
      gruppo(monogramma, dx, dy, s),
  );
}

// ── 5 · Il lockup orizzontale ────────────────────────────────────────────────
//
// ⚠️ E' l'unico dei cinque che il committente non ha disegnato, e va detto invece di
// farlo passare per suo. Si compone dalle sue due parti — il monogramma e la parola —
// conservando le proporzioni della composizione verticale: la parola alta il 25% del
// monogramma, e il filo che nella verticale li separa in orizzontale diventa lo spazio.
//
// Un filo verticale fra i due sarebbe stato l'altra scelta possibile; si e' preferito lo
// spazio perche' alle misure dell'intestazione del sito (24 px di altezza) un filo di un
// pixel sparisce o sporca, e un separatore che a volte c'e' e a volte no e' peggio che
// non averlo.
{
  const hM = bM.y1 - bM.y0;
  const hD = bD.y1 - bD.y0;
  // La parola tiene la stessa altezza relativa che ha nella verticale.
  const s = (hM * (hD / hM)) / hD; // = 1: la scala della verticale si conserva
  const GAP = hM * 0.16;
  const wM = bM.x1 - bM.x0;
  const wD = (bD.x1 - bD.x0) * s;
  const w = wM + GAP + wD + MARGINE * 2;
  const h = hM + MARGINE * 2;
  // Il monogramma a sinistra, ancorato in alto; la parola centrata sull'asse verticale.
  const dxM = MARGINE - bM.x0;
  const dyM = MARGINE - bM.y0;
  const dxD = MARGINE + wM + GAP - bD.x0 * s;
  const dyD = MARGINE + (hM - hD * s) / 2 - bD.y0 * s;
  scrivi(
    "logosoloorizzontale.svg",
    intestazione(Math.round(w), Math.round(h), `0 0 ${w.toFixed(2)} ${h.toFixed(2)}`) +
      defs +
      gruppo(monogramma, dxM, dyM, 1) +
      gruppo(deck, dxD, dyD, s),
  );
}

// ⚠️ QUI C'ERANO DUE VARIANTI PER FONDO SCURO, e non servono piu'.
//
// Servivano finche' la parola era DISEGNATA dentro il vettore: in petrolio su fondo quasi
// nero non si leggeva, e l'unico modo era un secondo file con la parola chiara. Ora la
// parola e' testo (`src/components/brand/logo.tsx`) e prende `text-primary`, che il tema
// rovescia da solo. Due file in meno da tenere allineati.

console.log("\ncinque originali riscritti da un'unica sorgente.");
