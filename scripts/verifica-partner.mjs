// IL CODICE PARTNER, dall'iscrizione vera fino alla riga, e la pagina dello staff.
//
//   npm run qa -- partner
//
// ⚠️ Ogni esito si legge dal DATABASE: un messaggio a schermo non dimostra una riga
// scritta, e su quella riga si paga una provvigione.
//
// ⚠️ SCRIVE: registra quattro conti e un invito. In produzione non parte.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato, attraversaProtezione, vaiA, spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const IN_PRODUZIONE =
  (process.env.DATABASE_URL ?? "").includes("hahtljrexrngtfsplbsz") || /^https:\/\/(www\.)?evalisdeck\.it/.test(BASE);
if (IN_PRODUZIONE) {
  console.log("Partner: in produzione non parte (registrerebbe conti veri).");
  process.exit(0);
}

const RUN = Date.now();
console.log(`\nCodice partner — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const pagina = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await attraversaProtezione(pagina);
const sonda = strumenta(pagina);
const { agisci, riepilogo } = contatore(pagina, sonda);

const rigaDi = async (orgId) => (await sql`select * from attribuzione_partner where organization_id = ${orgId}`)[0] ?? null;
let invitoId = null;

/** Una pagina nuova, senza sessione, con la scelta sui cookie già fatta. */
async function anonima() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("evalisdeck-consenso-v2", "rifiutato");
    } catch {}
  });
  const p = await ctx.newPage();
  await attraversaProtezione(p);
  return { ctx, p };
}

await agisci("il campo «Codice partner» c'è, ben visibile, nelle tre porte d'iscrizione", async () => {
  const { ctx, p } = await anonima();
  for (const percorso of ["/registrati", "/attiva", "/attiva/singola"]) {
    await p.goto(`${BASE}${percorso}`, { waitUntil: "domcontentloaded" });
    const campo = p.getByRole("textbox", { name: /Codice partner/ });
    await campo.waitFor({ timeout: 20_000 });
    const altezza = (await campo.boundingBox())?.height ?? 0;
    if (altezza < 40) throw new Error(`${percorso}: il campo è alto ${altezza}px, non si nota`);
  }
  await ctx.close();
});

let orgNgr = null;
await agisci("iscrivendosi con «ngr» lo studio nasce attribuito a NGR", async () => {
  const { orgId } = await registraEEntra(pagina, sql, {
    base: BASE,
    nome: "Partner Collaudo",
    email: `partner-ngr-${RUN}@example.com`,
    pwd: PWD_COLLAUDO,
    codicePartner: "ngr",
  });
  orgNgr = orgId;
  const r = await rigaDi(orgId);
  if (r?.partner_codice !== "NGR" || r?.origine !== "registrazione") {
    throw new Error(`riga ${JSON.stringify(r)}, attesa NGR dalla registrazione`);
  }
});

await agisci("⚠️ un codice sbagliato ferma l'iscrizione con un messaggio, e l'account NON nasce", async () => {
  const { ctx, p } = await anonima();
  const email = `partner-nrg-${RUN}@example.com`;
  await sql`delete from rate_limit where key like '%/sign-up/email'`;
  await p.goto(`${BASE}/registrati`, { waitUntil: "domcontentloaded" });
  await p.getByRole("textbox", { name: /Codice partner/ }).waitFor({ timeout: 20_000 });
  await p.fill("#nome", "Codice Sbagliato");
  await p.fill("#email", email);
  await p.fill("#password", PWD_COLLAUDO);
  await p.fill("#codicePartner", "NRG");
  await p.click('button[type="submit"]');
  await p.getByText(/non è riconosciuto/).waitFor({ timeout: 60_000 });
  const utenti = await sql`select id from "user" where email = ${email}`;
  if (utenti.length) throw new Error("l'account è stato creato nonostante il codice sbagliato");
  await ctx.close();
});

await agisci("nella pagina d'invito il campo NON c'è: l'invitato entra in uno studio che esiste già", async () => {
  invitoId = randomUUID();
  const [o] = await sql`select user_id from member where organization_id = ${orgNgr} and role = 'owner'`;
  await sql`insert into invitation (id, organization_id, email, role, status, expires_at, inviter_id)
    values (${invitoId}, ${orgNgr}, ${`partner-invitato-${RUN}@example.com`}, 'member', 'pending', now() + interval '2 days', ${o.user_id})`;
  const { ctx, p } = await anonima();
  await p.goto(`${BASE}/accept-invitation/${invitoId}`, { waitUntil: "domcontentloaded" });
  await p.locator("#password").first().waitFor({ timeout: 30_000 });
  if (await p.locator("#codicePartner").count()) throw new Error("il campo del codice partner compare nella pagina d'invito");
  await ctx.close();
});

// ── La pagina dello staff ─────────────────────────────────────────────────────────────

const altro = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await attraversaProtezione(altro);
const { orgId: orgSenza } = await registraEEntra(altro, sql, {
  base: BASE,
  nome: "Senza Partner",
  email: `partner-senza-${RUN}@example.com`,
  pwd: PWD_COLLAUDO,
});
await altro.close();

await agisci("⚠️ per chi non è staff la pagina dei partner NON ESISTE", async () => {
  await vaiA(pagina, `${BASE}/staff/partner`);
  const esito = await Promise.race([
    pagina.waitForSelector("text=Questa pagina non c", { timeout: 20_000 }).then(() => "nonTrovata"),
    pagina.waitForSelector("[data-partner-staff]", { timeout: 20_000 }).then(() => "aperta"),
  ]).catch(() => "niente");
  if (esito !== "nonTrovata") throw new Error(`esito «${esito}» per un account senza ruolo di piattaforma`);
});

const [io] = await sql`select user_id from member where organization_id = ${orgNgr} and role = 'owner'`;
await sql`update "user" set platform_role = 'admin' where id = ${io.user_id}`;

await agisci("lo staff vede NGR con lo studio iscritto col codice", async () => {
  await vaiA(pagina, `${BASE}/staff/partner`);
  await pagina.waitForSelector('[data-partner="NGR"]', { timeout: 30_000 });
  await spegniTour(pagina);
  if (!(await pagina.locator(`[data-partner="NGR"] [data-studio="${orgNgr}"]`).count())) {
    throw new Error("lo studio iscritto con NGR non compare sotto NGR");
  }
});

await agisci("lo staff attribuisce a mano uno studio iscritto senza codice", async () => {
  await pagina.fill("#partner-email", `partner-senza-${RUN}@example.com`);
  await pagina.fill("#partner-nota", "segnalato dal partner");
  await pagina.getByRole("button", { name: "Attribuisci al partner" }).click();
  for (let i = 0; i < 40 && !(await rigaDi(orgSenza)); i++) await pagina.waitForTimeout(500);
  const r = await rigaDi(orgSenza);
  if (r?.partner_codice !== "NGR" || r?.origine !== "staff" || r?.nota !== "segnalato dal partner") {
    throw new Error(`riga ${JSON.stringify(r)}, attesa NGR dallo staff con la nota`);
  }
  await pagina.locator(`[data-studio="${orgSenza}"]`).waitFor({ timeout: 30_000 });
});

await agisci("un indirizzo che non è titolare di nessuno studio si dice, non si indovina", async () => {
  await pagina.fill("#partner-email", `nessuno-${RUN}@example.com`);
  await pagina.getByRole("button", { name: "Attribuisci al partner" }).click();
  await pagina.locator("[data-attribuzione-manuale] [role=alert]").getByText(/Nessuno studio/).waitFor({ timeout: 30_000 });
});

await agisci("lo staff toglie l'attribuzione, dopo una conferma che dice cosa succede", async () => {
  await pagina.getByRole("button", { name: new RegExp(`Togli il partner NGR da Studio Senza Partner`) }).click();
  await pagina.getByRole("dialog").getByText(/mail di vendita dirà «nessuno»/).waitFor({ timeout: 10_000 });
  await pagina.getByRole("dialog").getByRole("button", { name: "Elimina" }).click();
  for (let i = 0; i < 40 && (await rigaDi(orgSenza)); i++) await pagina.waitForTimeout(500);
  if (await rigaDi(orgSenza)) throw new Error("l'attribuzione è ancora nel database");
  const azioni = (await sql`select azione from audit_log where organization_id = ${orgSenza}`).map((r) => r.azione);
  if (!azioni.includes("partner.attribuisci") || !azioni.includes("partner.rimuovi")) {
    throw new Error(`registro attività: ${azioni.join(", ")}`);
  }
});

const esito = riepilogo("Codice partner");
if (invitoId) await sql`delete from invitation where id = ${invitoId}`;
await browser.close();
await sql.end();
// ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1, non su 0.
process.exit(esito ? 1 : 0);
