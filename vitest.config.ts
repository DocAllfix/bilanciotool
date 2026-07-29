import { defineConfig } from "vitest/config";
import path from "node:path";

// Tassonomia test:
//   *-pure.test.ts  → logica pura, zero DB/rete (il motore di calcolo vive qui)
//   *.db.test.ts    → integrazione su Supabase dev reale, self-cleaning (suffisso Date.now(), cleanup in afterAll)
//   *.smoke.test.ts → terze parti live, si auto-skippano senza chiavi
// fileParallelism disattivato: i test db condividono la stessa istanza Supabase.
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 90_000,
    setupFiles: ["dotenv/config"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
