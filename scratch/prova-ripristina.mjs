// L'esperimento a variabile singola: `router.refresh()` sulla STESSA pagina, dallo
// stesso file, ma da un comando che NON sta dentro un Dialog.
//
// «Ripristina» e' una voce di menu a tendina; «Archivia» apre un dialogo di conferma.
// Se il ripristino aggiorna la pagina e l'archiviazione no, il difetto e' il dialogo.
// Se non aggiorna nemmeno lui, il difetto e' la pagina.
import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "../scripts/comune-registrazione.mjs";
import { PWD_COLLAUDO } from "../scripts/comune-credenziali.mjs";
import { spegniTour } from "../scripts/comune-collaudo.mjs";
const BASE = "http://localhost:3000";
const email = `ripr-${Date.now()}@example.com`;
const NOME = `Archiviata ${Date.now().toString().slice(-6)} S.r.l.`;
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("  PAGEERROR", e.message.slice(0, 120)));
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const { orgId } = await registraEEntra(p, sql, { base: BASE, nome: "Sonda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await sql`insert into company (id, organization_id, nome, settore, is_demo, stato, archived_at)
  values (gen_random_uuid(), ${orgId}, ${NOME}, 'Prove', false, 'archived', now())`;
await spegniTour(p);
// `domcontentloaded` e non `networkidle`: il portafoglio prefetcha le pagine dei sei
// moduli per ogni azienda, e «rete ferma» puo' non arrivare mai entro il timeout. Si
// aspetta l'elemento che serve, che e' la cosa che si voleva davvero.
await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.getByText("Archivio", { exact: true }).waitFor({ timeout: 60000 });
const inArchivio = p.locator('[data-slot="card"]').filter({ hasText: NOME });
console.log("  la card e' nell'archivio all'apertura:", (await inArchivio.count()) > 0);
await inArchivio.getByRole("button", { name: "Altre azioni" }).click();
await p.waitForTimeout(400);
await p.getByRole("menuitem", { name: /Ripristina/i }).click();
const t0 = Date.now();
let visto = -1;
while (Date.now() - t0 < 45000) {
  // Ripristinata, la card esce dall'archivio e torna fra le attive: la si riconosce
  // perche' acquista le caselle dei percorsi, che in archivio non ha.
  if (await p.locator('[data-slot="card"]').filter({ hasText: NOME }).locator("[data-modulo]").count()) {
    visto = Date.now() - t0; break;
  }
  await p.waitForTimeout(500);
}
const [r] = await sql`select stato from company where organization_id=${orgId} and nome=${NOME}`;
console.log("  nel database ora e':", r?.stato);
console.log("  la pagina si aggiorna dopo:", visto < 0 ? "MAI (45 s)" : `${visto} ms`);
await sql.end(); await b.close();
