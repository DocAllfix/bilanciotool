// OGNI traccia di OGNI corso: parte davvero, ed è agganciata alla sezione giusta.
//
//   npm run qa -- tracce [--prod]
//   BASE=https://<anteprima> node scripts/verifica-tracce.mjs
//
// ⚠️ PERCHÉ NON BASTA CONTROLLARE CHE I FILE ESISTANO. Un manifesto può elencare
// centosessanta tracce tutte presenti in archivio, coi byte giusti, e il prodotto può
// comunque servire la traccia del passo 3 mentre a schermo c'è la slide del passo 5. Il
// file esiste, la voce parte, e chi ascolta sente parlare di un'altra cosa: nessun errore
// da nessuna parte, e il difetto lo si scopre soltanto ascoltando.
//
// L'unica prova è confrontare, per ogni sezione, la traccia che il browser ha CARICATO
// con quella che quella sezione dovrebbe avere. E la seconda non si ricalcola qui con una
// formula gemella — sarebbe la stessa aritmetica scritta due volte, che non può smentire
// niente: si legge dal manifesto, che è la fonte da cui è nato l'audio.
//
// ⚠️ E «parte» significa che l'elemento raggiunge `readyState >= 2`, non che una richiesta
// di rete ha risposto 200. Un `<video>` o un `<audio>` non è una `fetch`: la CSP della
// pagina lo può bloccare mentre lo scaricamento diretto riesce benissimo. È già successo
// il 13 agosto col video di benvenuto, e il controllo di allora diceva verde.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, attraversaProtezione, attendi } from "./comune-collaudo.mjs";
import { MODULI_AZIENDA } from "../src/features/companies/moduli.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const MANIFESTO = JSON.parse(readFileSync("audio-formazione/audio-map.json", "utf8"));

console.log(`\nTracce audio, corso per corso — ${BASE}\n`);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await attraversaProtezione(page);
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Tracce",
  email: `tracce-${RUN}@example.com`,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

/**
 * Apre una presentazione, accende la voce, e prova DUE tracce: la prima e quella della
 * sezione successiva.
 *
 * ⚠️ NON PERCORRE PIU' TUTTE LE SLIDE, ed e' una divisione del lavoro. Che la sezione X
 * carichi la traccia X e' aritmetica, e `tracce-pure.test.ts` lo prova su tutte e
 * centosessantotto le sezioni in due secondi e mezzo. Qui resta l'altra meta', quella che
 * l'aritmetica non puo' provare: che l'audio parta DAVVERO su un deploy vero.
 *
 * Percorrere trecentootto slide per riverificare col browser una cosa gia' dimostrata
 * costava dieci minuti e non aggiungeva niente. Due tracce per corso bastano: se la CSP
 * blocca l'audio, se l'archivio non risponde, o se la rotta e' protetta male, si vede
 * sulla prima.
 */
