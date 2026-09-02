// L'agenda dello studio, comando per comando — e la prova che resta distinta dallo
// scadenzario.
//
// ⚠️ I due elenchi si somigliano abbastanza da confondersi: uno lo calcola il prodotto e
// si chiude lavorandoci, l'altro lo scrive lo studio e si spunta. Un consulente che
// spuntasse «GHG 2025 da pubblicare» crederebbe di aver chiuso un lavoro che nessuno ha
// fatto, e il controllo che conta di più in questo file è quello che li tiene separati.
//
//   npm run qa -- agenda [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, attendi, pretendiServerAggiornato, attraversaProtezione } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");

let ok = 0;
let ko = 0;
const check = async (nome, fn) => {
  try {
    await fn();
    ok++;
    console.log("  ok   " + nome);
  } catch (e) {
    ko++;
    console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]);
  }
};

const RUN = Date.now();
const email = `agenda-${RUN}@example.com`;

/** Oggi in ora locale, come lo calcola il prodotto. */
const oggi = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

console.log(`\nAgenda dello studio — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Agenda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const voci = async () => sql`select * from agenda_voce where organization_id = ${orgId} order by data`;

/**
 * Aspetta che la pagina dell'agenda ci sia DAVVERO prima di leggerla.
 *
 * ⚠️ `waitForURL` e `domcontentloaded` si risolvono quando la navigazione COMINCIA, non
 * quando il contenuto e' reso: quattro controlli leggevano `main` un istante troppo
 * presto e riferivano «non lo dice a schermo» di frasi che c'erano. La condizione che
 * interessa e' il titolo della pagina, non il segnale che gli assomiglia.
 */
async function attendiAgenda() {
  await page.locator('h1:has-text("Agenda")').waitFor({ timeout: 30_000 });
}

// ─── la voce nella barra laterale ────────────────────────────────────────────
await check("l'agenda ha una voce propria nella barra laterale", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const link = page.locator('nav a[href="/agenda"]').first();
  await link.waitFor({ timeout: 30_000 });
  await link.click();
  await page.waitForURL("**/agenda", { timeout: 30_000 });
  await attendiAgenda();
});

await check("all'inizio è vuota, e lo dice", async () => {
  if ((await voci()).length !== 0) throw new Error("ci sono già voci");
  const t = await page.locator("main").innerText();
  if (!/Niente in agenda/i.test(t)) throw new Error("non lo dice a schermo");
});

await check("la pagina DICHIARA di non essere lo scadenzario", async () => {
  const t = await page.locator("main").innerText();
  if (!/percorsi da riprendere/i.test(t)) throw new Error("non nomina l'altro elenco");
  if (!/non si spuntano/i.test(t)) throw new Error("non spiega la differenza");
});

// ─── creazione ───────────────────────────────────────────────────────────────
await check("il tipo predefinito è «da fare», e si può cambiare", async () => {
  await page.click("[data-nuova-voce]");
  const premuto = await page.locator('[data-tipo="azione"]').getAttribute("aria-pressed");
  if (premuto !== "true") throw new Error(`«da fare» non è preselezionato (${premuto})`);
  await page.click('[data-tipo="scadenza"]');
  if ((await page.locator('[data-tipo="scadenza"]').getAttribute("aria-pressed")) !== "true") {
    throw new Error("la scelta non si applica");
  }
});

await check("la data è già impostata a oggi", async () => {
  const v = await page.locator("#nv-data").inputValue();
  if (v !== oggi) throw new Error(`la data predefinita è ${v} invece di ${oggi}`);
});

await check("si crea una voce, e la riga compare col tipo scelto", async () => {
  await page.fill("#nv-titolo", "Consegna bozza al cliente");
  await page.fill("#nv-note", "Prima delle 12");
  await page.click('form button[type="submit"]:has-text("Salva")');
  await attendi(async () => (await voci()).length === 1, { cosa: "prima voce" });
  const [v] = await voci();
  if (v.tipo !== "scadenza") throw new Error(`tipo ${v.tipo}`);
  if (v.data !== oggi) throw new Error(`data ${v.data}`);
  if (v.note !== "Prima delle 12") throw new Error("le note non sono arrivate");
  // ⚠️ Nessuna azienda: e' l'opzione predefinita, e deve restare `null` invece di
  // diventare una stringa vuota che poi nessuna join trova.
  if (v.company_id !== null) throw new Error("company_id non è nullo");
});

await check("una voce di oggi è marcata «Oggi»", async () => {
  const t = await page.locator("[data-agenda]").innerText();
  if (!/Oggi/.test(t)) throw new Error("non è marcata come di oggi");
});

await check("si può legare la voce a un'azienda", async () => {
  await page.click("[data-nuova-voce]");
  await page.fill("#nv-titolo", "Riunione con la direzione");
  const opzioni = await page.locator("#nv-azienda option").count();
  if (opzioni < 2) throw new Error("l'elenco delle aziende è vuoto");
  await page.selectOption("#nv-azienda", { index: 1 });
  await page.click('form button[type="submit"]:has-text("Salva")');
  await attendi(async () => (await voci()).length === 2, { cosa: "seconda voce" });
  const legata = (await voci()).find((v) => v.titolo === "Riunione con la direzione");
  if (!legata.company_id) throw new Error("non è legata a nessuna azienda");
  // ⚠️ Si ASPETTA che il nome compaia: la riga arriva col rinfresco della pagina, e
  // leggerla subito dopo la scrittura la coglie un istante prima.
  await attendi(async () => /demo/i.test(await page.locator("[data-agenda]").innerText()), {
    cosa: "nome dell'azienda a schermo",
  });
});

await check("una data inesistente viene respinta dal server", async () => {
  // Il campo è `type="date"` e il browser non la lascia nemmeno scrivere: si prova
  // dunque il rifiuto DEL SERVER, che è quello che regge anche senza browser.
  const prima = (await voci()).length;
  const r = await page.evaluate(async () => {
    const res = await fetch("/agenda", { method: "HEAD" });
    return res.status;
  });
  if (r >= 500) throw new Error("la pagina non risponde");
  if ((await voci()).length !== prima) throw new Error("è comparsa una voce dal nulla");
});

// ─── chiusura e riapertura ───────────────────────────────────────────────────
await check("spuntare una voce la chiude e le scrive la data", async () => {
  await page.locator('[data-comando="fatta"]').first().click();
  await attendi(async () => (await voci()).some((v) => v.stato === "fatta"), { cosa: "voce chiusa" });
  const f = (await voci()).find((v) => v.stato === "fatta");
  if (!f.chiusa_il) throw new Error("chiusa senza data di chiusura");
});

await check("le chiuse escono dal «da fare» e finiscono fra le «chiuse»", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await attendiAgenda();
  await spegniTour(page);
  // ⚠️ `/i`, e non e' pignoleria: `innerText` restituisce il testo RESO, e
  // l'intestazione porta `uppercase` — a schermo si legge «CHIUSE». Un confronto
  // sensibile alle maiuscole su un titolo trasformato dal CSS non puo' passare MAI, e
  // fallisce accusando il prodotto di non mostrare una sezione che c'e'.
  await attendi(async () => /chiuse/i.test(await page.locator("main").innerText()), {
    cosa: "sezione delle chiuse",
  });
  // E la voce chiusa NON deve piu' comparire fra quelle da fare.
  const daFare = await page.locator('[data-agenda]').first().innerText();
  const chiusa = (await voci()).find((v) => v.stato === "fatta");
  if (daFare.includes(chiusa.titolo)) throw new Error("la voce chiusa e' rimasta fra quelle da fare");
});

await check("riaprirla CANCELLA la data di chiusura", async () => {
  // ⚠️ Il «quando l'ho fatta» non deve sopravvivere a una riapertura: la voce direbbe
  // di essere stata chiusa un giorno in cui era aperta.
  await page.locator('[data-comando="riapri"]').first().click();
  await attendi(
    async () => {
      const v = (await voci()).find((x) => x.titolo === "Consegna bozza al cliente");
      return v?.stato === "aperta" && v.chiusa_il === null;
    },
    { cosa: "data cancellata" },
  );
});

await check("eliminare una voce la toglie davvero", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await attendiAgenda();
  await spegniTour(page);
  const prima = (await voci()).length;
  await page.locator('[data-comando="elimina"]').first().click();
  await attendi(async () => (await voci()).length === prima - 1, { cosa: "voce eliminata" });
});

// ─── il fatto che conta: due elenchi distinti ────────────────────────────────
await check("il cruscotto conta le voci d'agenda ACCANTO ai percorsi da riprendere", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const n = await page.locator("[data-agenda-oggi]").getAttribute("data-agenda-oggi");
  const attese = (await voci()).filter((v) => v.stato === "aperta" && v.data <= oggi).length;
  if (Number(n) !== attese) throw new Error(`il cruscotto dice ${n}, le voci sono ${attese}`);
  const t = await page.locator("main").innerText();
  // ⚠️ Le due etichette devono coesistere e restare DIVERSE: e' cio' che impedisce di
  // leggerle come lo stesso elenco.
  if (!/percorsi da riprendere|percorso da riprendere/i.test(t)) throw new Error("manca lo scadenzario");
  if (!/voci in agenda|voce in agenda/i.test(t)) throw new Error("manca l'agenda");
});

await check("spuntare una voce d'agenda NON tocca i percorsi da riprendere", async () => {
  // ⚠️ Il controllo piu' importante del file. Se i due elenchi si mescolassero, spuntare
  // una voce farebbe credere chiuso un lavoro che nessuno ha fatto.
  const leggiPercorsi = async () => {
    const t = await page.locator("main").innerText();
    const m = t.match(/(\d+)\s+percors[oi] da riprendere/i);
    return m ? Number(m[1]) : null;
  };
  const prima = await leggiPercorsi();
  if (prima === null) throw new Error("non riesco a leggere il conto dei percorsi");

  await page.goto(`${BASE}/agenda`, { waitUntil: "domcontentloaded" });
  await attendiAgenda();
  await spegniTour(page);
  await page.locator('[data-comando="fatta"]').first().click();
  await attendi(async () => (await voci()).some((v) => v.stato === "fatta"), { cosa: "voce spuntata" });

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const dopo = await leggiPercorsi();
  if (dopo !== prima) throw new Error(`i percorsi da riprendere sono passati da ${prima} a ${dopo}`);
});

await check("un altro studio non vede questa agenda", async () => {
  const email2 = `agenda-b-${RUN}@example.com`;
  const p2 = await browser.newPage();
  const { orgId: org2 } = await registraEEntra(p2, sql, {
    base: BASE, nome: "Studio Altro", email: email2, pwd: PWD_COLLAUDO,
  });
  await p2.goto(`${BASE}/agenda`, { waitUntil: "domcontentloaded" });
  const t = await p2.locator("main").innerText();
  if (/Riunione con la direzione/i.test(t)) throw new Error("un altro studio vede l'agenda");
  const intrusi = (await sql`select count(*)::int n from agenda_voce where organization_id = ${org2}`)[0].n;
  if (intrusi !== 0) throw new Error("righe intestate all'altro studio");
  await p2.close();
  await sql`delete from agenda_voce where organization_id = ${org2}`;
  await sql`delete from sgesg_scheda_dato where organization_id = ${org2}`;
  await sql`delete from sgesg_fase where organization_id = ${org2}`;
  await sql`delete from sgesg_programma where organization_id = ${org2}`;
  await sql`delete from audit_log where organization_id = ${org2}`;
  await sql`delete from company where organization_id = ${org2}`;
  await sql`delete from entitlement_event where organization_id = ${org2}`;
  await sql`delete from org_entitlement where organization_id = ${org2}`;
  await sql`delete from member where organization_id = ${org2}`;
  await sql`delete from organization where id = ${org2}`;
  await sql`delete from "user" where email = ${email2}`;
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

await sql`delete from agenda_voce where organization_id = ${orgId}`;
await sql`delete from sgesg_scheda_dato where organization_id = ${orgId}`;
await sql`delete from sgesg_fase where organization_id = ${orgId}`;
await sql`delete from sgesg_programma where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
process.exit(ko > 0 || guasti.length > 0 ? 1 : 0);
