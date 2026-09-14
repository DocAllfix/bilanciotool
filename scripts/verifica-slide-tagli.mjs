// LE SLIDE DISTILLATE NON SI TAGLIANO: ogni tela, di ogni corso, a tre larghezze.
//
//   npm run qa -- slide-tagli [--prod]
//
// ⚠️ È il passo 1 del piano approvato dal committente, e viene PRIMA del lavoro sui
// contenuti per una ragione precisa: una slide tagliata non produce nessun errore. La tela
// ha `overflow: hidden` — deve averlo, una slide che scorre non è una slide — quindi un
// testo troppo lungo semplicemente sparisce sotto il piede, i comandi rispondono, la voce
// parla, e nessun collaudo funzionale se ne accorge.
//
// ⚠️ Che cosa misura, e che cosa no. Misura il CORPO della tela (`[data-corpo]`) contro lo
// spazio che ha: se `scrollHeight` supera `clientHeight`, qualcosa è sotto il piede. Misura
// anche la pagina intorno: con la tela scalata non deve mai comparire uno scorrimento
// orizzontale. Non misura se la slide è BELLA: quello si guarda.
//
// ⚠️ Tre larghezze perché la tela si SCALA e non si ridispone: le misure dentro devono
// essere identiche a 900, 1200 e 1600. Se a una larghezza cambiano, la tela ha smesso di
// scalare ed è tornata a riflettere — il difetto che `TelaScalata` esiste per impedire.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato, attraversaProtezione, vaiA } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const LARGHEZZE = [900, 1200, 1600];

