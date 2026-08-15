import { describe, it, expect } from "vitest";
import postgres from "postgres";

// Test di enumerazione (lezione 3): OGNI tabella con colonna organization_id deve
// avere RLS forzata e una policy tenant dedicata. Se aggiungi una tabella tenant
// e dimentichi la policy, questo test fallisce — è il guard-rail del piano.
const url = process.env.DIRECT_URL;

// Eccezioni documentate: tabelle con organization_id ma policy speciale.
// Aggiungere una tabella qui richiede una giustificazione scritta, non è un opt-out comodo.
const ECCEZIONI: Record<string, string> = {
  audit_log: "append-only: insert libero, select per-org, update/delete revocati a livello grant",
  entitlement_event:
    "registro append-only delle capacità: policy SEPARATE per INSERT (propria org o platform_admin, che serve al webhook) e SELECT (propria org). Nessuna policy per UPDATE/DELETE, perché non devono esistere — ed è PIÙ stretto di una `FOR ALL`, non più largo. In più un trigger BEFORE UPDATE OR DELETE che vale anche per la connessione privilegiata, come per document_snapshot.",
  member:
    "tabella Better Auth: letta/scritta dal plugin organization FUORI da withTenant (hook di sessione, accept-invitation); protezione a livello applicativo del plugin. Passthrough consapevole.",
  invitation:
    "tabella Better Auth: come member (sendInvitation/acceptInvitation girano senza GUC). Passthrough consapevole.",
};

describe.skipIf(!url)("matrice RLS", () => {
  it("ogni tabella tenant ha FORCE RLS e policy tenant", async () => {
    const sql = postgres(url!, { max: 1, prepare: false });
    try {
      const tenantTables = await sql`
        select c.table_name
        from information_schema.columns c
        where c.table_schema = 'public' and c.column_name = 'organization_id'
        order by 1`;
      expect(tenantTables.length).toBeGreaterThan(10);
      const problemi: string[] = [];
      for (const { table_name } of tenantTables) {
        if (ECCEZIONI[table_name]) continue;
        const [cls] = await sql`
          select relrowsecurity, relforcerowsecurity from pg_class cl
          join pg_namespace ns on ns.oid = cl.relnamespace
          where ns.nspname = 'public' and cl.relname = ${table_name}`;
        if (!cls?.relrowsecurity || !cls?.relforcerowsecurity) {
          problemi.push(`${table_name}: RLS non attiva/forzata`);
          continue;
        }
        const pol = await sql`
          select policyname from pg_policies
          where schemaname = 'public' and tablename = ${table_name}
            and policyname like '%tenant_rls'`;
        if (!pol.length) problemi.push(`${table_name}: manca la policy *_tenant_rls`);
      }
      expect(problemi, problemi.join("; ")).toHaveLength(0);
    } finally {
      await sql.end();
    }
  });

  it("nessuna tabella tenant è finita nel passthrough", async () => {
    const sql = postgres(url!, { max: 1, prepare: false });
    try {
      const wrong = await sql`
        select p.tablename from pg_policies p
        join information_schema.columns c
          on c.table_schema = 'public' and c.table_name = p.tablename and c.column_name = 'organization_id'
        where p.schemaname = 'public' and p.policyname like '%passthrough'`;
      const nonGiustificate = wrong.map((r) => r.tablename as string).filter((t) => !ECCEZIONI[t]);
      expect(nonGiustificate, nonGiustificate.join("; ")).toHaveLength(0);
    } finally {
      await sql.end();
    }
  });
});
