// Il codice partner dall'iscrizione vera fino alla riga, e il confine su chi può cambiarla.

import { describe, it, expect, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { attribuzionePartner, auditLog, member, organization, orgEntitlement, user } from "@/lib/db/schema";

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const utenti: string[] = [];
const studi: string[] = [];

async function iscrivi(email: string, codicePartner?: string) {
  const { auth } = await import("@/lib/auth");
  const res = await auth.api.signUpEmail({
    body: {
      email,
      password: `Pw-molto-sicura-${RUN}!`,
      name: "Prova Partner",
      ...(codicePartner !== undefined ? { codicePartner } : {}),
    } as never,
  });
  utenti.push(res.user.id);
  const [m] = await db.select().from(member).where(eq(member.userId, res.user.id));
  studi.push(m!.organizationId);
  return { userId: res.user.id, orgId: m!.organizationId };
}

const rigaDi = async (orgId: string) =>
  (await db.select().from(attribuzionePartner).where(eq(attribuzionePartner.organizationId, orgId)))[0] ?? null;

// ⚠️ La pulizia sta al livello del FILE: dentro il primo blocco puliva solo quello, e gli
// studi dei test sulla policy restavano nel database (visti nella pagina dello staff).
afterAll(async () => {
  if (!url) return;
  if (studi.length) {
    await db.delete(attribuzionePartner).where(inArray(attribuzionePartner.organizationId, studi));
    await db.delete(orgEntitlement).where(inArray(orgEntitlement.organizationId, studi));
    await db.delete(organization).where(inArray(organization.id, studi));
  }
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe.skipIf(!url)("il codice partner all'iscrizione", () => {

  it("«ngr» scritto in minuscolo lega lo studio a NGR, e lo scrive nel registro attività", async () => {
    const { orgId } = await iscrivi(`partner-ok-${RUN}@example.com`, " ngr ");
    const r = await rigaDi(orgId);
    expect(r?.partnerCodice).toBe("NGR");
    expect(r?.origine).toBe("registrazione");
    const audit = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgId));
    expect(audit.some((a) => a.azione === "partner.attribuisci")).toBe(true);
  });

  it("senza codice lo studio nasce senza partner", async () => {
    const { orgId } = await iscrivi(`partner-vuoto-${RUN}@example.com`, "");
    expect(await rigaDi(orgId)).toBeNull();
  });

  it("⚠️ un codice sconosciuto ferma l'iscrizione: l'account NON nasce", async () => {
    const email = `partner-sbagliato-${RUN}@example.com`;
    await expect(iscrivi(email, "NRG")).rejects.toThrow(/non è riconosciuto/);
    expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(0);
  });

  it("la cassa e la mail di vendita leggono il partner dello studio", async () => {
    const { userId, orgId } = await iscrivi(`partner-letture-${RUN}@example.com`, "NGR");
    const { partnerDelloStudio, attribuzioneDelloStudio } = await import("@/features/partner");
    expect(await partnerDelloStudio(userId, orgId)).toBe("NGR");
    expect((await attribuzioneDelloStudio(orgId))?.codice).toBe("NGR");
  });

  it("lo staff sposta e toglie, e ogni passaggio resta nel registro attività", async () => {
    const { orgId } = await iscrivi(`partner-staff-${RUN}@example.com`);
    const staff = utenti[utenti.length - 1]!;
    const { attribuisciDaStaff, rimuoviAttribuzione } = await import("@/features/partner");
    expect((await attribuisciDaStaff(staff, orgId, "NGR", "segnalato a voce")).prima).toBeNull();
    expect((await rigaDi(orgId))?.origine).toBe("staff");
    expect(await rimuoviAttribuzione(staff, orgId)).toBe(true);
    expect(await rigaDi(orgId)).toBeNull();
    const azioni = (await db.select().from(auditLog).where(eq(auditLog.organizationId, orgId))).map((a) => a.azione);
    expect(azioni).toEqual(expect.arrayContaining(["partner.attribuisci", "partner.rimuovi"]));
  });
});

// ⚠️ LA POLICY, provata assumendo il ruolo a mano: in produzione la connessione È `app_rls`.
// Lo studio legge la propria attribuzione e NON la può spostare né togliere: su quella riga
// si paga una provvigione.
describe.skipIf(!process.env.DIRECT_URL || !url)("la policy della migrazione 0071", () => {
  const comeStudio = async <T,>(orgId: string, fn: (tx: postgres.TransactionSql) => Promise<T>, admin = false) => {
    const sql = postgres(process.env.DIRECT_URL!, { max: 1, prepare: false });
    try {
      return await sql.begin(async (tx) => {
        await tx`set local role app_rls`;
        await tx`select set_config('app.org_id', ${orgId}, true), set_config('app.platform_admin', ${admin ? "on" : ""}, true)`;
        return fn(tx);
      });
    } finally {
      await sql.end();
    }
  };

  it("lo studio vede la propria riga, e non può spostarla né toglierla", async () => {
    const { orgId } = await iscrivi(`partner-policy-${RUN}@example.com`, "NGR");
    const esito = await comeStudio(orgId, async (tx) => {
      const [v] = await tx`select count(*)::int n from attribuzione_partner where organization_id = ${orgId}`;
      const spostate = await tx`update attribuzione_partner set nota = 'manomessa' where organization_id = ${orgId}`;
      const tolte = await tx`delete from attribuzione_partner where organization_id = ${orgId}`;
      return { viste: v!.n, spostate: spostate.count, tolte: tolte.count };
    });
    expect(esito).toEqual({ viste: 1, spostate: 0, tolte: 0 });
    expect((await rigaDi(orgId))?.nota).toBeNull();
  });

  it("uno studio non vede quella di un altro", async () => {
    const a = await iscrivi(`partner-policy-a-${RUN}@example.com`, "NGR");
    const b = await iscrivi(`partner-policy-b-${RUN}@example.com`);
    const viste = await comeStudio(b.orgId, async (tx) => {
      const [v] = await tx`select count(*)::int n from attribuzione_partner where organization_id = ${a.orgId}`;
      return v!.n;
    });
    expect(viste).toBe(0);
  });

  it("lo staff invece la cambia", async () => {
    const { orgId } = await iscrivi(`partner-policy-staff-${RUN}@example.com`, "NGR");
    const spostate = await comeStudio(
      "",
      async (tx) => (await tx`update attribuzione_partner set nota = 'dallo staff' where organization_id = ${orgId}`).count,
      true,
    );
    expect(spostate).toBe(1);
  });
});