console.log(`\nSlide distillate, tagli — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

// Quali corsi hanno slide distillate: si legge il manifesto, non si indovina. `comuni/`
// vale per tutti i corsi, quindi basta un corso qualunque per vederle.
const mappa = JSON.parse(readFileSync("audio-formazione/slide-map.json", "utf8"));
const corsi = new Set(Object.keys(mappa).map((k) => k.split("/")[0]));
const TRASVERSALI = new Set(["avviare-attivita"]);
// ⚠️ Le comuni hanno DUE varianti, `esercizio` e `revisione`, e ogni corso ne mostra una
// sola. Visitare un corso qualunque ne misurerebbe metà: `ghg` è per esercizio, `soa` no.
if (corsi.has("comuni")) {
  corsi.delete("comuni");
  corsi.add("ghg");
  corsi.add("soa");
}
// ⚠️ Un elenco di corsi sulla riga di comando limita il giro a QUELLI. Senza, si misura
// tutto il manifesto: è il controllo completo, ma con quindici corsi a tre larghezze dura
// più di dieci minuti, e un corso consegnato ogni pochi minuti non si collauda così.
//   node scripts/verifica-slide-tagli.mjs filiera mog231
const richiesti = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (richiesti.length) {
  const ignoti = richiesti.filter((c) => !corsi.has(c));
  if (ignoti.length) {
    console.error(`Nel manifesto non ci sono slide per: ${ignoti.join(", ")}`);
    process.exit(1);
  }
  for (const c of [...corsi]) if (!richiesti.includes(c)) corsi.delete(c);
}

const attese = Object.entries(mappa)
  .filter(([k]) => !k.startsWith("comuni/"))
  .reduce((n, [, v]) => n + v.length, 0);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await attraversaProtezione(page);
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

if (!corsi.size) {
  // ⚠️ Nessun file: il controllo non può dire verde misurando il nulla, e non deve dire
  // rosso su un difetto che non c'è. Si ferma e lo dice.
  console.log("Nessuna slide distillata nel manifesto: niente da misurare.\n");
  await browser.close();
  await sql.end();
  process.exit(0);
}

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Slide",
  email: `slide-tagli-${RUN}@example.com`,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

/** Le misure della slide a schermo: tela, corpo, pagina. */
const misura = () =>
  page.evaluate(() => {
    const tela = document.querySelector("[data-tela]");
    const corpo = tela?.querySelector("[data-corpo]");
    const n = document.querySelector("[data-presentazione] footer p")?.textContent?.match(/\d+/g)?.map(Number) ?? [0, 0];
    return {
      numero: n[0],
      totale: n[1],
      layout: tela?.getAttribute("data-layout") ?? null,
      tela: tela ? { l: tela.clientWidth, a: tela.clientHeight } : null,
      // ⚠️ RETTANGOLI, non `scrollHeight`. Il corpo è centrato in verticale: un contenuto che
      // sfora si allarga SOPRA e sotto, e `scrollHeight` conta solo la parte sotto — la
      // prima versione di questo controllo è rimasta verde con otto punti lunghissimi. Qui
      // si confrontano il bordo alto del primo figlio e quello basso dell'ultimo con i
      // bordi del corpo, nella stessa scala: la tela scalata non cambia il confronto.
      corpo: corpo && corpo.firstElementChild
        ? (() => {
            const c = corpo.getBoundingClientRect();
            const figli = [...corpo.querySelectorAll("*")].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
            const alto = Math.min(...figli.map((r) => r.top));
            const basso = Math.max(...figli.map((r) => r.bottom));
            const scala = tela.getBoundingClientRect().height / tela.clientHeight;
            return {
              contenuto: Math.round((basso - alto) / scala),
              spazio: Math.round(c.height / scala),
              fuori: Math.round(Math.max(c.top - alto, basso - c.bottom, 0) / scala),
            };
          })()
        : null,
      orizzontale: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

for (const corso of corsi) {
  const url = TRASVERSALI.has(corso) ? `${BASE}/formazione/corso/${corso}/presentazione` : `${BASE}/formazione/${corso}/presentazione`;
  const tagliate = [];
  const riflesse = [];
  let viste = 0;

  await agisci(`${corso}: ogni slide distillata sta dentro la sua tela, a ${LARGHEZZE.join(", ")} px`, async () => {
    const riferimento = new Map();
    for (const w of LARGHEZZE) {
      await page.setViewportSize({ width: w, height: Math.round(w * 0.62) });
      await vaiA(page, url);
      await page.waitForSelector("[data-presentazione]", { timeout: 60_000 });
      const { totale } = await misura();
      for (let k = 1; k <= totale; k++) {
        const m = await misura();
        if (m.layout) {
          if (w === LARGHEZZE[0]) viste++;
          if (m.orizzontale > 0) tagliate.push(`slide ${m.numero} a ${w}px: la pagina scorre in orizzontale di ${m.orizzontale}px`);
          if (m.corpo && m.corpo.fuori > 1) {
            tagliate.push(`slide ${m.numero} (${m.layout}) a ${w}px: ${m.corpo.fuori}px fuori dal corpo (${m.corpo.contenuto} su ${m.corpo.spazio})`);
          }
          // ⚠️ Le misure DENTRO la tela non devono cambiare con la finestra. Tolleranza come
          // SCARTO ASSOLUTO di tre pixel, non come arrotondamento a gradini: la versione
          // precedente divideva per tre e arrotondava, e una misura a cavallo di due gradini
          // (446 e 445 px, cioè 148,67 e 148,33) scattava su un pixel — segnalazioni, slide
          // 64, rossa nel controllo completo e verde nel suo lotto. Un riflusso vero sposta
          // decine di pixel: una riga in più è alta almeno venti.
          const tela = `${m.tela?.l}x${m.tela?.a}`;
          const altezza = m.corpo?.contenuto ?? 0;
          const prima = riferimento.get(m.numero);
          if (prima && (prima.tela !== tela || Math.abs(prima.altezza - altezza) > 3)) {
            riflesse.push(`slide ${m.numero}: ${prima.tela}:${prima.altezza} a ${LARGHEZZE[0]}px, ${tela}:${altezza} a ${w}px`);
          }
          if (!prima) riferimento.set(m.numero, { tela, altezza });
        }
        if (k < totale) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(120);
        }
      }
    }
    if (tagliate.length) throw new Error(`tagliate: ${tagliate.slice(0, 4).join(" · ")}${tagliate.length > 4 ? ` (+${tagliate.length - 4})` : ""}`);
    if (riflesse.length) throw new Error(`la tela non si scala, si ridispone: ${riflesse.slice(0, 3).join(" · ")}`);
  });

  await agisci(`${corso}: le slide distillate a schermo sono quelle del manifesto`, async () => {
    // Senza, un renderer che le ignorasse tutte passerebbe il controllo sui tagli: nessuna
    // tela, nessun taglio. È il controllo verde-per-assenza.
    const delCorso = Object.entries(mappa).filter(([k]) => k.startsWith(`${corso}/`)).reduce((n, [, v]) => n + v.length, 0);
    if (viste < delCorso) throw new Error(`a schermo ${viste} slide distillate, nel manifesto ${delCorso}`);
  });
}

console.log(`\n(${attese} voci distillate nel manifesto, esclusi i comuni)`);
const esito = riepilogo("Slide, tagli");
await sql`delete from org_entitlement where organization_id = ${orgId}`.catch(() => {});
await browser.close();
await sql.end();
// ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1.
process.exit(esito ? 1 : 0);
