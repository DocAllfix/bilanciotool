import { test, expect } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { PWD_COLLAUDO } from "./credenziali";

// E2E del modulo GHG: utente NUOVO via form reale → verifica del paywall demo
// (blocco server-side) → attivazione account via DB (come i test .db) → percorso
// completo: azienda, inventario, sorgente, voce, risultati con golden numerico.
// Zero errori console su tutto il flusso.

test("percorso GHG completo: paywall demo, attivazione, inventario e risultati", async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // 1. Registrazione reale
  const email = `e2e-ghg-${Date.now()}@example.com`;
  await page.goto("/registrati");
  await page.fill("#nome", "Elena Bruno");
  await page.fill("#email", email);
  await page.fill("#password", PWD_COLLAUDO);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // 2. Stato demo: la creazione azienda è BLOCCATA server-side (contratto F1/F9)
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Meccanica S.r.l.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await expect(page.getByRole("alert")).toContainText(/abbonamento/i);
  await page.keyboard.press("Escape");

  // 3. Attivazione dell'account via DB (fino alla Fase 9 lo sblocco è manuale)
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  await sql`
    update org_entitlement set status = 'active'
    where organization_id = (
      select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email}
    )`;
  await sql.end();

  // 4. Ora la creazione azienda passa
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Meccanica S.r.l.");
  await page.fill("#na-settore", "Componenti meccanici");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await expect(page.getByText("E2E Meccanica S.r.l.")).toBeVisible({ timeout: 15_000 });

  // 5. Inventario GHG 2025 (networkidle = idratazione completata prima dei click)
  await page.click("text=Inventario GHG");
  await page.waitForURL("**/ghg", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.fill("#ci-anno", "2025");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/ghg/2025**", { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  // 6. Passo 2 — registro sorgenti: inclusa + esclusa con motivazione obbligatoria
  await page.click('[data-tour="ghg-passo-2"]');
  await page.getByRole("group", { name: /Combustione fissa/ }).getByRole("button", { name: "Inclusa" }).click();
  // esclusione: chiede la motivazione prima di salvare
  await page.getByRole("group", { name: /Emissioni di processo/ }).getByRole("button", { name: "Esclusa" }).click();
  await expect(page.getByText(/Scrivi la motivazione/i)).toBeVisible();
  await page.getByLabel(/Motivazione per Emissioni di processo/).fill("Nessun processo chimico in stabilimento");
  await page.keyboard.press("Tab");

  // 7. Passo 3 — voce golden: gas naturale 12.500 Smc × 1,9755 = 24,694 t
  await page.click('[data-tour="ghg-passo-3"]');
  await page.waitForLoadState("networkidle");
  await page.click('[data-tour="aggiungi-voce"]');
  await page.fill("#v-q", "12500");
  await page.fill("#v-ev", "Fatture gas 2025");
  await expect(page.getByText("24,694 tCO₂e")).toBeVisible(); // anteprima (stesse funzioni pure)
  await page.click('button:has-text("Salva voce")');
  await expect(page.getByRole("cell", { name: "24,694" })).toBeVisible({ timeout: 15_000 });

  // 8. Passo 5 — risultati dal server: stesso golden
  await page.click('[data-tour="ghg-passo-5"]');
  await expect(page.getByText("Totale location-based").first()).toBeVisible();
  await expect(page.getByText("24,7", { exact: false }).first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
