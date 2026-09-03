// La modalità presentazione: slide, tastiera, e la voce sincronizzata.
//
//   npm run qa -- presentazione [--prod]
//
// ⚠️ IL CONTROLLO CHE CONTA È L'ULTIMO: che la slide avanzi PERCHÉ l'audio è avanzato, non
// perché è passato del tempo. Sono due cose che a occhio si somigliano e che si
// distinguono in un modo solo: si sposta il cursore dell'audio avanti a mano e si guarda
// se la slide segue. Un collaudo che si limita ad aspettare dichiara verde anche un lettore
// che avanza da solo a intervalli, cioè un lettore che va fuori sincrono al primo intoppo.
//
// ⚠️ E la voce NON deve partire da sola: i browser bloccano la riproduzione con l'audio
// finché non c'è un gesto della persona. Un lettore che ci provasse fallirebbe in silenzio
// e la presentazione sembrerebbe muta invece che in attesa.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato, attendi, attraversaProtezione } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();

console.log(`\nPresentazione — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

// ⚠️ Su un'anteprima protetta ogni pagina e' la schermata di accesso di Vercel, e il
// collaudo riferisce difetti che non esistono: qui si fermava sul campo del nome della
// registrazione, che era il campo di Vercel. Va chiamata PRIMA di qualunque navigazione.
await attraversaProtezione(page);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Presentazione",
  email: `presentazione-${RUN}@example.com`,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

const stato = () =>
  page.evaluate(() => {
    const t = document.querySelector("[data-presentazione] footer p")?.textContent ?? "";
    const [n, tot] = t.match(/\d+/g)?.map(Number) ?? [0, 0];
    const a = document.querySelector("[data-presentazione] audio");
    return {
      n,
      tot,
      titolo: document.querySelector("[data-presentazione] h1")?.textContent?.trim() ?? "",
      audio: a ? { src: a.getAttribute("src") ?? "", t: a.currentTime, pausa: a.paused, durata: a.duration } : null,
    };
  });

// ── La pagina del corso porta alla presentazione ────────────────────────────────────────
await agisci("il corso offre la presentazione", async () => {
  await page.goto(`${BASE}/formazione/energetico`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Segui la presentazione/i }).click();
  await page.waitForURL(/\/formazione\/energetico\/presentazione/);
  await page.waitForSelector("[data-presentazione]");
  const s = await stato();
  if (s.n !== 1) throw new Error(`si apre sulla slide ${s.n} invece che sulla prima`);
  if (s.tot < 20) throw new Error(`solo ${s.tot} slide: il corso energetico ne ha molte di più`);
  return `${s.tot} slide, si apre sulla prima`;
});

// ── La voce NON parte da sola ───────────────────────────────────────────────────────────
await agisci("la voce non parte da sola, e lo dichiara", async () => {
  const s = await stato();
  if (!s.audio) throw new Error("nessun elemento audio: le tracce non sono arrivate alla pagina");
  if (s.audio.src) throw new Error(`la traccia è già caricata (${s.audio.src}) prima di qualunque gesto`);
  if (!s.audio.pausa) throw new Error("l'audio sta già suonando: la politica del browser lo bloccherebbe in silenzio");
  await page.getByRole("button", { name: /^Ascolta$/ }).waitFor({ state: "visible" });
  return "audio in attesa, con il comando esplicito a schermo";
});

// ── Avanti e indietro, tastiera compresa ────────────────────────────────────────────────
await agisci("avanti porta alla slide dopo", async () => {
  await page.getByRole("button", { name: /Avanti/ }).click();
  await attendi(async () => (await stato()).n === 2, { cosa: "slide 2" });
  return "slide 2";
});

await agisci("indietro torna alla precedente", async () => {
  await page.getByRole("button", { name: /Indietro/ }).click();
  await attendi(async () => (await stato()).n === 1, { cosa: "slide 1" });
  return "slide 1";
});

await agisci("la freccia destra avanza", async () => {
  await page.keyboard.press("ArrowRight");
  await attendi(async () => (await stato()).n === 2, { cosa: "slide 2 da tastiera" });
  await page.keyboard.press("ArrowLeft");
  await attendi(async () => (await stato()).n === 1, { cosa: "ritorno" });
  return "freccia destra e sinistra";
});

// ── La traccia arriva davvero, e suona ──────────────────────────────────────────────────
await agisci("premendo Ascolta la traccia si carica e parte", async () => {
  await page.getByRole("button", { name: /^Ascolta$/ }).click();
  await attendi(
    async () => {
      const s = await stato();
      return Boolean(s.audio?.src) && !s.audio.pausa && s.audio.t > 0.2;
    },
    { cosa: "audio in riproduzione", entro: 30000 },
  );
  const s = await stato();
  if (!Number.isFinite(s.audio.durata) || s.audio.durata < 30) {
    throw new Error(`durata implausibile: ${s.audio.durata}`);
  }
  return `${s.audio.src.split("/").slice(-2).join("/")}, ${Math.round(s.audio.durata)} s`;
});

// ── Il controllo decisivo: la slide segue l'AUDIO, non l'orologio ────────────────────────
await agisci("spostando l'audio avanti, la slide lo segue", async () => {
  // La prima sezione comune ha una sola slide: si va sulla prima sezione che ne ha almeno
  // due, altrimenti non c'è niente da far avanzare.
  let tentativi = 0;
  while (tentativi++ < 40) {
    const s = await stato();
    const prossimo = await page.evaluate(() => {
      const a = document.querySelector("[data-presentazione] audio");
      return a ? { src: a.getAttribute("src"), durata: a.duration } : null;
    });
    if (prossimo?.src && Number.isFinite(prossimo.durata)) {
      // Si salta a tre quarti della traccia: se la slide è governata dall'audio deve
      // spostarsi subito, senza aspettare che il tempo passi davvero.
      const prima = s.n;
      await page.evaluate(() => {
        const a = document.querySelector("[data-presentazione] audio");
        a.currentTime = a.duration * 0.8;
      });
      try {
        await attendi(async () => (await stato()).n > prima, { cosa: "slide seguita", entro: 6000 });
        const dopo = await stato();
        return `dalla slide ${prima} alla ${dopo.n} spostando il cursore, senza attendere`;
      } catch {
        // Sezione con una sola slide: si passa alla successiva e si riprova.
      }
    }
    // ⚠️ Sull'ultima slide «Avanti» diventa «Torna al corso»: continuare a cliccarlo
    // produrrebbe un timeout su un elemento a caso, e il referto direbbe «clic fallito»
    // dove il fatto è «la slide non segue l'audio». Un collaudo che riferisce la cosa
    // sbagliata manda la diagnosi dalla parte opposta del sistema.
    const s2 = await stato();
    if (s2.n >= s2.tot) {
      throw new Error(
        `arrivato in fondo (${s2.tot} slide) senza che nessuna seguisse l'audio: ` +
          "spostando il cursore la schermata è rimasta ferma",
      );
    }
    await page.getByRole("button", { name: /Avanti/ }).click();
    await page.waitForTimeout(250);
  }
  throw new Error("nessuna sezione con più di una slide ha seguito l'audio");
});

