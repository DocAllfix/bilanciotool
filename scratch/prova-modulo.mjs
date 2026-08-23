import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "../scripts/comune-registrazione.mjs";
import { PWD_COLLAUDO } from "../scripts/comune-credenziali.mjs";
import { spegniTour } from "../scripts/comune-collaudo.mjs";
const BASE = "http://localhost:3000";
const email = `mod-${Date.now()}@example.com`;
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const { orgId } = await registraEEntra(p, sql, { base: BASE, nome: "Sonda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, 'Prova Modulo S.r.l.', 'Prove', false) returning id`;
await spegniTour(p);
await p.goto(`${BASE}/aziende/${az.id}/anticorruzione`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.locator('[data-tour="pc-crea"]').waitFor({ timeout: 60000 });
await p.click('[data-tour="pc-crea"]');
const t0 = Date.now();
let visto = -1;
while (Date.now() - t0 < 45000) {
  if (await p.locator("[data-tour^='pc-vista-']").count()) { visto = Date.now() - t0; break; }
  await p.waitForTimeout(500);
}
console.log("  le viste compaiono dopo:", visto < 0 ? "MAI (45 s)" : `${visto} ms`);
await sql.end(); await b.close();
