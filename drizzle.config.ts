import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Le migrazioni usano SEMPRE la connessione diretta privilegiata (DIRECT_URL, :5432),
// mai il pooler: drizzle-kit non funziona in transaction mode e in prod il pooler
// gira come app_rls senza privilegi DDL.
export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL! },
  strict: true,
  verbose: true,
});
