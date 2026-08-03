import { test, expect } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

// E2E del modulo energetico: registrazione → attivazione via DB → azienda →
// bilancio energetico → vettori → ripartizione con quadratura → indicatori →
// intervento → pubblicazione del documento. Zero errori console.
//
// Il golden del percorso: 2.280.000 kWh elettrici più 186.000 Smc di gas a
// 9,72 kWh/Smc fanno 4.087.920 kWh, e la ripartizione deve chiudere al 100%.

test("percorso energetico completo fino al documento", async ({ page }) => {
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // 1. Registrazione e attivazione dell'account (fino alla Fase 9 si fa via DB).
  const email = `e2e-ene-${Date.now()}@example.com`;
  await page.goto("/registrati");
  await page.fill("#nome", "Marta Esposito");
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

  // I tour partono da soli e coprono la pagina con l'overlay.
  await page.evaluate(() => {
    for (const k of ["portfolio", "ghg", "bilancio", "energetico"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // 2. Azienda e bilancio energetico 2025.
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Fonderia S.p.A.");
  await page.fill("#na-ateco", "24.53");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  const card = page.locator('[data-slot="card"]').filter({ hasText: "E2E Fonderia S.p.A." }).first();
  await card.waitFor({ timeout: 20_000 });
  await card.getByRole("link", { name: "Energetico", exact: true }).click();
  await page.waitForURL("**/energetico", { timeout: 20_000 });
  await page.fill("#ce-anno", "2025");
  await page.fill("#ce-base", "2024");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/energetico/2025**", { timeout: 45_000 });

  // 3. Passo 2 — energia in ingresso.
  await page.click('[data-tour="ene-passo-2"]');
  await page.waitForURL("**passo=2", { timeout: 30_000 });
  const scrivi = async (label: string, valore: string) => {
    await page.getByLabel(label, { exact: true }).fill(valore);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1200);
  };
  await scrivi("Energia elettrica prelevata dalla rete: quantità in kWh", "2280000");
  await scrivi("Energia elettrica prelevata dalla rete: spesa annua in euro", "410400");
  await scrivi("Gas naturale: quantità in Smc", "186000");
  await scrivi("Gas naturale: spesa annua in euro", "111600");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("4.087.920")).toBeVisible({ timeout: 30_000 });

  // 4. Passo 3 — ripartizione: la quadratura deve chiudere.
  await page.click('[data-tour="ene-passo-3"]');
  await page.waitForURL("**passo=3", { timeout: 30_000 });
  await scrivi("Forni fusori e processi termici primari — Energia elettrica prelevata dalla rete in kWh", "1400000");
  await scrivi("Aria compressa — Energia elettrica prelevata dalla rete in kWh", "500000");
  await scrivi("Illuminazione — Energia elettrica prelevata dalla rete in kWh", "380000");
  await scrivi("Riscaldamento degli ambienti — Gas naturale in Smc", "186000");
  await expect(page.getByText("2 su 2")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("100,0%")).toBeVisible({ timeout: 15_000 });

  // 5. Passo 4 — indicatori: il consumo specifico è energia diviso produzione.
  await page.click('[data-tour="ene-passo-4"]');
  await page.waitForURL("**passo=4", { timeout: 30_000 });
  await scrivi("Produzione dell'esercizio 2025", "1200");
  await page.click('button:has-text("Ricalcola")');
  await expect(
    page.getByRole("row").filter({ hasText: "Consumo specifico di processo" }).first().getByText("3406,6"),
  ).toBeVisible({ timeout: 45_000 });

  // 6. Passo 5 — un intervento quantificato.
  await page.click('[data-tour="ene-passo-5"]');
  await page.waitForURL("**passo=5", { timeout: 30_000 });
  await page.click('button:has-text("Aggiungi il primo intervento")');
  await expect(page.getByLabel("Descrizione dell'intervento")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Descrizione dell'intervento").fill("Recupero di calore dai fumi del forno fusorio");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);

  // 7. Passo 8 — pubblicazione: il documento nasce congelato.
  await page.click('[data-tour="ene-passo-8"]');
  await page.waitForURL("**passo=8", { timeout: 30_000 });
  await expect(page.getByText("Nessuna versione ancora pubblicata")).toBeVisible({ timeout: 30_000 });
  const [documento] = await Promise.all([
    page.waitForEvent("popup", { timeout: 90_000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await documento.waitForLoadState("networkidle");
  await expect(documento.getByText("versione 1")).toBeVisible({ timeout: 30_000 });
  await expect(documento.getByText("E2E Fonderia S.p.A.").first()).toBeVisible();
  // I numeri del percorso finiscono nel documento, non ricalcolati: congelati.
  await expect(documento.getByText("4.087.920").first()).toBeVisible();
  await expect(documento.getByText("Quadratura")).toBeVisible();
  await documento.close();

  expect(consoleErrors).toEqual([]);
});