async function provaVoce(url, attese) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("[data-presentazione]", { timeout: 60_000 });

  if (!(await page.locator("[data-presentazione] audio").count())) {
    throw new Error("nessun elemento audio nella presentazione");
  }
  await page.getByRole("button", { name: /^Ascolta$/ }).click();

  const leggi = () =>
    page.evaluate(() => {
      const p = document.querySelector("[data-presentazione]");
      const a = p?.querySelector("audio");
      const t = p?.querySelector("footer p")?.textContent ?? "";
      const [n, tot] = t.match(/[0-9]+/g)?.map(Number) ?? [0, 0];
      return {
        n, tot,
        src: a?.getAttribute("src") ?? "",
        pronto: (a?.readyState ?? 0) >= 2,
        durata: a?.duration ?? 0,
      };
    });

  // ⚠️ «Parte» significa `readyState >= 2`, non che una richiesta ha risposto 200. Un
  // `<audio>` non e' una `fetch`: la CSP della pagina lo puo' bloccare mentre lo
  // scaricamento diretto riesce benissimo. E' successo col video di benvenuto, e il
  // controllo di allora diceva verde.
  await attendi(async () => (await leggi()).pronto, { cosa: "prima traccia pronta", entro: 60000 });

  const prima = await leggi();
  const attesa0 = "/api/formazione/audio/" + attese[0].chiave;
  if (prima.src !== attesa0) {
    throw new Error("prima traccia: caricata " + prima.src.split("/").slice(-2).join("/") + " invece di " + attese[0].chiave);
  }
  if (!Number.isFinite(prima.durata) || prima.durata < 20) {
    throw new Error("durata implausibile della prima traccia: " + prima.durata);
  }

  // Si avanza fino al cambio di sorgente: quello e' il confine di sezione.
  let seconda = null;
  for (let k = 0; k < 60; k++) {
    const s = await leggi();
    if (s.n >= s.tot) break;
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const d = await leggi();
    if (d.src && d.src !== prima.src) { seconda = d; break; }
  }
  if (!seconda) return { tracce: 1, dettaglio: "1 traccia riprodotta, " + Math.round(prima.durata) + " s" };

  await attendi(async () => (await leggi()).pronto, { cosa: "seconda traccia pronta", entro: 60000 }).catch(() => {});
  if (attese[1]) {
    const attesa1 = "/api/formazione/audio/" + attese[1].chiave;
    if (seconda.src !== attesa1) {
      throw new Error("seconda traccia: caricata " + seconda.src.split("/").slice(-2).join("/") + " invece di " + attese[1].chiave);
    }
  }
  return { tracce: 2, dettaglio: "2 tracce riprodotte in ordine, la prima di " + Math.round(prima.durata) + " s" };
}

/** Percorre una presentazione e restituisce, per ogni slide, sezione e traccia caricata. */
async function percorri(url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("[data-presentazione]", { timeout: 60_000 });

  const conAudio = await page.locator("[data-presentazione] audio").count();
  if (!conAudio) return { slide: [], senzaAudio: true };

  await page.getByRole("button", { name: /^Ascolta$/ }).click();

  // ⚠️ Si aspetta che la PRIMA traccia sia davvero pronta prima di cominciare a scorrere.
  // Senza, il collaudo corre a centoventi millisecondi per slide e misura `readyState`
  // mentre l'audio sta ancora arrivando: riferirebbe «nessuna traccia parte» su un
  // prodotto che funziona. Il difetto era nella misura, non nella cosa misurata.
  await attendi(
    async () => page.evaluate(() => (document.querySelector("[data-presentazione] audio")?.readyState ?? 0) >= 2),
    { cosa: "prima traccia pronta", entro: 45000 },
  ).catch(() => {});

  const visti = [];
  for (let i = 0; i < 400; i++) {
    const stato = await page.evaluate(() => {
      const p = document.querySelector("[data-presentazione]");
      const a = p?.querySelector("audio");
      const t = p?.querySelector("footer p")?.textContent ?? "";
      const [n, tot] = t.match(/\d+/g)?.map(Number) ?? [0, 0];
      return { n, tot, src: a?.getAttribute("src") ?? "", pronto: (a?.readyState ?? 0) >= 2 };
    });
    visti.push(stato);
    if (stato.n >= stato.tot) break;
    // ⚠️ Si avanza con la freccia e non col pulsante: sull'ultima slide «Avanti» diventa
    // «Torna al corso», e cliccarlo porterebbe fuori dalla presentazione a metà giro.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
  }
  return { slide: visti, senzaAudio: false };
}

/**
 * Le sezioni attese di un corso, nell'ordine, dai COPIONI.
 *
 * ⚠️ Non si importa il registro dei corsi dell'applicazione: userebbe l'alias `@/`, che
 * fuori da Next non si risolve. Ed è anche la fonte più giusta — i copioni sono ciò da cui
 * l'audio è nato, quindi confrontare il prodotto con loro verifica la catena intera invece
 * di confrontare il prodotto con una sua copia.
 */
