// La formazione: che ci sia, che si raggiunga, e che l'invito arrivi SOLO quando deve.
//
//   npm run qa -- formazione [--prod]
//
// ⚠️ I due controlli che contano sono in fondo, e sono una coppia. L'invito al corso è il
// SEGUITO del tour, non un secondo avvio automatico: se partisse da solo, due cose si
// contenderebbero la stessa pagina e il velo di driver.js renderebbe incliccabile ciò che
// sta sotto. È successo il 13 agosto, col velo del tour aperto sopra il video di benvenuto.
//
// ⚠️ E deve arrivare solo a tour COMPLETATO. Chi interrompe un giro guidato dice «basta
// spiegazioni», non «basta prodotto»: proporgli venti minuti di corso in quel momento è la
// cosa più sbagliata che gli si possa fare. La differenza la sa già `avviaTour`, che legge
// `hasNextStep()` PRIMA di distruggere; qui si verifica che sia davvero cablata.
//
// ⚠️ Le due prove sul seguito del tour lo fanno partire DAL PULSANTE: quello che misurano
// è come finisce un tour, non chi lo lancia. L'avvio automatico ha una misura sua, isolata.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, contatore, pretendiServerAggiornato } from "./comune-collaudo.mjs";
import { MODULI_AZIENDA } from "../src/features/companies/moduli.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `formazione-${RUN}@example.com`;

console.log(`\nFormazione — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Formazione",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

// L'azienda dimostrativa ha tutti e dodici i percorsi: è il posto giusto dove far partire
// un tour senza dover prima costruire un esercizio a mano.
const [demo] = await sql`select id from company where organization_id = ${orgId} and is_demo order by created_at limit 1`;
const [inv] = await sql`select anno from ghg_inventory where company_id = ${demo.id} order by anno desc limit 1`;
const PAGINA_MODULO = `${BASE}/aziende/${demo.id}/ghg/${inv.anno}`;

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);

await agisci("la barra laterale porta alla formazione", async () => {
  const voce = page.locator('a[href="/formazione"]').first();
  if (!(await voce.count())) throw new Error("nessuna voce «Formazione» nella barra laterale");
  await voce.click();
  await page.waitForURL(/\/formazione$/, { timeout: 20_000 });
  await page.waitForSelector("[data-formazione]");
});

await agisci("l'indice elenca TUTTI i percorsi del registro", async () => {
  // ⚠️ L'attesa viene dal REGISTRO, non da un numero scritto qui. Il numero dei percorsi
  // è cambiato tre volte in un mese, e ogni volta un collaudo è diventato rosso per un
  // motivo che col prodotto non c'entrava.
  const resi = await page.locator("[data-corso]").count();
  if (resi !== MODULI_AZIENDA.length) {
    throw new Error(`corsi in pagina: ${resi} invece dei ${MODULI_AZIENDA.length} del registro`);
  }
});

await agisci("ogni corso si apre, porta il nome del percorso e ha le sue sezioni", async () => {
  for (const m of MODULI_AZIENDA) {
    await page.goto(`${BASE}/formazione/${m.href}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-sezioni]");
    const sezioni = await page.locator("[data-sezioni] section").count();
    if (sezioni < 5) throw new Error(`${m.href}: solo ${sezioni} sezioni`);
    const testo = await page.locator("main").innerText();
    if (!testo.includes(m.nome)) throw new Error(`${m.href}: il corso non porta il nome del percorso`);
  }
});

