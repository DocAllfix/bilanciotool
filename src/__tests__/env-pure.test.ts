import { describe, it, expect, vi, afterEach } from "vitest";

// Verifica il contratto di src/lib/env.ts: in sviluppo le variabili di servizio
// possono mancare; in produzione la loro assenza deve far fallire il boot.
describe("env schema", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("in sviluppo si carica senza variabili di servizio", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(import("@/lib/env")).resolves.toBeDefined();
  });

  it("in produzione rifiuta l'avvio senza le variabili obbligatorie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("@/lib/env")).rejects.toThrow(/obbligatoria in produzione/);
  });

  it("in produzione rifiuta il seam di test RLS_FORCE_ROLE", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:6543/db");
    vi.stubEnv("DIRECT_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
    vi.stubEnv("RLS_FORCE_ROLE", "app_rls");
    await expect(import("@/lib/env")).rejects.toThrow(/seam di test/);
  });
});
