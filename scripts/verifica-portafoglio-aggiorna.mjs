// Il portafoglio si aggiorna DA SOLO dopo una mutazione, senza ricaricare la pagina.
//
// Esiste perché per due giorni non è stato vero, e nessun collaudo poteva accorgersene:
// `attendiCard` ricarica finché la card non c'è, quindi misura il percorso e non
// l'artefatto — cosa giusta per gli altri controlli, e cieca proprio qui.
//
// Le cause erano TRE, ciascuna sufficiente da sola, e sono state separate misurando:
//
//   ripristino (menu)      togliere `revalidatePath("/dashboard")` dall'azione   7,7 s
//   archiviazione (dialogo)  + rimandare `router.refresh()` al tick successivo   7,2 s
//   creazione (dialogo)      navigare al fascicolo: il refresh non basta mai     7,2 s
//
// Vedi i commenti in `src/features/companies/actions.ts` e nei due componenti, che
// spiegano anche perché ciascun rimedio è sicuro.
//
// ⚠️ Questo controllo NON RICARICA MAI la pagina dopo una mutazione. Se qualcuno
// aggiungesse un `page.reload()` per farlo tornare verde, avrebbe cancellato la sola
// cosa che verifica. L'unica navigazione ammessa è quella che il prodotto stesso fa
// dopo la creazione, ed è verificata come comportamento atteso.
//
//   npm run qa -- portafoglio-aggiorna [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
/** Generoso di proposito: il portafoglio è lento (vedi PRE-LAUNCH, debito 0-bis), e
 *  questo controllo deve distinguere «non si aggiorna» da «ci mette un po'». */
const ENTRO = 60_000;

let ok = 0, ko = 0;
const errori = [];
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const RUN = Date.now();
const email = `portagg-${RUN}@example.com`;
const NOME = `Aggiorna Subito ${String(RUN).slice(-6)} S.r.l.`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(m.text().slice(0, 140)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 140)));

console.log(`\nPortafoglio: si aggiorna senza ricaricare — ${BASE}\n`);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Aggiorna", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

/** Archiviazione e ripristino non navigano mai: quello che cambia sullo schermo deve
 *  cambiare per effetto della mutazione, non di un viaggio. */
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="nuova-azienda"]').waitFor({ timeout: 60_000 });

const card = () => page.locator('[data-slot="card"]').filter({ hasText: NOME });

await check("creare un'azienda porta al suo fascicolo", async () => {
  await page.click('[data-tour="nuova-azienda"]');
  await page.locator("#na-nome").waitFor({ timeout: 20_000 });
  await page.fill("#na-nome", NOME);
  await page.fill("#na-settore", "Collaudo");
  await page.click('button[type="submit"]:has-text("Crea azienda")');

  // La riga nel database prima di tutto: se non c'è, il difetto è un altro e va detto.
  await attendi(async () => {
    const [r] = await sql`select id from company where organization_id=${orgId} and nome=${NOME}`;
    return !!r;
  }, { entro: 30_000, cosa: "l'azienda scritta nel database" });

  // Si NAVIGA sul fascicolo dell'azienda creata. Vedi il commento in
  // `nuova-azienda-dialog.tsx`: su questa pagina l'aggiornamento non si applica, e la
  // navigazione è insieme il rimedio e la cosa giusta da fare.
  await attendi(async () => (await page.locator("h1").filter({ hasText: NOME }).count()) > 0, {
    entro: ENTRO,
    cosa: "il fascicolo dell'azienda appena creata",
  });
});

await check("il fascicolo mostra i percorsi dell'azienda nuova", async () => {
  const n = await page.locator("[data-percorsi] [data-modulo]").count();
  if (n < 5) throw new Error(`il fascicolo mostra ${n} percorsi`);
});

await check("tornando al portafoglio la card c'è", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await attendi(async () => (await card().locator("[data-modulo]").count()) > 0, {
    entro: ENTRO,
    cosa: "la card dell'azienda nuova nel portafoglio",
  });
});

await check("archiviare la fa sparire dalle attive senza ricaricare", async () => {
  await card().getByRole("button", { name: "Altre azioni" }).click();
  await page.getByRole("menuitem", { name: /Archivia/i }).click();
  await page.getByRole("button", { name: /^Archivia$/ }).click();

  await attendi(async () => {
    const [r] = await sql`select stato from company where organization_id=${orgId} and nome=${NOME}`;
    return r?.stato === "archived";
  }, { entro: 30_000, cosa: "l'azienda archiviata nel database" });

  // Archiviata, la card perde le caselle dei percorsi: è il segno che la pagina si è
  // rifatta. Cercare la sparizione del nome non servirebbe — il nome resta, in archivio.
  await attendi(async () => (await card().locator("[data-modulo]").count()) === 0, {
    entro: ENTRO,
    cosa: "la card passata in archivio SENZA ricaricare la pagina",
  });
});

await check("ripristinare la riporta fra le attive senza ricaricare", async () => {
  await card().getByRole("button", { name: "Altre azioni" }).click();
  await page.getByRole("menuitem", { name: /Ripristina/i }).click();

  await attendi(async () => {
    const [r] = await sql`select stato from company where organization_id=${orgId} and nome=${NOME}`;
    return r?.stato === "active";
  }, { entro: 30_000, cosa: "l'azienda ripristinata nel database" });

  await attendi(async () => (await card().locator("[data-modulo]").count()) > 0, {
    entro: ENTRO,
    cosa: "la card tornata fra le attive SENZA ricaricare la pagina",
  });
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
