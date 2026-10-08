import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { invitation, orgEntitlement, rateLimit } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { contaColpo, frenato } from "@/lib/freno";
import { consumaColpo } from "@/features/documents/freno-verifica";
import { assertSeatAvailable } from "@/features/entitlement";
import { creaStudio, pulisciStudio, type Studio } from "./comune";

// Il freno atomico, provato nel modo in cui si rompeva: con richieste arrivate INSIEME.
//
// Un test che chiama il freno sei volte in fila passava anche col difetto: il «leggi,
// confronta, scrivi» in tre passi è corretto finché le richieste sono una per volta. È
// in parallelo che trenta candidature leggevano lo stesso numero e passavano tutte.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const K = `collaudo-freno-${RUN}`;

let S: Studio;

describe.skipIf(!url)("freno atomico", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "freno", run: RUN, nomeStudio: "Studio Freno" });
    // Attivo e senza piano: valgono i limiti di riserva della piattaforma.
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
  });

  afterAll(async () => {
    await db.delete(rateLimit).where(like(rateLimit.key, `${K}%`));
    await db.delete(rateLimit).where(like(rateLimit.key, `verifica:${K}%`));
    await db.delete(invitation).where(eq(invitation.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("trenta richieste insieme: ne passano esattamente cinque", async () => {
    const esiti = await Promise.all(Array.from({ length: 30 }, () => frenato(`${K}:raffica`, 3_600_000, 5)));
    expect(esiti.filter((f) => !f)).toHaveLength(5);
    const [riga] = await db.select().from(rateLimit).where(eq(rateLimit.key, `${K}:raffica`));
    expect(riga.count).toBe(30);
  });

  it("la finestra è fissa: dentro si somma, dopo la scadenza si riparte da uno", async () => {
    const t0 = 1_000_000_000_000;
    expect((await contaColpo(`${K}:finestra`, 1000, t0)).conteggio).toBe(1);
    const dentro = await contaColpo(`${K}:finestra`, 1000, t0 + 500);
    expect(dentro).toEqual({ conteggio: 2, inizio: t0 });
    const dopo = await contaColpo(`${K}:finestra`, 1000, t0 + 1500);
    expect(dopo).toEqual({ conteggio: 1, inizio: t0 + 1500 });
  });

  it("pagina di verifica: quaranta colpi insieme, ne passano trenta", async () => {
    const esiti = await Promise.all(Array.from({ length: 40 }, () => consumaColpo(`${K}-ip`)));
    expect(esiti.filter((e) => e.passa)).toHaveLength(30);
    const fermo = esiti.find((e) => !e.passa);
    expect(fermo && !fermo.passa && fermo.riprovaFra).toBeGreaterThan(0);
  });

  it("gli inviti in attesa occupano i posti: non se ne mandano più dei posti liberi", async () => {
    // Limite di riserva: 5 membri. Uno c'è già (il titolare): quattro posti liberi.
    const invita = (email: string) =>
      db.insert(invitation).values({
        id: randomUUID(),
        organizationId: S.orgId,
        email,
        role: "member",
        status: "pending",
        expiresAt: new Date(Date.now() + 48 * 3_600_000),
        inviterId: S.userId,
      });
    for (let i = 0; i < 4; i++) await invita(`collega${i}-${RUN}@example.com`);

    // Il quinto invito non ha più un posto da promettere.
    await expect(
      assertSeatAvailable(S.orgId, { invitiPendenti: { tranne: `nuovo-${RUN}@example.com` } }),
    ).rejects.toThrow(/inviti in attesa/i);
    // Rimandare uno dei quattro non ne aggiunge uno: passa.
    await expect(
      assertSeatAvailable(S.orgId, { invitiPendenti: { tranne: `collega0-${RUN}@example.com` } }),
    ).resolves.toBeUndefined();
    // All'accettazione gli inviti in attesa non contano: quello che si accetta è uno di loro.
    await expect(assertSeatAvailable(S.orgId)).resolves.toBeUndefined();
  });

  it("un invito scaduto non occupa un posto", async () => {
    await db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.email, `collega3-${RUN}@example.com`));
    await expect(
      assertSeatAvailable(S.orgId, { invitiPendenti: { tranne: `nuovo-${RUN}@example.com` } }),
    ).resolves.toBeUndefined();
  });
});
