import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "../scripts/comune-registrazione.mjs";
import { PWD_COLLAUDO } from "../scripts/comune-credenziali.mjs";
import { spegniTour } from "../scripts/comune-collaudo.mjs";
const BASE = "http://localhost:3000";
const email = `crea-${Date.now()}@example.com`;
const NOME = `Nuova Prova ${Date.now().toString().slice(-6)} S.r.l.`;
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("  PAGEERROR", e.message.slice(0, 130)));
p.on("console", (m) => { if (m.type() === "error") console.log("  CONSOLE", m.text().slice(0, 130)); });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const { orgId } = await registraEEntra(p, sql, { base: BASE, nome: "Sonda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(p);
await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.locator('[data-tour="nuova-azienda"]').waitFor({ timeout: 60000 });
console.log("  inneschi «Nuova azienda» in pagina:", await p.getByRole("button", { name: /^Nuova azienda$/ }).count());
await p.click('[data-tour="nuova-azienda"]');
await p.locator("#na-nome").waitFor({ timeout: 20000 });
await p.fill("#na-nome", NOME);
await p.click('button[type="submit"]:has-text("Crea azienda")');
const t0 = Date.now();
const card = p.locator("h1").filter({ hasText: NOME });
let visto = -1;
while (Date.now() - t0 < 90000) {
  if (await card.count()) { visto = Date.now() - t0; break; }
  await p.waitForTimeout(500);
}
const [r] = await sql`select id from company where organization_id=${orgId} and nome=${NOME}`;
console.log("  riga nel database:", r ? "c'e'" : "assente");
console.log("  il fascicolo dell azienda si apre dopo:", visto < 0 ? "MAI (90 s)" : `${visto} ms`);
console.log("  dialogo ancora aperto:", await p.locator('[role="dialog"]').count());
await sql.end(); await b.close();
