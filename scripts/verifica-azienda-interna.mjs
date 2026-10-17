// Fascia «Azienda»: l'amministratore assegna i percorsi, il collaboratore vede e scrive SOLO
// quelli.
//
//   npm run qa -- azienda-interna
//
// ⚠️ LA PROVA DI UN DIVIETO È LA RIGA CHE NON COMPARE. Il collaboratore ha una pagina del GHG
// aperta; l'amministratore gli toglie il percorso; lui preme «Salva voce». Il server deve
// rifiutare, e la voce non deve esistere nel database. Una pagina nascosta nella barra non
// prova niente: è presentazione, e il divieto vero sta in `requirePercorso`.
//
// ⚠️ Il piano si scrive col database, come negli altri collaudi: comprare davvero passa da
// Stripe e lo prova `verifica-checkout`. Qui conta che cosa succede DOPO.

import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { attendi, attraversaProtezione, contatore, pretendiServerAggiornato, spegniTour, strumenta } from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const ADMIN = `interna-admin-${RUN}@example.com`;
const COLLEGA = `interna-collega-${RUN}@example.com`;

console.log(`\nFascia «Azienda» — percorsi assegnati — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });

async function scheda() {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  await attraversaProtezione(page);
  const guasti = strumenta(page);
  return { ctx, page, ...contatore(page, guasti) };
}

const A = await scheda();
const C = await scheda();
let orgId;
let demoId;

/** Le assegnazioni del collega, lette dal database. */
const assegnati = async () =>
  (await sql`select a.modulo from assegnazione_percorso a join "user" u on u.id = a.user_id
             where u.email = ${COLLEGA} and a.organization_id = ${orgId} order by 1`).map((r) => r.modulo);

/** I link dei percorsi nella barra dell'azienda (la prima: il menu del telefono ripete la stessa). */
const percorsiInBarra = (page) =>
  page.locator(`nav[aria-label="Navigazione dell'azienda"]`).first().locator("[data-modulo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-modulo")));

/**
 * Una pagina che per questa persona NON deve esistere.
 *
 * ⚠️ Non si guarda il codice HTTP: con `loading.tsx` la pagina arriva in streaming, e
 * `notFound()` risponde 200 col contenuto «non trovato» (regola del 14 settembre). Si
 * corre la pagina «non trovata» CONTRO il contenuto vietato: aspettando solo la prima, un
 * prodotto che mostrasse il percorso fallirebbe con un timeout invece che col motivo.
 */
async function nonEsiste(page, percorso) {
  await page.goto(`${BASE}${percorso}`, { waitUntil: "domcontentloaded" });
  const assente = page.getByRole("heading", { name: "Questa pagina non c'è" });
  const vietato = page.locator("main [data-tour], main [data-vista], main form").first();
  const vince = await Promise.race([
    assente.waitFor({ timeout: 45000 }).then(() => "assente"),
    vietato.waitFor({ timeout: 45000 }).then(() => "vietato"),
  ]);
  if (vince !== "assente") throw new Error(`${percorso} mostra il suo contenuto`);
}

try {
  // ─── l'amministratore ──────────────────────────────────────────────────────
  ({ orgId } = await registraEEntra(A.page, sql, { base: BASE, nome: "Amministratore Interno", email: ADMIN, pwd: PWD_COLLAUDO }));
  await sql`update org_entitlement set status='active', piano='azienda', activated_at=now() where organization_id=${orgId}`;
  [{ id: demoId }] = await sql`select id from company where organization_id=${orgId} and is_demo`;
  await spegniTour(A.page);

  let idInvito = null;
  await A.agisci("l'amministratore invita un collaboratore (ruolo predefinito)", async () => {
    await A.page.goto(`${BASE}/impostazioni/membri`, { waitUntil: "domcontentloaded" });
    const t = await A.page.locator("main").innerText();
    if (!/Chi lavora nell'azienda/.test(t)) throw new Error("la pagina parla ancora di studio");
    if (!(await A.page.getByRole("radio", { name: /Collaboratore/ }).isChecked())) throw new Error("il ruolo predefinito non è Collaboratore");
    await A.page.locator("#invita-email").fill(COLLEGA);
    await A.page.getByRole("button", { name: /Invia invito/i }).click();
    await attendi(async () => {
      const [r] = await sql`select id, role from invitation where email=${COLLEGA} and organization_id=${orgId}`;
      if (r) idInvito = r.id;
      return !!r && r.role === "member";
    }, { cosa: "invito col ruolo collaboratore" });
  });

  // ─── il collaboratore entra ───────────────────────────────────────────────
  await C.agisci("il collaboratore si iscrive dall'invito e lo accetta", async () => {
    await C.page.goto(`${BASE}/accept-invitation/${idInvito}`, { waitUntil: "domcontentloaded" });
    await C.page.locator("#nome").fill("Collega Interno");
    await C.page.locator("#password").fill(PWD_COLLAUDO);
    await C.page.getByRole("button", { name: /crea l'account/i }).click();
    await C.page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 40000 });
    await sql`update "user" set email_verified=true where email=${COLLEGA}`;
    await C.page.goto(`${BASE}/accept-invitation/${idInvito}`, { waitUntil: "domcontentloaded" });
    await C.page.locator("#accesso-email").fill(COLLEGA);
    await C.page.locator("#accesso-password").fill(PWD_COLLAUDO);
    await C.page.getByRole("button", { name: /^Accedi$/ }).click();
    await C.page.getByRole("button", { name: /^Entra in/ }).click({ timeout: 30000 });
    await C.page.waitForURL("**/dashboard", { timeout: 30000 });
    await spegniTour(C.page);
  });

  await C.agisci("senza assegnazioni il collaboratore non vede NESSUN percorso", async () => {
    await C.page.goto(`${BASE}/aziende/${demoId}`, { waitUntil: "domcontentloaded" });
    await C.page.locator("main h1").waitFor();
    const barra = await percorsiInBarra(C.page);
    if (barra.length) throw new Error(`la barra mostra ${barra.join(", ")}`);
  });

  // ─── l'amministratore assegna ─────────────────────────────────────────────
  await A.agisci("l'amministratore assegna il GHG, e la riga compare nel database", async () => {
    await A.page.goto(`${BASE}/impostazioni/membri`, { waitUntil: "domcontentloaded" });
    const riquadro = A.page.locator(`[data-membro="${COLLEGA}"]`);
    await riquadro.getByRole("checkbox", { name: "Inventario GHG" }).check();
    await attendi(async () => (await assegnati()).join() === "ghg", { cosa: "assegnazione del GHG" });
  });

  // ─── il collaboratore vede solo il suo ─────────────────────────────────────
  await C.agisci("la barra e il fascicolo mostrano SOLO il GHG", async () => {
    await C.page.goto(`${BASE}/aziende/${demoId}`, { waitUntil: "domcontentloaded" });
    await C.page.locator("[data-percorsi] li[data-modulo]").first().waitFor();
    const barra = await percorsiInBarra(C.page);
    const fascicolo = await C.page.locator("[data-percorsi] li[data-modulo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-modulo")));
    if (barra.join() !== "ghg") throw new Error(`barra: ${barra.join(", ")}`);
    if (fascicolo.join() !== "ghg") throw new Error(`fascicolo: ${fascicolo.join(", ")}`);
  });

  await C.agisci("un percorso non assegnato, aperto per indirizzo, NON esiste (404)", async () => {
    for (const m of ["gdpr", "bilancio", "mog231"]) await nonEsiste(C.page, `/aziende/${demoId}/${m}`);
  });

  await C.agisci("niente compensi, niente «Nuova azienda»: sono di chi amministra", async () => {
    await nonEsiste(C.page, "/compensi");
    await C.page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await C.page.locator("main h1").waitFor();
    if (await C.page.locator('[data-tour="nuova-azienda"]').count()) throw new Error("il collaboratore può creare un'azienda");
    if (await C.page.locator('a[href="/compensi"]').count()) throw new Error("la voce Compensi è in barra");
  });

  // ─── ⚠️ il divieto sul server ───────────────────────────────────────────────
  const [inv] = await sql`select id, anno from ghg_inventory where company_id=${demoId} order by anno desc limit 1`;
  const voci = async () => (await sql`select count(*)::int n from ghg_activity_row where inventory_id=${inv.id}`)[0].n;
  await C.agisci("il collaboratore apre i dati di attività del GHG", async () => {
    await C.page.goto(`${BASE}/aziende/${demoId}/ghg/${inv.anno}?passo=3`, { waitUntil: "domcontentloaded" });
    await C.page.getByRole("button", { name: /Aggiungi voce/ }).waitFor({ timeout: 30000 });
  });

  await A.agisci("l'amministratore gli toglie il GHG", async () => {
    await A.page.reload({ waitUntil: "domcontentloaded" });
    await A.page.locator(`[data-membro="${COLLEGA}"]`).getByRole("checkbox", { name: "Inventario GHG" }).uncheck();
    await attendi(async () => (await assegnati()).length === 0, { cosa: "revoca del GHG" });
  });

  const prima = await voci();
  await C.respinto("⚠️ con la pagina ancora aperta, salvare una voce è RIFIUTATO dal server", async () => {
    await C.page.getByRole("button", { name: /Aggiungi voce/ }).click();
    await C.page.fill("#v-desc", "Voce che non deve esistere");
    await C.page.fill("#v-q", "123");
    await C.page.getByRole("button", { name: "Salva voce" }).click();
  }, { prova: async () => (await voci()) === prima });

  await C.agisci("e ricaricando, il percorso non c'è più", async () => {
    await nonEsiste(C.page, `/aziende/${demoId}/ghg/${inv.anno}`);
  });

  // ─── promosso amministratore, vede tutto ──────────────────────────────────
  await A.agisci("l'amministratore lo promuove ad amministratore", async () => {
    await A.page.reload({ waitUntil: "domcontentloaded" });
    await A.page.getByRole("group", { name: /Ruolo di Collega Interno/ }).getByRole("button", { name: "Amministratore" }).click();
    await attendi(async () => {
      const [m] = await sql`select m.role from member m join "user" u on u.id=m.user_id where u.email=${COLLEGA} and m.organization_id=${orgId}`;
      return m?.role === "admin";
    }, { cosa: "ruolo admin" });
  });

  await C.agisci("da amministratore vede di nuovo tutti i percorsi", async () => {
    await C.page.goto(`${BASE}/aziende/${demoId}`, { waitUntil: "domcontentloaded" });
    await C.page.locator("[data-percorsi] li[data-modulo]").first().waitFor();
    const barra = await percorsiInBarra(C.page);
    // Il numero dei percorsi non si scrive: si confronta con la barra dell'amministratore.
    await A.page.goto(`${BASE}/aziende/${demoId}`, { waitUntil: "domcontentloaded" });
    await A.page.locator("[data-percorsi] li[data-modulo]").first().waitFor();
    const tutti = await percorsiInBarra(A.page);
    if (tutti.length < 2 || barra.join() !== tutti.join()) throw new Error(`${barra.length} percorsi contro ${tutti.length}`);
  });

  await A.agisci("l'audit registra assegnazione, revoca e ruolo", async () => {
    const r = await sql`select azione from audit_log where organization_id=${orgId} and azione in ('percorso.assegna','percorso.revoca','membro.ruolo') order by created_at`;
    const azioni = r.map((x) => x.azione).join(",");
    if (azioni !== "percorso.assegna,percorso.revoca,membro.ruolo") throw new Error(azioni || "nessuna riga");
  });
} finally {
  const a = A.riepilogo("Fascia «Azienda» — amministratore");
  const c = C.riepilogo("Fascia «Azienda» — collaboratore");
  var esito = a + c;
  await browser.close();
  await sql.end();
}
// `riepilogo` restituisce quanti ROSSI ci sono: con dei falliti si esce con 1.
process.exit(esito ? 1 : 0);
