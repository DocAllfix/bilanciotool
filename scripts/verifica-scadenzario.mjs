// Lo scadenzario, guardato da tre lati.
//
//   npm run qa -- scadenzario [--prod]
//
// ⚠️ Il controllo che conta è l'ultimo: che spuntare una voce d'AGENDA non muova di una
// virgola lo scadenzario. Sono due elenchi che stanno accanto e si somigliano, e fonderli
// sembrerebbe un servizio: uno però si chiude lavorandoci, l'altro spuntandolo, e un
// consulente che spuntasse «GHG 2025 da pubblicare» crederebbe di aver chiuso un lavoro
// che nessuno ha fatto.
//
// ⚠️ E le tre viste NON sono tre copie dello stesso elenco: per urgenza la domanda è «cosa
// faccio adesso», per cliente e per ambito sono «chi è più indietro» e «dove sono
// indietro». La risposta è una riga per gruppo, quindi contare le righe delle tre viste e
// pretenderle uguali sarebbe sbagliato: si conta il TOTALE che ciascuna dichiara.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, contatore, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `scadenzario-${RUN}@example.com`;

console.log(`\nScadenzario — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Scadenze",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

// ⚠️ Servono aziende VERE: la dimostrativa è fuori dal conteggio per decisione, e con la
// sola demo lo scadenzario sarebbe vuoto — il collaudo passerebbe misurando il nulla.
// ⚠️ E servono aziende con qualcosa di AVVIATO. Un'azienda appena creata non ha niente di
// indietro: lo scadenzario esclude i percorsi mai avviati, perché «non l'ho ancora aperto»
// non è un ritardo — un portafoglio nuovo mostrerebbe altrimenti dodici righe per azienda
// il primo giorno. Quindi si apre un inventario su ciascuna, e quello diventa «avviato,
// mai pubblicato», che è un ritardo vero.
const nomi = ["Alfa Meccanica S.r.l.", "Beta Alimentare S.p.A.", "Gamma Servizi S.r.l."];
const ANNO = new Date().getFullYear() - 1;
for (const nome of nomi) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", nome);
  await page.fill("#na-settore", "Manifattura");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 60_000 });
  const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];

  await page.goto(`${BASE}/aziende/${companyId}/ghg`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.waitForSelector("#ci-anno", { timeout: 30_000 });
  await page.fill("#ci-anno", String(ANNO));
  await page.click('button[type="submit"]:has-text("Crea")');
  await page.waitForURL(`**/ghg/${ANNO}**`, { timeout: 60_000 });
}

const vaiAllaDashboard = async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.waitForSelector("[data-scadenzario]", { timeout: 60_000 });
};

/** Quante voci dichiara la vista aperta: quelle mostrate più quelle dichiarate in coda. */
async function totaleDichiarato() {
  const mostrate = await page.locator("[data-scadenzario] > li").count();
  const coda = await page.locator("[data-scadenzario] ~ p").innerText().catch(() => "");
  const altre = Number(coda.match(/(\d+)\s*$/)?.[1] ?? 0);
  return mostrate + altre;
}

await vaiAllaDashboard();

await agisci("lo scadenzario elenca il lavoro delle aziende vere", async () => {
  const vista = await page.locator("[data-scadenzario]").getAttribute("data-scadenzario");
  if (vista !== "urgenza") throw new Error(`la vista di partenza è «${vista}», non «urgenza»`);
  if ((await totaleDichiarato()) < 3) throw new Error("con tre aziende nuove lo scadenzario è vuoto");
});

await agisci("⚠️ l'azienda dimostrativa NON entra nel conteggio", async () => {
  // La stessa azienda non può essere fuori da un conteggio e dentro un altro: i limiti del
  // piano la escludono già, e uno studio con otto clienti veri non deve leggere «26 da
  // riprendere» di cui dodici non suoi.
  const testo = await page.locator("[data-scadenzario]").innerText();
  const [demo] = await sql`select nome from company where organization_id = ${orgId} and is_demo limit 1`;
  if (demo && testo.includes(demo.nome)) {
    throw new Error(`la dimostrativa «${demo.nome}» compare fra il lavoro dello studio`);
  }
  // E se c'è, sta sotto e lo dichiara.
  if (!(await page.locator("[data-demo-scadenzario]").count())) {
    throw new Error("la dimostrativa non è dichiarata a parte: sparirebbe senza dirlo");
  }
});

let totUrgenza = 0;
await agisci("le tre viste esistono e si cambiano senza chiedere niente al server", async () => {
  totUrgenza = await totaleDichiarato();
  const richieste = [];
  const spia = (r) => richieste.push(r.url());
  page.on("request", spia);
  for (const etichetta of ["Per cliente", "Per ambito"]) {
    await page.getByRole("tab", { name: etichetta }).click();
    await page.waitForTimeout(300);
    const atteso = etichetta === "Per cliente" ? "cliente" : "ambito";
    const vista = await page.locator("[data-scadenzario]").getAttribute("data-scadenzario");
    if (vista !== atteso) throw new Error(`«${etichetta}» ha portato alla vista «${vista}»`);
  }
  page.off("request", spia);
  // ⚠️ Il raggruppamento è PRESENTAZIONE: avviene in memoria su una lista corta. Se
  // cambiando vista si ricaricasse la pagina, la dashboard — la più lenta del prodotto —
  // pagherebbe un viaggio al database per un gesto che non ne ha bisogno.
  //
  // ⚠️ Si guarda la DASHBOARD, non «qualunque richiesta»: cambiando vista compaiono altri
  // collegamenti, e Next li prefetcha. Quelle richieste sono per le pagine di destinazione
  // e non per il raggruppamento; contarle faceva fallire il controllo su un comportamento
  // del router, cioè accusava il prodotto della cosa sbagliata.
  const ricaricata = richieste.filter((u) => u.startsWith(`${BASE}/dashboard`));
  if (ricaricata.length) {
    throw new Error(`cambiare vista ha ricaricato la dashboard ${ricaricata.length} volte: ${ricaricata[0]}`);
  }
});

await agisci("⚠️ le tre viste raccontano lo STESSO lavoro, raggruppato diversamente", async () => {
  // Non si confrontano le righe — per cliente e per ambito c'è una riga per gruppo — ma i
  // gruppi non possono essere più delle voci, né zero se le voci ci sono.
  const conte = {};
  for (const [etichetta, chiave] of [["Per cliente", "cliente"], ["Per ambito", "ambito"]]) {
    await page.getByRole("tab", { name: etichetta }).click();
    await page.waitForTimeout(300);
    conte[chiave] = await totaleDichiarato();
  }
  if (!conte.cliente || !conte.ambito) throw new Error(`un raggruppamento è vuoto: ${JSON.stringify(conte)}`);
  if (conte.cliente > totUrgenza || conte.ambito > totUrgenza) {
    throw new Error(`più gruppi che voci: ${JSON.stringify(conte)} contro ${totUrgenza}`);
  }
  // Tre aziende vere: i clienti in ritardo non possono essere più di tre.
  if (conte.cliente > nomi.length) throw new Error(`${conte.cliente} clienti in ritardo su ${nomi.length} aziende`);
});

await agisci("⚠️ le tre viste hanno un nome accessibile e dichiarano quale è aperta", async () => {
  // Un interruttore che cambia ciò che si vede ma non dice quale è attivo lascia chi usa
  // un lettore di schermo senza sapere dove si trova. E due dichiarate attive insieme sono
  // peggio di nessuna: descrivono uno stato che non esiste.
  await vaiAllaDashboard();
  for (const n of ["Per urgenza", "Per cliente", "Per ambito"]) {
    const t = page.getByRole("tab", { name: n });
    if (!(await t.count())) throw new Error(`nessuna vista «${n}»`);
    await t.click();
    await page.waitForTimeout(250);
    if ((await t.getAttribute("aria-selected")) !== "true") throw new Error(`«${n}» non si dichiara selezionata`);
    const attive = await page.locator('[role="tab"][aria-selected="true"]').count();
    if (attive !== 1) throw new Error(`${attive} viste dichiarate attive insieme`);
  }
});

await agisci("ogni riga porta a un posto dove lavorare", async () => {
  await page.getByRole("tab", { name: "Per urgenza" }).click();
  await page.waitForTimeout(300);
  const primo = page.locator("[data-scadenzario] > li a").first();
  const href = await primo.getAttribute("href");
  if (!/^\/aziende\/[^/]+\//.test(href ?? "")) throw new Error(`la riga punta a «${href}»`);
  await primo.click();
  await page.waitForURL(/\/aziende\//, { timeout: 30_000 });
});

await agisci("⚠️ spuntare una voce d'AGENDA non tocca lo scadenzario", async () => {
  // I due elenchi stanno accanto e si somigliano. Uno si chiude lavorandoci, l'altro
  // spuntandolo: se spuntare muovesse il primo, un consulente crederebbe di aver chiuso un
  // lavoro che nessuno ha fatto.
  await vaiAllaDashboard();
  const prima = await totaleDichiarato();

  await page.goto(`${BASE}/agenda`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const titolo = `Telefonata al referente ${RUN}`;
  // Si aspetta IL COMANDO, non «main»: la pagina esiste prima del suo contenuto, e un clic
  // su un pulsante non ancora reso scade dicendo che il pulsante non c'è.
  await page.waitForSelector("[data-nuova-voce]", { timeout: 60_000 });
  await page.click("[data-nuova-voce]");
  await page.fill("#nv-titolo", titolo);
  await page.click('button[type="submit"]:has-text("Salva")');
  await page.waitForSelector(`text=${titolo}`, { timeout: 30_000 });

  await page.getByRole("button", { name: `Segna fatta: ${titolo}` }).click();
  await page.waitForTimeout(2000);

  await vaiAllaDashboard();
  const dopo = await totaleDichiarato();
  if (dopo !== prima) throw new Error(`lo scadenzario è passato da ${prima} a ${dopo} spuntando una voce d'agenda`);
});

await sql`delete from "user" where email = ${email}`.catch(() => {});
await sql.end().catch(() => {});
await browser.close().catch(() => {});

process.exit(riepilogo("Scadenzario") ? 1 : 0);
