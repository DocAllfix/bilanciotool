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
  await agisci(`${corso.nome}: ogni traccia parte, e sulla sezione giusta`, async () => {
    const { slide, senzaAudio } = await percorri(corso.url);
    if (senzaAudio) throw new Error("nessun elemento audio nella presentazione");

    // Le sorgenti distinte incontrate, nell'ordine di comparsa.
    const incontrate = [];
    for (const s of slide) {
      if (s.src && incontrate.at(-1) !== s.src) incontrate.push(s.src);
    }
    const attese = corso.attese.filter((a) => a.esiste).map((a) => `/api/formazione/audio/${a.chiave}`);
    tracceAttese += attese.length;

    const mancanti = attese.filter((a) => !incontrate.includes(a));
    if (mancanti.length) {
      throw new Error(`${mancanti.length} tracce non caricate: ${mancanti.map((x) => x.split("/").slice(-2).join("/")).join(", ")}`);
    }
    // ⚠️ E l'ORDINE: una traccia caricata al momento sbagliato è indistinguibile a schermo.
    const ordineIncontrato = incontrate.filter((x) => attese.includes(x));
    for (let i = 0; i < attese.length; i++) {
      if (ordineIncontrato[i] !== attese[i]) {
        throw new Error(
          `ordine sbagliato alla posizione ${i + 1}: caricata ${ordineIncontrato[i]?.split("/").slice(-2).join("/")} ` +
            `invece di ${attese[i].split("/").slice(-2).join("/")}`,
        );
      }
    }
    const pronte = slide.filter((s) => s.pronto).length;
    if (pronte === 0) throw new Error("nessuna slide ha raggiunto un audio pronto alla riproduzione");
    traccePartite += attese.length;

    const senzaVoce = corso.attese.filter((a) => !a.esiste).map((a) => a.id);
    return `${attese.length} tracce nell'ordine giusto${senzaVoce.length ? `, ${senzaVoce.length} sezioni ancora senza voce` : ""}`;
  });
}

console.log(`\n${traccePartite} tracce verificate su ${tracceAttese} attese.`);
const esito = riepilogo("Tracce audio");
await browser.close();
await sql.end();
process.exit(esito ? 0 : 1);
