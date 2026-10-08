import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  orgEntitlement, company, ghgInventory, companyShareLink, companyContact, agendaVoce, compenso,
  reportProject, member, organization, user, auditLog,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { archiveCompany, restoreCompany } from "@/features/companies";
import { createInventory } from "@/features/ghg/inventories";
import { creaCollegamento, revocaCollegamento } from "@/features/condivisione";
import { creaContatto } from "@/features/companies/contatti";
import { creaVoce } from "@/features/agenda";
import { creaCompenso } from "@/features/compensi";
import { latestContentSetId } from "@/features/ghg/inventories";
import { daErrore } from "@/features/esito";
import { creaStudio, pulisciStudio, type Studio } from "./comune";

// Il trigger `azienda_scrivibile` (migrazione 0061), provato sul database vero.
//
// Due regole, e per ciascuna sia ciò che deve fermare sia ciò che deve lasciar passare:
// un rimedio che blocca i pagamenti tardivi di un cliente archiviato sarebbe peggio del
// difetto. Gira in ENTRAMBE le modalità: senza `RLS_FORCE_ROLE` la connessione è
// privilegiata e le policy non scattano, ed è proprio lì che si vede se il trigger regge
// da solo.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

let A: Studio;
let B: Studio;

async function studioAttivo(prefisso: string, nome: string): Promise<Studio> {
  const s = await creaStudio({ prefisso, run: RUN, nomeStudio: nome, nomeAzienda: `Cliente di ${nome}` });
  await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  return s;
}

/** Il codice del rifiuto, letto come lo legge l'interfaccia. */
async function rifiuto(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return "riuscito";
  } catch (e) {
    const esito = daErrore(e);
    return esito.ok ? "riuscito" : esito.codice;
  }
}

describe.skipIf(!url)("azienda scrivibile: stesso studio, e niente lavoro nuovo se archiviata", () => {
  beforeAll(async () => {
    A = await studioAttivo("scrA", "Studio Scrivibile A");
    B = await studioAttivo("scrB", "Studio Scrivibile B");
  });

  afterAll(async () => {
    for (const s of [A, B]) {
      await db.delete(companyShareLink).where(eq(companyShareLink.organizationId, s.orgId));
      await db.delete(companyContact).where(eq(companyContact.organizationId, s.orgId));
      await db.delete(agendaVoce).where(eq(agendaVoce.organizationId, s.orgId));
      await db.delete(compenso).where(eq(compenso.organizationId, s.orgId));
      await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, s.orgId));
      await db.delete(reportProject).where(eq(reportProject.organizationId, s.orgId));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("una riga dello studio A che punta all'azienda di B: respinta anche senza RLS", async () => {
    // Inserimento DIRETTO, scavalcando il codice applicativo: è il terzo strato che si prova.
    const p = db.insert(reportProject).values({
      id: randomUUID(),
      organizationId: A.orgId,
      companyId: B.companyId,
      anno: 2031,
      contentSetId: await latestContentSetId("report"),
    });
    expect(await rifiuto(p)).toBe("azienda_altro_studio");
    expect(await db.select().from(reportProject).where(eq(reportProject.companyId, B.companyId))).toHaveLength(0);
  });

  it("spostare una riga sull'azienda di un altro studio: respinto", async () => {
    const id = randomUUID();
    await db.insert(reportProject).values({
      id,
      organizationId: A.orgId,
      companyId: A.companyId,
      anno: 2032,
      contentSetId: await latestContentSetId("report"),
    });
    expect(await rifiuto(db.update(reportProject).set({ companyId: B.companyId }).where(eq(reportProject.id, id)))).toBe(
      "azienda_altro_studio",
    );
  });

  it("azienda archiviata: nuovo esercizio e nuovo collegamento respinti, con il messaggio giusto", async () => {
    // Un collegamento creato PRIMA dell'archiviazione: deve restare revocabile.
    const vecchio = await creaCollegamento(A.userId, A.orgId, A.companyId, { giorni: 7 });
    await archiveCompany(A.userId, A.orgId, A.companyId);

    expect(await rifiuto(createInventory(A.userId, A.orgId, { companyId: A.companyId, anno: 2033 }))).toBe(
      "azienda_archiviata",
    );
    expect(await rifiuto(creaCollegamento(A.userId, A.orgId, A.companyId, { giorni: 7 }))).toBe("azienda_archiviata");
    const esito = daErrore(
      await createInventory(A.userId, A.orgId, { companyId: A.companyId, anno: 2034 }).catch((e: unknown) => e),
    );
    expect(esito.ok).toBe(false);
    expect(!esito.ok && esito.errore).toMatch(/archiviata.*ripristinala/);

    // Revocare il collegamento già dato resta possibile: riduce l'esposizione.
    await revocaCollegamento(A.userId, A.orgId, vecchio.id);
    const [l] = await db.select().from(companyShareLink).where(eq(companyShareLink.id, vecchio.id));
    expect(l.revokedAt).toBeTruthy();
  });

  it("azienda archiviata: contatti, agenda e compensi restano scrivibili", async () => {
    await creaContatto(A.userId, A.orgId, A.companyId, { nome: "Referente" });
    await creaVoce(A.userId, A.orgId, {
      tipo: "azione",
      titolo: "Sollecitare il saldo",
      data: "2026-12-01",
      companyId: A.companyId,
    });
    await creaCompenso(A.userId, A.orgId, { companyId: A.companyId, descrizione: "Saldo 2025", importo: 1000 });
    expect(await db.select().from(companyContact).where(eq(companyContact.companyId, A.companyId))).toHaveLength(1);
    expect(await db.select().from(agendaVoce).where(eq(agendaVoce.companyId, A.companyId))).toHaveLength(1);
    expect(await db.select().from(compenso).where(eq(compenso.companyId, A.companyId))).toHaveLength(1);
  });

  it("ripristinata, si torna a lavorare", async () => {
    await restoreCompany(A.userId, A.orgId, A.companyId);
    await createInventory(A.userId, A.orgId, { companyId: A.companyId, anno: 2035 });
    const inv = await db.select().from(ghgInventory).where(eq(ghgInventory.companyId, A.companyId));
    expect(inv.map((i) => i.anno)).toContain(2035);
  });

  it("cancellare uno studio con aziende e righe collegate: la cascata riesce", async () => {
    const C = await studioAttivo("scrC", "Studio Da Cancellare");
    await createInventory(C.userId, C.orgId, { companyId: C.companyId, anno: 2030 });
    await archiveCompany(C.userId, C.orgId, C.companyId);
    await db.delete(auditLog).where(eq(auditLog.organizationId, C.orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, C.orgId));
    await db.delete(member).where(eq(member.organizationId, C.orgId));
    await db.delete(organization).where(eq(organization.id, C.orgId));
    expect(await db.select().from(company).where(eq(company.id, C.companyId))).toHaveLength(0);
    expect(await db.select().from(ghgInventory).where(eq(ghgInventory.companyId, C.companyId))).toHaveLength(0);
    await db.delete(user).where(eq(user.id, C.userId));
  });
});