await agisci("⚠️ OGNI percorso ha sezioni PROPRIE, non solo quelle comuni", async () => {
  // ⚠️ Il fatto si misura sul PRODOTTO, non sul numero di sezioni: la parte comune è
  // identica per tutti, quindi un corso senza sezioni proprie si riconosce perché lo
  // dichiara. Finché anche uno solo lo dichiara, questo controllo lo nomina — ed è
  // esattamente ciò che deve fare, perché un corso che finge di esserci è peggio di uno
  // che manca.
  const muti = [];
  for (const m of MODULI_AZIENDA) {
    await page.goto(`${BASE}/formazione/${m.href}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-sezioni]");
    const testo = await page.locator("main").innerText();
    if (/in preparazione/i.test(testo)) muti.push(m.href);
  }
  if (muti.length) throw new Error(`percorsi senza parte propria: ${muti.join(", ")}`);
});

await agisci("il corso trasversale c'è, si apre, e dice di non essere un percorso", async () => {
  await page.goto(`${BASE}/formazione`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-trasversali]");
  const scheda = page.locator("[data-corso-trasversale]").first();
  if (!(await scheda.count())) throw new Error("nessun corso trasversale nell'indice");
  await scheda.click();
  await page.waitForURL(/\/formazione\/corso\//, { timeout: 20_000 });
  await page.waitForSelector("[data-sezioni]");
  const testo = await page.locator("main").innerText();
  if (!/non insegna a usare i singoli percorsi/i.test(testo)) {
    throw new Error("il corso trasversale non dichiara di essere un'altra cosa");
  }
  if ((await page.locator("[data-sezioni] section").count()) < 8) {
    throw new Error("il corso trasversale ha troppe poche sezioni");
  }
});

await agisci("un percorso inventato dice che non c'è, invece di mostrare una pagina vuota", async () => {
  const r = await page.goto(`${BASE}/formazione/non-esiste`, { waitUntil: "domcontentloaded" });
  // ⚠️ Si aspetta che ci sia QUALCOSA nell'area di lavoro prima di leggerla.
  // `domcontentloaded` si risolve quando la navigazione comincia, non quando il contenuto
  // è arrivato: letta subito, questa pagina sembra vuota anche quando non lo è, e il
  // referto accuserebbe il prodotto di un difetto che è del momento in cui si guarda.
  await page.waitForFunction(() => (document.querySelector("main")?.innerText ?? "").trim().length > 20, null, {
    timeout: 15_000,
  }).catch(() => {});
  const corpo = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  if (!/non c'è|non esiste|404/i.test(corpo)) {
    throw new Error(`l'area di lavoro non dice che la pagina non c'è — corpo: «${corpo.slice(0, 160)}»`);
  }
  // ⚠️ Il referto porta il CORPO, non solo il numero: un «200 invece di 404» non dice se
  // l'utente sta guardando una pagina di errore o il guscio vuoto di un corso, e sono due
  // difetti diversi con due rimedi diversi.
  // ⚠️ Lo stato HTTP di questa rotta è 200, non 404, ed è una proprietà dello streaming:
  // il guscio dell'applicazione parte prima che la pagina arrivi a `notFound()`, e a quel
  // punto l'intestazione è già uscita. Toglierlo vorrebbe dire rendere non-streaming
  // l'intero gruppo `(app)`, cioè buttare via la fluidità che questo progetto ha comprato
  // apposta, per un numero che nessuno legge: l'area è dietro autenticazione e
  // `force-dynamic`, quindi non la indicizza nessuno e non la mette in cache nessuno.
  // Ciò che protegge la persona è il CONTENUTO, ed è quello che si misura sopra.
  if (r && r.status() >= 400 && r.status() !== 404) {
    throw new Error(`ha risposto ${r.status()} — corpo: «${corpo.slice(0, 160)}»`);
  }
});

await agisci("la guida rimanda al corso di ogni percorso", async () => {
  await page.goto(`${BASE}/guida`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-percorsi]");
  const rimandi = await page.locator('[data-percorsi] a[href^="/formazione/"]').count();
  if (rimandi !== MODULI_AZIENDA.length) {
    throw new Error(`rimandi alla formazione: ${rimandi} invece di ${MODULI_AZIENDA.length}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Il cuore: l'invito, e il caso in cui NON deve arrivare.
//
// ⚠️ IL TOUR LO SI FA PARTIRE DAL PULSANTE, non aspettando l'avvio automatico. Non è un
// modo di aggirare una fragilità: è ciò che questi due controlli devono misurare. La cosa
// sotto esame è «come finisce un tour decide che cosa succede dopo», e non ha niente a che
// vedere con chi l'ha lanciato. L'avvio automatico ha una sua misura, più sotto, con il
// margine che merita.
//
// Fra una prova e l'altra si azzerano le due chiavi di `localStorage` — «questo tour l'ho
// già visto» e «l'invito per questo percorso l'ho già proposto». È PREPARAZIONE: ciò che
// cambia fra i due casi è come il tour finisce, non che cosa c'era scritto nel browser.
const azzeraInvito = () =>
  page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("evalisdeck-corso-proposto")) localStorage.removeItem(k);
    }
  });

