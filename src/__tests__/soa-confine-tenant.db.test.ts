import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  organization, member, orgEntitlement, company, soaDeclaration, soaModule,
  soaControlDecision, auditLog, user,
} from "@/lib/db/schema";
import {
  createDeclaration, updateProfilo, setRuoli, setModule, listModules,
  listDecisions, setDecisionField, toggleMotivazione, getDeclaration,
} from "@/features/soa/declarations";
import { getSoaData } from "@/features/soa/queries";
import { eq } from "drizzle-orm";

// Il confine fra due studi sulla Dichiarazione di Applicabilità, provato con la
// connessione PRIVILEGIATA.
//
// Questo file gira di proposito **senza** `RLS_FORCE_ROLE=app_rls`, cioè con le policy
// che non scattano. È l'unico modo di misurare lo strato applicativo da solo: se il
// filtro `organization_id` mancasse nella query, RLS lo coprirebbe e il test passerebbe
// per il motivo sbagliato — che è esattamente com'è arrivato in produzione.
//
// Il rilievo: le funzioni SoA ricevono `declarationId` dal client e filtravano solo
// `eq(soaDeclaration.id, declarationId)`. Il commento d'errore diceva già «o di un altro
// tenant»: l'autore si affidava consapevolmente a RLS. Ovunque altro nel prodotto il
// confine è a due strati, e `CLAUDE.md` lo impone come regola.
//
// Il punto peggiore era `toggleMotivazione`: se la riga della decisione esisteva già,
// l'aggiornamento partiva **senza mai guardare a chi appartenesse la Dichiarazione**.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

const A = { org: `org-soaA-${RUN}`, user: `user-soaA-${RUN}`, az: `az-soaA-${RUN}` };
const B = { org: `org-soaB-${RUN}`, user: `user-soaB-${RUN}`, az: `az-soaB-${RUN}` };

let dichiarazioneDiA = "";

async function creaStudio(s: typeof A, nome: string) {
  await db.insert(user).values({ id: s.user, name: nome, email: `${s.user}@example.com` });
  await db.insert(organization).values({ id: s.org, name: nome, slug: s.org });
  await db.insert(member).values({ id: randomUUID(), organizationId: s.org, userId: s.user, role: "owner" });
  await db
    .insert(orgEntitlement)
    .values({ organizationId: s.org, status: "active", piano: "studio", activatedAt: new Date() });
  await db.insert(company).values({ id: s.az, organizationId: s.org, nome: `Cliente di ${nome}` });
}

async function pulisciStudio(s: typeof A) {
  await db.delete(soaControlDecision).where(eq(soaControlDecision.organizationId, s.org));
  await db.delete(soaModule).where(eq(soaModule.organizationId, s.org));
  await db.delete(soaDeclaration).where(eq(soaDeclaration.organizationId, s.org));
  await db.delete(auditLog).where(eq(auditLog.organizationId, s.org));
  await db.delete(company).where(eq(company.organizationId, s.org));
  await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, s.org));
  await db.delete(member).where(eq(member.organizationId, s.org));
  await db.delete(organization).where(eq(organization.id, s.org));
  await db.delete(user).where(eq(user.id, s.user));
}

