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
  // ⚠️ Strumento di misura, spento salvo che non lo si accenda con `DB_TRACCIA=1`.
  //
  // Serve perche' il costo di una pagina si misura in VIAGGI, e i viaggi non si contano
  // leggendo il codice: cinque letture che sembrano indipendenti possono interrogare la
  // stessa tabella cinque volte, e la duplicazione si vede solo guardando il traffico.
  // Non e' un logger di produzione: stampa su stderr e va acceso a mano.
  ...(process.env.DB_TRACCIA === "1"
    ? {
        debug: (_conn: number, query: string) => {
          const q = query.replace(/\s+/g, " ").trim().slice(0, 110);
          console.error("[sql] " + q);
        },
      }
    : {}),
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