const INVITO = 'a:has-text("Apri la formazione")';

/** Apre la pagina del percorso col tour automatico SPENTO, e preme il pulsante «Tour». */
async function apriIlTourDalPulsante() {
  await page.goto(PAGINA_MODULO, { waitUntil: "domcontentloaded" });
  // ⚠️ Prima la PAGINA, poi il tour: sono due guasti diversi con due rimedi diversi, e un
  // solo `waitForSelector` sul riquadro li confonde. «La pagina del percorso non si è
  // aperta» e «il tour non è partito» arrivavano al referto con lo stesso messaggio, e la
  // diagnosi partiva dalla parte sbagliata del sistema.
  await page.waitForSelector('[data-tour="ghg-passo-1"]', { timeout: 90_000 });
  await spegniTour(page);
  await azzeraInvito();
  await page.getByRole("button", { name: /Tour/ }).click();
  await page.waitForSelector(".driver-popover", { timeout: 20_000 });
}

await agisci("⚠️ il tour COMPLETATO propone il corso", async () => {
  await apriIlTourDalPulsante();

  // Quante tappe ci sono lo dice il tour stesso, dal proprio contatore: scriverlo qui
  // vorrebbe dire tenere allineato a mano il numero di passi di un tour che cambia.
  const progresso = await page.locator(".driver-popover-progress-text").innerText();
  const totale = Number(progresso.match(/di\s+(\d+)/)?.[1]);
  if (!Number.isFinite(totale) || totale < 2) throw new Error(`contatore del tour illeggibile: «${progresso}»`);

  // ⚠️ IL PULSANTE SI PREME DAL DOM, non con un clic a coordinate.
  //
  // driver.js riposiziona il riquadro a ogni passo e fa scorrere la pagina: un clic
  // partito un istante prima atterra sul VELO invece che sul pulsante, e il velo chiude
  // il tour. Il collaudo leggeva «si è chiuso dichiarandosi interrotto» su un tour che
  // aveva interrotto lui, e accusava il prodotto — a intermittenza, che è il modo
  // peggiore. Un clic dal DOM non ha una posizione, quindi non ha la corsa.
  //
  // Non si sta aggirando niente: che il pulsante sia raggiungibile col mouse è affare
  // della libreria, e che il velo chiuda il tour lo prova già la prova successiva.
  const passi = [];
  for (let i = 0; i < totale; i++) {
    const stato = await page.evaluate(() => {
      const p = document.querySelector(".driver-popover-progress-text")?.textContent ?? "?";
      const b = document.querySelector(".driver-popover-next-btn");
      return { p, etichetta: b?.textContent ?? null };
    });
    passi.push(`${stato.p}→${stato.etichetta ?? "(nessun pulsante)"}`);
    if (!stato.etichetta) break;
    await page.evaluate(() => document.querySelector(".driver-popover-next-btn")?.click());
    await page.waitForTimeout(250);
  }
  console.log("      passi:", passi.join(" | "));
  await page.waitForSelector(".driver-popover", { state: "detached", timeout: 10_000 }).catch(async () => {
    const dentro = await page.locator(".driver-popover").innerText().catch(() => "?");
    throw new Error(`dopo ${totale} passi il tour è ancora aperto — nel riquadro: «${dentro.replace(/\s+/g, " ").slice(0, 120)}»`);
  });

  // ⚠️ Il referto distingue i due guasti possibili, perché hanno rimedi opposti: se la
  // chiave è stata scritta, il richiamo di fine tour ha detto «completato» e a non
  // comparire è il riquadro; se non c'è, il tour si è chiuso dichiarandosi interrotto.
  await page.waitForSelector(INVITO, { timeout: 10_000 }).catch(async () => {
    const ls = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    console.log("      localStorage:", JSON.stringify(ls));
    const segnato = await page.evaluate(() => localStorage.getItem("evalisdeck-corso-proposto:ghg"));
    throw new Error(
      segnato
        ? "il tour si è dichiarato completato ma l'invito non è comparso a schermo"
        : "il tour si è chiuso dichiarandosi INTERROTTO, pur essendo arrivato in fondo",
    );
  });
});

