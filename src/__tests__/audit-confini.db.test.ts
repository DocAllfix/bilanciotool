import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { orgEntitlement, reportProject, energyCompanyFactor, member, session } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { updateStandardEPerimetro } from "@/features/report/projects";
import { latestContentSetId } from "@/features/ghg/inventories";
import { upsertCompanyFactor, deleteCompanyFactor } from "@/features/energy/vectors";
import { orgAttivaVerificata } from "@/features/auth/guards";
import { creaStudio, pulisciStudio, type Studio } from "./comune";

// I reperti dell'audit di sicurezza del 7 ottobre 2026 (run-2) che stanno nel codice
// applicativo, ciascuno provato sulla riga che il difetto avrebbe scritto o letto.
//
// Gira in ENTRAMBE le modalità: con `RLS_FORCE_ROLE=app_rls` prova il prodotto come gira
// in produzione; senza, prova che lo strato applicativo regge anche da solo, cioè che
// il rimedio non si appoggia alle policy.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

let A: Studio;
let B: Studio;
let progettoDiA = "";

async function studioAttivo(prefisso: string, nome: string): Promise<Studio> {
  const s = await creaStudio({ prefisso, run: RUN, nomeStudio: nome, nomeAzienda: `Cliente di ${nome}` });
  await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  return s;
}

describe.skipIf(!url)("audit di sicurezza: i confini corretti nel codice", () => {
  beforeAll(async () => {
    A = await studioAttivo("audA", "Studio Audit A");
    B = await studioAttivo("audB", "Studio Audit B");
    progettoDiA = randomUUID();
    await db.insert(reportProject).values({
      id: progettoDiA,
      organizationId: A.orgId,
      companyId: A.companyId,
      anno: 2025,
      contentSetId: await latestContentSetId("report"),
    });
  });

  afterAll(async () => {
    for (const s of [A, B]) {
      await db.delete(energyCompanyFactor).where(eq(energyCompanyFactor.organizationId, s.orgId));
      await db.delete(reportProject).where(eq(reportProject.organizationId, s.orgId));
      await db.delete(session).where(eq(session.userId, s.userId));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("impostazioni del bilancio: una colonna fuori elenco fa fallire la richiesta e la riga resta com'era", async () => {
    await expect(
      updateStandardEPerimetro(A.userId, A.orgId, progettoDiA, {
        perimetro: "x",
        companyId: B.companyId,
        anno: 2030,
      } as never),
    ).rejects.toThrow();
    const [p] = await db.select().from(reportProject).where(eq(reportProject.id, progettoDiA));
    expect(p.companyId).toBe(A.companyId);
    expect(p.anno).toBe(2025);
    expect(p.perimetro).toBeNull();
  });

  it("impostazioni del bilancio: i due campi ammessi si salvano ancora", async () => {
    await updateStandardEPerimetro(A.userId, A.orgId, progettoDiA, {
      standard: "GRI 2021 — in conformità",
      perimetro: "Sede di Taranto",
    });
    const [p] = await db.select().from(reportProject).where(eq(reportProject.id, progettoDiA));
    expect(p.standard).toBe("GRI 2021 — in conformità");
    expect(p.perimetro).toBe("Sede di Taranto");
  });

  it("fattore energetico sull'azienda di un altro studio: respinto, e lo studio vero salva il proprio", async () => {
    await expect(upsertCompanyFactor(A.userId, A.orgId, B.companyId, { key: "gas", kwhUnita: "1" })).rejects.toThrow(
      /altro tenant/,
    );
    const occupate = await db
      .select()
      .from(energyCompanyFactor)
      .where(eq(energyCompanyFactor.companyId, B.companyId));
    expect(occupate).toHaveLength(0);

    await upsertCompanyFactor(B.userId, B.orgId, B.companyId, { key: "gas", kwhUnita: "9,95" });
    const [proprio] = await db
      .select()
      .from(energyCompanyFactor)
      .where(and(eq(energyCompanyFactor.companyId, B.companyId), eq(energyCompanyFactor.key, "gas")));
    expect(proprio.organizationId).toBe(B.orgId);
  });

  it("cancellazione del fattore: lo studio A non tocca quello di B", async () => {
    await deleteCompanyFactor(A.userId, A.orgId, B.companyId, "gas");
    const rimasti = await db
      .select()
      .from(energyCompanyFactor)
      .where(and(eq(energyCompanyFactor.companyId, B.companyId), eq(energyCompanyFactor.key, "gas")));
    expect(rimasti).toHaveLength(1);
  });

  it("ex collaboratore: la sessione che punta ancora allo studio non viene accettata", async () => {
    // Un collaboratore di A, poi tolto: la sua sessione conserva `activeOrganizationId = A`.
    const exUserId = `user-audEx-${RUN}`;
    const { user } = await import("@/lib/db/schema");
    await db.insert(user).values({ id: exUserId, name: "Ex", email: `audex-${RUN}@example.com` });
    try {
      const esito = await orgAttivaVerificata({ userId: exUserId, activeOrganizationId: A.orgId });
      expect(esito).toBe("non-membro");

      // Controprova: da membro vero lo studio si risolve.
      await db.insert(member).values({ id: randomUUID(), organizationId: A.orgId, userId: exUserId, role: "member" });
      const membro = await orgAttivaVerificata({ userId: exUserId, activeOrganizationId: A.orgId });
      expect(membro).toEqual({ orgId: A.orgId, role: "member" });
    } finally {
      await db.delete(member).where(eq(member.userId, exUserId));
      await db.delete(user).where(eq(user.id, exUserId));
    }
  });

  it("reimpostare la password chiude le sessioni aperte", async () => {
    const { auth } = await import("@/lib/auth");
    const ctx = await auth.$context;
    await db.insert(session).values({
      id: randomUUID(),
      token: `tok-aud-${RUN}`,
      userId: A.userId,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const token = `aud${RUN}`;
    await ctx.internalAdapter.createVerificationValue({
      value: A.userId,
      identifier: `reset-password:${token}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await auth.api.resetPassword({ body: { token, newPassword: `Nuova-password-${RUN}!` } });
    const aperte = await db.select().from(session).where(eq(session.userId, A.userId));
    expect(aperte).toHaveLength(0);
  });
});