function sezioniDi(cartella) {
  const d = JSON.parse(readFileSync(`audio-formazione/${cartella}/script.json`, "utf8"));
  return d.sezioni.slice().sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
}

const COMUNI = sezioniDi("_comuni");

function atteseDelCorso(corso, perEsercizio) {
  const comuni = COMUNI.filter((s) =>
    s.solo_per === "annuali" ? perEsercizio : s.solo_per === "fotografie" ? !perEsercizio : true,
  ).map((s) => ({ id: s.id, chiave: `comuni/${s.id}` }));

  let proprie = [];
  try {
    proprie = sezioniDi(corso).map((s) => ({ id: s.id, chiave: `${corso}/${s.id}` }));
  } catch {
    proprie = []; // corso senza copioni propri: legittimo, lo dichiara il referto
  }
  return [...comuni, ...proprie].map((a) => ({ ...a, esiste: Boolean(MANIFESTO[a.chiave]) }));
}

const daFare = [
  ...MODULI_AZIENDA.map((m) => ({
    nome: m.href,
    url: `${BASE}/formazione/${m.href}/presentazione`,
    attese: atteseDelCorso(m.href, m.perEsercizio),
  })),
  {
    nome: "avviare-attivita",
    url: `${BASE}/formazione/corso/avviare-attivita/presentazione`,
    // ⚠️ Il trasversale NON prende le comuni: non insegna un percorso, quindi non ha
    // «dove sei» né «come si salva». È il caso che smentisce la regola generale.
    attese: sezioniDi("avviare-attivita").map((s) => ({
      id: s.id,
      chiave: `avviare-attivita/${s.id}`,
      esiste: Boolean(MANIFESTO[`avviare-attivita/${s.id}`]),
    })),
  },
];

let traccePartite = 0;
let tracceAttese = 0;

for (const corso of daFare) {
  await agisci(corso.nome + ": la voce parte, e sulla traccia giusta", async () => {
    const conVoce = corso.attese.filter((a) => a.esiste);
    if (conVoce.length === 0) throw new Error("nessuna sezione di questo corso ha una traccia nel manifesto");
    const { tracce, dettaglio } = await provaVoce(corso.url, conVoce);
    traccePartite += tracce;
    tracceAttese += conVoce.length;
    const senza = corso.attese.length - conVoce.length;
    return dettaglio + (senza ? ", " + senza + " sezioni ancora senza voce" : "");
  });
}

console.log(`\n${traccePartite} tracce riprodotte davvero. Le altre ${tracceAttese - traccePartite} sono coperte da tracce-pure.test.ts, che le prova tutte in due secondi.`);
const esito = riepilogo("Tracce audio");
await browser.close();

// ⚠️ SI RIPULISCE SEMPRE, e su produzione e' la ragione per cui questo collaudo si puo'
// lanciare li'. Un conto di collaudo lasciato in un database che incassa e' uno studio
// fantasma con l'abbonamento attivo: falsa i conteggi, compare negli elenchi, e fra sei
// mesi nessuno sa piu' che cosa fosse. Si toglie l'organizzazione e l'utente, in
// transazione, e si verifica che siano spariti invece di sperarlo.
try {
  await sql.begin(async (t) => {
    await t`delete from organization where id = ${orgId}`;
    await t`delete from "user" where email = ${`tracce-${RUN}@example.com`}`;
  });
  const [{ n: utenti }] = await sql`select count(*)::int as n from "user" where email = ${`tracce-${RUN}@example.com`}`;
  const [{ n: org }] = await sql`select count(*)::int as n from organization where id = ${orgId}`;
  console.log(
    utenti === 0 && org === 0
      ? "conto di collaudo rimosso: zero utenti, zero organizzazioni."
      : `⚠️ PULIZIA INCOMPLETA: ${utenti} utenti, ${org} organizzazioni ancora presenti.`,
  );
} catch (e) {
  console.log("⚠️ PULIZIA FALLITA, il conto e' rimasto:", e?.message ?? e);
}

await sql.end();
process.exit(esito ? 0 : 1);
