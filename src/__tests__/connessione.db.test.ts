import { describe, it, expect } from "vitest";

// Test di integrazione minimo: dimostra che la pipeline *.db.test.ts raggiunge
// Supabase dev. Si auto-skippa finché DATABASE_URL non è configurata (tassonomia
// self-skipping: assenza di credenziali non è un fallimento in locale/CI).
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("connessione Supabase dev", () => {
  it("esegue SELECT 1 sul pooler", async () => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url!, { prepare: false, max: 1, connect_timeout: 10 });
    try {
      const r = await sql`select 1 as ok`;
      expect(r[0].ok).toBe(1);
    } finally {
      await sql.end();
    }
  });
});
