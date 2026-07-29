import { sql } from "drizzle-orm";
import { db } from "./index";
import { env } from "@/lib/env";

// withTenant: esegue il callback in una transazione con le GUC di tenant impostate,
// così le policy RLS scopano le query. Origine delle GUC = SEMPRE la sessione
// autenticata, mai i dati della richiesta:
//   - consulente → { userId, orgId }   (policy: match su organization_id)
//   - staff piattaforma → { platformAdmin: true } (valvola cross-tenant, gated a monte)
//
// In dev la connessione è `postgres` (bypassrls): le GUC sono innocue, comportamento
// identico. In produzione la connessione è `app_rls` (NOBYPASSRLS): default-deny.
// Seam di verifica dev/CI: RLS_FORCE_ROLE=app_rls fa assumere il ruolo ristretto a ogni
// transazione withTenant, mentre il seeding dei test resta privilegiato.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TenantCtx = {
  userId?: string | null;
  orgId?: string | null;
  platformAdmin?: boolean;
};

// Whitelist anti-injection: il valore arriva da env, mai da input utente.
const FORCE_ROLE = env.RLS_FORCE_ROLE && /^[a-z_][a-z0-9_]*$/.test(env.RLS_FORCE_ROLE) ? env.RLS_FORCE_ROLE : null;

export async function withTenant<T>(ctx: TenantCtx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (FORCE_ROLE) await tx.execute(sql.raw(`SET LOCAL ROLE ${FORCE_ROLE}`));
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId ?? ""}, true)`);
    await tx.execute(sql`SELECT set_config('app.org_id', ${ctx.orgId ?? ""}, true)`);
    await tx.execute(sql`SELECT set_config('app.platform_admin', ${ctx.platformAdmin ? "on" : ""}, true)`);
    return fn(tx);
  });
}

export type { Tx };
