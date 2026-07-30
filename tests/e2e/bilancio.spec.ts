import { test, expect } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

// E2E del modulo Bilancio: registrazione → attivazione via DB → azienda →
// bilancio → materialità (matrice) → KPI con derivati → warning di coerenza
// col bridge GHG → politiche → verifica. Zero errori console.

test("percorso Bilancio completo con bridge GHG", async ({ page }) => {
  test.setTimeout(240_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // 1. Registrazione + attivazione account (come i test .db, fino alla Fase 9)
  const email = `e2e-bil-${Date.now()}@example.com`;
  await page.goto("/registrati");
  await page.fill("#nome", "Bruno Neri");
  await page.fill("#email", email);
  await page.fill("#password", "PasswordSicura123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  await sql`
    update org_entitlement set status = 'active'
    where organization_id = (
      select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email}
    )`;
  await sql.end();

  // 2. Azienda + progetto bilancio 2025
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Cartiera S.p.A.");
  await page.fill("#na-ateco", "17.12");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await expect(page.getByText("E2E Cartiera S.p.A.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Bilancio", exact: true }).click();
  await page.waitForURL("**/bilancio", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800); // idratazione (in dev il networkidle può precederla)
  await page.fill("#cb-anno", "2025");
  await page.click('button:has-text("Crea")');
  // In dev la prima compilazione della route può superare i 20s; un secondo
  // tentativo copre anche il click pre-idratazione.
  try {
    await page.waitForURL("**/bilancio/2025**", { timeout: 25_000 });
  } catch {
    await page.click('button:has-text("Crea")');
    await page.waitForURL("**/bilancio/2025**", { timeout: 45_000 });
  }
  await page.waitForLoadState("networkidle");

  // 3. Passo 1: profilo (ATECO serve per la proposta di settore)
  await page.fill("#p-ateco", "17.12");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(800);

  // 4. Passo 2: materialità — punteggi + guida + proposta ATECO
  await page.click('[data-tour="bil-passo-2"]');
  await page.waitForURL("**?passo=2", { timeout: 15_000 });
  await page.getByLabel("Impatto T01").click();
  await page.getByRole("option", { name: "4", exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByLabel("Finanziaria T01").click();
  await page.getByRole("option", { name: "3", exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText("1 materiali · 1/18 valutati")).toBeVisible({ timeout: 15_000 });
  // proposta dal settore (rule-based, mai automatica)
  await page.click('[data-tour="proposta-ateco"]');
  await expect(page.getByText(/Proposta indicativa/i)).toBeVisible();
  // guida consulenziale del tema
  await page.getByLabel("Guida Salute e sicurezza sul lavoro").click();
  await expect(page.getByText(/Dove trovare le informazioni/i)).toBeVisible();

  // 5. Passo 3: KPI → derivato calcolato + warning coerenza (niente inventario GHG)
  await page.click('[data-tour="bil-passo-3"]');
  await page.waitForURL("**?passo=3", { timeout: 15_000 });
  await page.getByLabel("Energia elettrica prelevata dalla rete 2025").fill("100000");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);
  await expect(page.getByText("25,65", { exact: false }).first()).toBeVisible({ timeout: 15_000 }); // Scope 2 derivato
  await expect(page.getByText(/non esiste un inventario GHG/i)).toBeVisible(); // warning bridge

  // 6. Passo 4: politiche sul tema materiale T01
  await page.click('[data-tour="bil-passo-4"]');
  await page.waitForURL("**?passo=4", { timeout: 15_000 });
  await expect(page.getByText("Cambiamento climatico ed emissioni")).toBeVisible();
  await page.locator("#pol-T01").fill("Politica energetica approvata dal CdA nel 2024.");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(800);

  // 7. Passo 6: verifica — il readiness cresce e i blocchi elencano le lacune
  await page.click('[data-tour="bil-passo-6"]');
  await page.waitForURL("**?passo=6", { timeout: 15_000 });
  await expect(page.getByText("Pronto a pubblicare", { exact: true })).toBeVisible();
  await expect(page.getByText("Capitoli narrativi")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
