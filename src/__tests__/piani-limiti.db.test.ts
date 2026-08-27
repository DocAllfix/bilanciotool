import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, auditLog, platformConfig, user } from "@/lib/db/schema";
import { createCompany } from "@/features/companies";
import { getCompanyUsage, getLimitiEffettivi, assertSeatAvailable } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { PIANI, ESTENSIONI, sogliaAvviso } from "@/lib/prezzi";

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

  // ⚠️ I NUMERI SI DERIVANO DAL LISTINO, non si scrivono qui.
  //
  // Prima erano fissati a mano — «3 aziende, 2 accessi» — ed erano quelli del listino di
  // allora. Il 27 agosto 2026 le fasce sono passate a 5/15/30 e questo file e' diventato
  // rosso in cinque punti, per un motivo che col prodotto non c'entrava: il prodotto
  // funzionava benissimo, era il test a ricordare un listino che non esiste piu'.
  //
  // Cio' che va provato non e' «tre», e' che il limite applicato sia QUELLO DEL PIANO e
  // non quello di riserva, e che l'azienda dopo l'ultima venga respinta.
  const CAPIENZA = PIANI.professional.aziende;
  const ACCESSI = PIANI.professional.accessi;

  it("i limiti letti sono quelli del piano, non quelli di riserva", async () => {
    const l = await getLimitiEffettivi(orgId, userId);
    expect(l.maxActiveCompanies, "vale la capienza del piano, non le 99 di riserva").toBe(CAPIENZA);
    expect(l.maxMembers).toBe(ACCESSI);
    expect(l.maxActiveCompanies).not.toBe(RISERVA.maxActiveCompanies);
  });

  it("senza sessione la lettura regge lo stesso (è il caso dell'aggancio sugli inviti)", async () => {
    // Stessa domanda, ma senza userId: sotto app_rls questa è la chiamata che tornerebbe
    // zero righe se la valvola platformAdmin non ci fosse.
    const l = await getLimitiEffettivi(orgId);
    expect(l.maxActiveCompanies).toBe(CAPIENZA);
    expect(l.maxMembers).toBe(ACCESSI);
  });

  it("il piano si ferma all'ultima azienda della sua capienza", async () => {
    for (let n = 1; n <= CAPIENZA; n++) {
      await createCompany(userId, orgId, { nome: `Cliente ${n}` });
      if (n === sogliaAvviso(CAPIENZA)) {
        const a = await getCompanyUsage(userId, orgId);
        expect(a.nearLimit, `con ${CAPIENZA} di capacità l'avviso scatta a ${n}`).toBe(true);
      }
    }
    await expect(createCompany(userId, orgId, { nome: "Una di troppo" })).rejects.toMatchObject({
      code: "limit_companies",
    });
  });

  it("i blocchi comprati allargano la capacità, e l'azienda successiva passa", async () => {
    const extra = ESTENSIONI.bloccoAziende.aziende;
    await db.update(orgEntitlement).set({ aziendeExtra: extra }).where(eq(orgEntitlement.organizationId, orgId));
    const l = await getLimitiEffettivi(orgId, userId);
    expect(l.maxActiveCompanies, `${CAPIENZA} del piano + ${extra} comprate`).toBe(CAPIENZA + extra);
    await expect(createCompany(userId, orgId, { nome: "Una di troppo" })).resolves.toBeTypeOf("string");
  });

  it("gli accessi seguono il piano, e oltre la capienza il posto si chiude", async () => {
    // Si riempie il piano fino all'ultimo posto: il primo membro c'e' gia'.
    const aggiunti: string[] = [];
    for (let n = 1; n < ACCESSI; n++) {
      const id = `${userId}-${n}`;
      await db.insert(user).values({ id, name: `Collega ${n}`, email: `piani-${RUN}-${n}@example.com` });
      await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: id, role: "member" });
      aggiunti.push(id);
    }
    // Pieno esatto: il posto successivo non c'e'.
    await expect(assertSeatAvailable(orgId)).rejects.toMatchObject({ code: "limit_members" });

    // ⚠️ E un accesso comprato riapre il posto. L'estensione non si vende piu' — gli
    // accessi sono inclusi — ma chi l'aveva comprata deve continuare ad averla: e'
    // esattamente il ramo che si sarebbe rotto togliendo la lookup dal codice.
    await db.update(orgEntitlement).set({ accessiExtra: 1 }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(assertSeatAvailable(orgId)).resolves.toBeUndefined();

    for (const id of aggiunti) {
      await db.delete(member).where(eq(member.userId, id));
      await db.delete(user).where(eq(user.id, id));
    }
  });
});
