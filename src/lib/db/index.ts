import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL mancante: configura .env (pooler Supabase :6543).");
}

// Tuning per serverless dietro pgbouncer in transaction mode:
// prepare:false obbligatorio col pooler; max basso perché ogni lambda apre il suo pool
// e il pooler Supabase satura in fretta con i default.
const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
