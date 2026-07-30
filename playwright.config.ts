import { defineConfig, devices } from "@playwright/test";

// Gira contro un dev server GIÀ avviato (npm run dev): niente webServer per non
// corrompere la cache .next con build concorrenti. workers:1 perché ogni spec
// registra utenti reali sullo stesso DB dev.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // 1 retry: il dev server sotto carico sequenziale ha latenze di compilazione
  // che superano i timeout (flakiness nota). In Fase 11 gli e2e girano contro
  // la build di produzione, dove il retry non dovrebbe mai servire.
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