await agisci("⚠️ il tour INTERROTTO non propone niente", async () => {
  await apriIlTourDalPulsante();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2000);

  if (await page.locator(INVITO).count()) {
    throw new Error("un tour interrotto ha proposto il corso: chi chiude dice «basta spiegazioni»");
  }
  // E il velo dev'essere sparito: un tour chiuso che lascia il velo rende incliccabile la
  // pagina, ed è il difetto del 13 agosto sotto un'altra forma.
  if (await page.locator(".driver-overlay").count()) throw new Error("il velo del tour è rimasto aperto");
  const segnato = await page.evaluate(() => localStorage.getItem("evalisdeck-corso-proposto:ghg"));
  if (segnato) throw new Error("l'invito è stato SEGNATO come già proposto senza essere mai comparso");
});

await agisci("⚠️ alla prima visita il tour parte DA SOLO, e da solo soltanto lui", async () => {
  // ⚠️ Questo è l'unico controllo che dipende dai tempi di caricamento, ed è giusto che
  // sia isolato: su questa macchina un viaggio al database costa venti volte quello che
  // costa in produzione, e la pagina di un percorso può metterci parecchi secondi. Se
  // fallisce QUI e non sopra, il guasto è nell'avvio automatico, non nel seguito del tour.
  await page.goto(PAGINA_MODULO, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="ghg-passo-1"]', { timeout: 90_000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("evalisdeck-tour") || k.startsWith("evalisdeck-corso-proposto")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".driver-popover", { timeout: 45_000 });

  // ⚠️ E UNO SOLO. Due cose che si aprono insieme sulla stessa pagina sono il difetto del
  // 13 agosto: il velo dell'una rende incliccabile ciò che sta sotto l'altra.
  const riquadri = await page.locator(".driver-popover").count();
  if (riquadri !== 1) throw new Error(`${riquadri} riquadri aperti insieme`);
  if (await page.locator(INVITO).count()) {
    throw new Error("l'invito al corso è comparso INSIEME al tour, invece che alla sua fine");
  }
  await page.keyboard.press("Escape");
});

await agisci("⚠️ il pulsante «Formazione» c'è su TUTTI i percorsi, tour o non tour", async () => {
  // ⚠️ Uno dei dodici non ha un giro guidato, e prima di questo controllo su quella pagina
  // non compariva niente: il pulsante veniva dal tour, quindi mancava insieme a lui. Il
  // corso però esiste lo stesso, e chi sta su quel percorso deve poterci arrivare.
  // ⚠️ Si ASPETTA il comando invece di guardare dopo un tempo fisso: quattro percorsi su
  // dodici hanno una radice che rimanda all'esercizio, e su questa macchina il rimando più
  // il render costano più di mezzo secondo. Un'attesa fissa li dichiarava tutti e quattro
  // privi del pulsante, cioè accusava il prodotto di un difetto che era del cronometro.
  const [az] = await sql`select id from company where organization_id = ${orgId} and is_demo limit 1`;
  const senza = [];
  for (const m of MODULI_AZIENDA) {
    await page.goto(`${BASE}/aziende/${az.id}/${m.href}`, { waitUntil: "domcontentloaded" });
    const trovato = await page
      .waitForSelector(`a[href="/formazione/${m.href}"]`, { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!trovato) senza.push(m.href);
  }
  if (senza.length) throw new Error(`percorsi senza il comando della formazione: ${senza.join(", ")}`);
});

await agisci("dal percorso si raggiunge la formazione anche a tour spento", async () => {
  await page.goto(PAGINA_MODULO, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  const link = page.locator('a[href="/formazione/ghg"]');
  if (!(await link.count())) throw new Error("nessun comando «Formazione» sulla pagina del percorso");
  await link.first().click();
  await page.waitForURL(/\/formazione\/ghg$/, { timeout: 20_000 });
});

// ⚠️ Si ripulisce SEMPRE: un collaudo che muore a metà lascia righe dietro di sé, e la
// guardia successiva le trova e accusa il prodotto.
await sql`delete from "user" where email = ${email}`.catch(() => {});
await sql.end().catch(() => {});
await browser.close().catch(() => {});

process.exit(riepilogo("Formazione") ? 1 : 0);
