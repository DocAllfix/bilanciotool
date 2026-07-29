import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

// Isolamento RLS esercitato DAVVERO col ruolo app_rls (SET LOCAL ROLE dentro la
// transazione), su connessione diretta. Il seeding resta privilegiato (postgres).
const url = process.env.DIRECT_URL;

const RUN = Date.now();
const orgA = `orgA-${RUN}`;
const orgB = `orgB-${RUN}`;
const userA = `userA-${RUN}`;

describe.skipIf(!url)("isolamento RLS multi-tenant", () => {
  const sql = postgres(url!, { max: 1, prepare: false, connect_timeout: 15 });
  const coA = randomUUID();
  const coB = randomUUID();

  beforeAll(async () => {
    await sql`insert into organization (id, name, slug) values (${orgA}, 'Org A', ${"a-" + RUN}), (${orgB}, 'Org B', ${"b-" + RUN})`;
    await sql`insert into company (id, organization_id, nome) values (${coA}, ${orgA}, 'Cliente di A'), (${coB}, ${orgB}, 'Cliente di B')`;
  });

  afterAll(async () => {
    await sql`delete from company where id in (${coA}, ${coB})`;
    await sql`delete from organization where id in (${orgA}, ${orgB})`;
    await sql.end();
  });

  // Helper: esegue fn in transazione come app_rls con le GUC date.
  const asTenant = <T,>(guc: { org?: string; user?: string; admin?: boolean }, fn: (tx: postgres.Sql) => Promise<T>) =>
    sql.begin(async (tx) => {
      await tx`set local role app_rls`;
      await tx`select set_config('app.org_id', ${guc.org ?? ""}, true)`;
      await tx`select set_config('app.user_id', ${guc.user ?? ""}, true)`;
      await tx`select set_config('app.platform_admin', ${guc.admin ? "on" : ""}, true)`;
      return fn(tx as unknown as postgres.Sql);
    });

  it("il tenant vede solo le proprie aziende", async () => {
    const rows = await asTenant({ org: orgA }, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    expect(rows.map((r) => r.id)).toEqual([coA]);
  });

  it("senza GUC non si vede nulla (default-deny)", async () => {
    const rows = await asTenant({}, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    expect(rows).toHaveLength(0);
  });

  it("la valvola staff vede entrambi i tenant", async () => {
    const rows = await asTenant({ admin: true }, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    expect(rows).toHaveLength(2);
  });

  it("scrittura cross-tenant negata (WITH CHECK)", async () => {
    await expect(
      asTenant({ org: orgA }, (tx) => tx`insert into company (id, organization_id, nome) values (${randomUUID()}, ${orgB}, 'intruso')`),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it("update cross-tenant non tocca righe (USING filtra)", async () => {
    const res = await asTenant({ org: orgA }, (tx) => tx`update company set nome = 'hack' where id = ${coB}`);
    expect(res.count).toBe(0);
    const check = await sql`select nome from company where id = ${coB}`;
    expect(check[0].nome).toBe("Cliente di B");
  });

  it("GUC interleaved sulla stessa connessione: nessun leak tra transazioni", async () => {
    // max:1 = stessa connessione fisica per entrambe le transazioni sequenziali.
    const a = await asTenant({ org: orgA }, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    const b = await asTenant({ org: orgB }, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    const none = await asTenant({}, (tx) => tx`select id from company where id in (${coA}, ${coB})`);
    expect(a.map((r) => r.id)).toEqual([coA]);
    expect(b.map((r) => r.id)).toEqual([coB]);
    expect(none).toHaveLength(0);
  });

  it("audit_log: insert consentito, update/delete negati ad app_rls", async () => {
    await asTenant({ org: orgA, user: userA }, (tx) => tx`insert into audit_log (organization_id, user_id, azione) values (${orgA}, ${userA}, 'test.rls')`);
    await expect(
      asTenant({ org: orgA }, (tx) => tx`update audit_log set azione = 'manomesso' where organization_id = ${orgA}`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asTenant({ org: orgA }, (tx) => tx`delete from audit_log where organization_id = ${orgA}`),
    ).rejects.toThrow(/permission denied/i);
    // cleanup privilegiato
    await sql`delete from audit_log where organization_id = ${orgA}`;
  });

  it("cataloghi: lettura consentita, scrittura negata ai tenant", async () => {
    await asTenant({ org: orgA }, (tx) => tx`select count(*) from emission_factor`);
    await expect(
      asTenant({ org: orgA }, (tx) => tx`insert into platform_config (key, value) values ('hack', '{}')`),
    ).rejects.toThrow(/row-level security|violates/i);
  });
});
