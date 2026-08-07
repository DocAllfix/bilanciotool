import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, auditLog, platformConfig, user } from "@/lib/db/schema";
import { createCompany } from "@/features/companies";
import { getCompanyUsage, getLimitiEffettivi, assertSeatAvailable } from "@/features/entitlement";
import { eq } from "drizzle-orm";

// La capacità comprata, applicata sui fatti del database.
//
// Il test puro prova l'aritmetica; qui si prova che quell'aritmetica arrivi davvero fino a
// chi decide se una richiesta passa. In mezzo c'è la lettura di `org_entitlement`, che è una
// tabella tenant: **questo file va eseguito anche con `RLS_FORCE_ROLE=app_rls`**, perché è
// l'unico modo di accorgersi se la select torna zero righe senza le GUC. Con la connessione
// privilegiata dello sviluppo funzionerebbe comunque, e in produzione lo studio si
// ritroverebbe la capacità di riserva invece di quella pagata, senza nessun errore.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-piani-${RUN}`;
const userId = `user-piani-${RUN}`;
// I limiti di riserva si mettono ALTI: se il piano non venisse letto, i test passerebbero
// per merito della riserva e non proverebbero niente.
const RISERVA = { maxActiveCompanies: 99, warnAtCompanies: 90, maxMembers: 99 };
const CONFIG_PRECEDENTE: { value: unknown }[] = [];

describe.skipIf(!url)("piani: la capacità comprata è quella che vale", () => {
  beforeAll(async () => {
    const prev = await db.select({ value: platformConfig.value }).from(platformConfig).where(eq(platformConfig.key, "limits"));
    CONFIG_PRECEDENTE.push(...prev);
    await db
      .insert(platformConfig)
      .values({ key: "limits", value: RISERVA })
      .onConflictDoUpdate({ target: platformConfig.key, set: { value: RISERVA } });
    await db.insert(user).values({ id: userId, name: "Titolare Piani", email: `piani-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Piani", slug: `piani-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({
      organizationId: orgId,
      status: "active",
      piano: "professional",
      activatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
    if (CONFIG_PRECEDENTE.length) {
      await db.update(platformConfig).set({ value: CONFIG_PRECEDENTE[0].value }).where(eq(platformConfig.key, "limits"));
    } else {
      await db.delete(platformConfig).where(eq(platformConfig.key, "limits"));
    }
  });

  it("i limiti letti sono quelli del piano, non quelli di riserva", async () => {
    const l = await getLimitiEffettivi(orgId, userId);
    expect(l.maxActiveCompanies, "Professional vale 3 aziende, non le 99 di riserva").toBe(3);
    expect(l.maxMembers).toBe(2);
  });

  it("senza sessione la lettura regge lo stesso (è il caso dell'aggancio sugli inviti)", async () => {
    // Stessa domanda, ma senza userId: sotto app_rls questa è la chiamata che tornerebbe
    // zero righe se la valvola platformAdmin non ci fosse.
    const l = await getLimitiEffettivi(orgId);
    expect(l.maxActiveCompanies).toBe(3);
    expect(l.maxMembers).toBe(2);
  });

  it("il piano Professional si ferma alla terza azienda", async () => {
    await createCompany(userId, orgId, { nome: "Cliente 1" });
    await createCompany(userId, orgId, { nome: "Cliente 2" });
    const a2 = await getCompanyUsage(userId, orgId);
    expect(a2.nearLimit, "con 3 di capacità l'avviso scatta a 2").toBe(true);
    await createCompany(userId, orgId, { nome: "Cliente 3" });
    await expect(createCompany(userId, orgId, { nome: "Cliente 4" })).rejects.toMatchObject({
      code: "limit_companies",
    });
  });

  it("i blocchi comprati allargano la capacità, e la quarta azienda passa", async () => {
    await db.update(orgEntitlement).set({ aziendeExtra: 5 }).where(eq(orgEntitlement.organizationId, orgId));
    const l = await getLimitiEffettivi(orgId, userId);
    expect(l.maxActiveCompanies, "3 del piano + 5 comprate").toBe(8);
    await expect(createCompany(userId, orgId, { nome: "Cliente 4" })).resolves.toBeTypeOf("string");
  });

  it("gli accessi seguono il piano: Professional ne vale 2", async () => {
    // Un solo membro: c'è posto.
    await expect(assertSeatAvailable(orgId)).resolves.toBeUndefined();
    const altro = `${userId}-b`;
    await db.insert(user).values({ id: altro, name: "Collega", email: `piani-${RUN}-b@example.com` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: altro, role: "member" });
    await expect(assertSeatAvailable(orgId)).rejects.toMatchObject({ code: "limit_members" });
    // e un accesso comprato riapre il posto
    await db.update(orgEntitlement).set({ accessiExtra: 1 }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(assertSeatAvailable(orgId)).resolves.toBeUndefined();
    await db.delete(member).where(eq(member.userId, altro));
    await db.delete(user).where(eq(user.id, altro));
  });
});