describe.skipIf(!url)("SoA: il confine di tenant senza l'aiuto di RLS", () => {
  beforeAll(async () => {
    await creaStudio(A, "Studio A");
    await creaStudio(B, "Studio B");
    dichiarazioneDiA = await createDeclaration(A.user, A.org, { companyId: A.az });
    // Una decisione già esistente sulla Dichiarazione di A: è la condizione che apriva
    // la strada in `toggleMotivazione`, dove il controllo stava solo nel ramo «non c'è».
    await setDecisionField(A.user, A.org, dichiarazioneDiA, "27001", "8.4", "stato", "at");
    await setModule(A.user, A.org, dichiarazioneDiA, { frameworkKey: "27017", attivo: true });
  });

  afterAll(async () => {
    await pulisciStudio(A);
    await pulisciStudio(B);
  });

  it("B non riscrive il profilo della Dichiarazione di A", async () => {
    await expect(
      updateProfilo(B.user, B.org, dichiarazioneDiA, { versione: "9.9", data: "2030-01-01" }),
    ).rejects.toThrow();
    const [d] = await db.select().from(soaDeclaration).where(eq(soaDeclaration.id, dichiarazioneDiA));
    expect((d.profilo as { versione?: string }).versione).not.toBe("9.9");
  });

  it("B non cambia i ruoli della Dichiarazione di A", async () => {
    const [prima] = await db.select().from(soaDeclaration).where(eq(soaDeclaration.id, dichiarazioneDiA));
    await expect(
      setRuoli(B.user, B.org, dichiarazioneDiA, { ruoloPrivacy: "responsabile", sogliaObiettivo: 10 }),
    ).rejects.toThrow();
    const [dopo] = await db.select().from(soaDeclaration).where(eq(soaDeclaration.id, dichiarazioneDiA));
    expect(dopo.ruoloPrivacy).toBe(prima.ruoloPrivacy);
    expect(dopo.sogliaObiettivo).toBe(prima.sogliaObiettivo);
  });

  it("B non attiva moduli sulla Dichiarazione di A", async () => {
    await expect(
      setModule(B.user, B.org, dichiarazioneDiA, { frameworkKey: "27018", attivo: true }),
    ).rejects.toThrow();
    const righe = await db.select().from(soaModule).where(eq(soaModule.declarationId, dichiarazioneDiA));
    expect(righe.some((r) => r.frameworkKey === "27018")).toBe(false);
    // E nessuna riga di B si è attaccata alla Dichiarazione di A.
    expect(righe.every((r) => r.organizationId === A.org)).toBe(true);
  });

  it("B non scrive decisioni sui controlli di A", async () => {
    await expect(
      setDecisionField(B.user, B.org, dichiarazioneDiA, "27001", "5.1", "stato", "at"),
    ).rejects.toThrow();
    const righe = await db
      .select()
      .from(soaControlDecision)
      .where(eq(soaControlDecision.declarationId, dichiarazioneDiA));
    expect(righe.every((r) => r.organizationId === A.org)).toBe(true);
    expect(righe.some((r) => r.controlloId === "5.1")).toBe(false);
  });

  it("B non tocca le motivazioni di una decisione GIÀ ESISTENTE di A", async () => {
    // Il caso che il controllo nel solo ramo «non c'è» lasciava passare.
    await expect(
      toggleMotivazione(B.user, B.org, dichiarazioneDiA, {
        frameworkKey: "27001",
        controlloId: "8.4",
        motivazione: "ol",
        attiva: true,
      }),
    ).rejects.toThrow();
    const righe = await db
      .select()
      .from(soaControlDecision)
      .where(eq(soaControlDecision.declarationId, dichiarazioneDiA));
    // Due asserzioni, e la seconda è quella che conta. Guardare la sola riga di A
    // lasciava passare il caso vero: la funzione non trovava la riga di A (il filtro
    // sull'organizzazione la escludeva) e ne INSERIVA una nuova, intestata a B ma
    // agganciata alla Dichiarazione di A. Il dato di A restava intatto, e il test
    // sarebbe stato verde mentre B si era attaccato al documento di un altro studio.
    for (const r of righe) expect(r.motivazioni ?? []).not.toContain("ol");
    expect(righe.every((r) => r.organizationId === A.org)).toBe(true);
  });

  it("B non legge moduli e decisioni della Dichiarazione di A", async () => {
    // Leggere non danneggia i dati, ma è la fuga: da qui si ricavano le scelte di
    // sicurezza di un'azienda che non è cliente di B.
    await expect(listModules(B.user, B.org, dichiarazioneDiA)).rejects.toThrow();
    await expect(listDecisions(B.user, B.org, dichiarazioneDiA)).rejects.toThrow();
  });

  it("B non trova la Dichiarazione di A passando dall'azienda", async () => {
    expect(await getDeclaration(B.user, B.org, A.az)).toBeNull();
    expect(await getSoaData(B.user, B.org, A.az)).toBeNull();
  });

  it("B non crea una Dichiarazione sull'azienda di A", async () => {
    // Su `A.az` questo test passava GIÀ prima del rimedio, e per il motivo sbagliato:
    // A ha una Dichiarazione, e a fermare B era il vincolo di unicità su `company_id`,
    // non il confine fra i due studi. Serve quindi un'azienda di A **senza**
    // Dichiarazione: lì l'unico ostacolo possibile è il filtro sull'organizzazione.
    const scoperta = `az-soaA2-${RUN}`;
    await db.insert(company).values({ id: scoperta, organizationId: A.org, nome: "Seconda di A" });
    try {
      await expect(createDeclaration(B.user, B.org, { companyId: scoperta })).rejects.toThrow(
        /azienda/i,
      );
      const righe = await db.select().from(soaDeclaration).where(eq(soaDeclaration.companyId, scoperta));
      expect(righe).toHaveLength(0);
    } finally {
      await db.delete(soaDeclaration).where(eq(soaDeclaration.companyId, scoperta));
      await db.delete(company).where(eq(company.id, scoperta));
    }
  });

  it("A continua a lavorare sulla propria Dichiarazione", async () => {
    // La difesa non deve aver chiuso la porta anche al proprietario.
    await updateProfilo(A.user, A.org, dichiarazioneDiA, { versione: "1.1", data: "2026-01-01" });
    await setRuoli(A.user, A.org, dichiarazioneDiA, { sogliaObiettivo: 75 });
    await setDecisionField(A.user, A.org, dichiarazioneDiA, "27001", "5.1", "stato", "pa");
    await toggleMotivazione(A.user, A.org, dichiarazioneDiA, {
      frameworkKey: "27001",
      controlloId: "8.4",
      motivazione: "ol",
      attiva: true,
    });
    const [d] = await db.select().from(soaDeclaration).where(eq(soaDeclaration.id, dichiarazioneDiA));
    expect((d.profilo as { versione?: string }).versione).toBe("1.1");
    expect(d.sogliaObiettivo).toBe(75);
    expect((await listModules(A.user, A.org, dichiarazioneDiA)).length).toBeGreaterThan(0);
    expect((await listDecisions(A.user, A.org, dichiarazioneDiA)).length).toBe(2);
  });
});