// ── Al confine di sezione cambia la TRACCIA ─────────────────────────────────────────────
await agisci("passando di sezione cambia la traccia, non solo la slide", async () => {
  // ⚠️ Una sezione è una traccia. Se attraversando il confine la sorgente restasse quella,
  // la voce continuerebbe a raccontare la sezione precedente sopra le slide di quella dopo:
  // il difetto peggiore possibile qui, e a schermo si vedrebbe tutto normale.
  const partenza = await page.evaluate(
    () => document.querySelector("[data-presentazione] audio")?.getAttribute("src") ?? "",
  );
  const sezionePartenza = (await stato()).titolo;
  for (let k = 0; k < 30; k++) {
    const s2 = await stato();
    if (s2.n >= s2.tot) break;
    await page.getByRole("button", { name: /Avanti/ }).click();
    await page.waitForTimeout(200);
    if ((await stato()).titolo !== sezionePartenza) break;
  }
  if ((await stato()).titolo === sezionePartenza) throw new Error("non si è mai cambiata sezione");
  await attendi(
    async () => {
      const ora = await page.evaluate(
        () => document.querySelector("[data-presentazione] audio")?.getAttribute("src") ?? "",
      );
      return Boolean(ora) && ora !== partenza;
    },
    { cosa: "traccia nuova", entro: 15000 },
  );
  const ora = await page.evaluate(() => document.querySelector("[data-presentazione] audio").getAttribute("src"));
  return `da ${partenza.split("/").pop()} a ${ora.split("/").pop()}`;
});

// ── Uscire riporta al corso, sulla sezione in cui si era ────────────────────────────────
await agisci("uscendo si torna al corso, sul punto in cui si era", async () => {
  const titolo = (await stato()).titolo;
  await page.getByRole("button", { name: /^Esci$/ }).click();
  await page.waitForURL(/\/formazione\/energetico(#|$)/);
  await page.waitForSelector("[data-sezioni]");
  const ancora = new URL(page.url()).hash.replace("#", "");
  if (!ancora) throw new Error("si torna al corso senza l'ancora della sezione");
  // `CSS.escape` vive nel BROWSER, non in Node: la domanda va fatta dentro la pagina.
  const presente = await page.evaluate((id) => Boolean(document.getElementById(id)), ancora);
  if (!presente) throw new Error(`l'ancora ${ancora} non esiste nella pagina del corso`);
  return `torna su «${titolo}» (${ancora})`;
});

// ── La traccia non si serve a chi non ha fatto l'accesso ────────────────────────────────
await agisci("senza sessione la traccia non si scarica", async () => {
  const anonimo = await browser.newContext();
  const r = await anonimo.request.get(`${BASE}/api/formazione/audio/comuni/dove-sei`, { maxRedirects: 0 });
  await anonimo.close();
  if (r.status() !== 404) throw new Error(`un anonimo riceve ${r.status()} invece di 404`);
  return "404 all'anonimo";
});

await agisci("una traccia inventata non apre nessun percorso", async () => {
  // ⚠️ La difesa non è un'espressione regolare sui segmenti: è l'appartenenza al manifesto.
  // Un elenco di cose vietate si dimentica sempre di una.
  for (const finta of ["comuni/inesistente", "..%2F..%2Fonboarding%2Fbenvenuto-v1", "energetico/../../onboarding"]) {
    const r = await page.request.get(`${BASE}/api/formazione/audio/${finta}`, { maxRedirects: 0 });
    if (r.status() !== 404) throw new Error(`«${finta}» risponde ${r.status()} invece di 404`);
  }
  return "tre chiavi fuori manifesto, tutte 404";
});

const esito = riepilogo("Presentazione");
await browser.close();
await sql.end();
process.exit(esito ? 0 : 1);
