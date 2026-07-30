import { z } from "zod";

// Tripwire: questo modulo legge segreti e non deve MAI arrivare al client.
// Nel codice client usare esclusivamente process.env.NEXT_PUBLIC_*.
if (typeof window !== "undefined") {
  throw new Error("src/lib/env.ts importato nel client: usa process.env.NEXT_PUBLIC_* nei componenti client.");
}

// Variabili obbligatorie solo in produzione: in dev/test l'app degrada in modo
// esplicito (es. email no-op senza RESEND_API_KEY), in prod il deploy deve fallire subito.
const REQUIRED_IN_PROD = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  // Senza Storage l'upload di loghi/foto fallirebbe silenziosamente a runtime:
  // meglio far fallire il deploy subito.
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Postgres: DATABASE_URL = pooler (6543, ruolo app_rls in prod), DIRECT_URL = 5432 solo migrazioni.
    DATABASE_URL: z.string().url().optional(),
    DIRECT_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Billing (Fase 9)
    STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
    // Supabase Storage (loghi, copertine, foto, PDF) — API separata dalla Data API (disattivata)
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    // Email (no-op se assente fuori produzione)
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().optional(),
    // Test seam RLS (mai impostata in produzione)
    RLS_FORCE_ROLE: z.string().regex(/^[a-z_][a-z0-9_]*$/).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV !== "production") return;
    for (const k of REQUIRED_IN_PROD) {
      if (!v[k]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: "obbligatoria in produzione" });
      }
    }
    if (v.RLS_FORCE_ROLE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RLS_FORCE_ROLE"],
        message: "RLS_FORCE_ROLE è un seam di test: non deve esistere in produzione (la connessione È già app_rls)",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const righe = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Variabili d'ambiente non valide o mancanti:\n${righe.join("\n")}`);
}

export const env = parsed.data;
