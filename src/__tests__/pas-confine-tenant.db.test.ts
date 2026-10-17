import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgEntitlement, pasMisura, pasReclamo, pasRequisitoStato, pasSystem } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  avviaSistema,
  caricaPianoTipo,
  creaRiga,
  eliminaRiga,
  setCampoRequisito,
  setCampoRiga,
  setCampoSistema,
  setContenutoPolitica,
  setMisura,
} from "@/features/pas/sistema";
import { leggiPercorsoPas } from "@/features/pas/queries";

// Il confine fra due studi sul percorso Sistema di gestione sociale.
//
// ⚠️ Le figlie non portano `company_id`: il confine passa dal filtro esplicito sulla radice
// (`pretendiSistema`) e dal filtro `organization_id` di ogni update e delete, oltre che da
// RLS. Questo test gira in entrambe le modalità: senza `RLS_FORCE_ROLE` la connessione è
// privilegiata e le policy non scattano, quindi ciò che regge qui regge per il filtro
// applicativo da solo — che è la difesa che deve esserci in ogni caso.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-16";

describe.skipIf(!url)("PAS 24000: lo studio B non tocca il percorso dello studio A", () => {
  let A: Studio;
  let B: Studio;
  let sysA: string;
  let reclamoA: string;

  beforeAll(async () => {
    A = await creaStudio({ prefisso: "pasA", run: RUN, nomeAzienda: "Cliente di A" });
    B = await creaStudio({ prefisso: "pasB", run: RUN, nomeAzienda: "Cliente di B" });
    for (const s of [A, B]) await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
    sysA = await avviaSistema(A.userId, A.orgId, { companyId: A.companyId });
    reclamoA = await creaRiga(A.userId, A.orgId, sysA, "reclamo", OGGI);
    await setCampoRiga(A.userId, A.orgId, "reclamo", reclamoA, "oggetto", "Turni di A");
  });

  afterAll(async () => {
    for (const s of [A, B]) await pulisciStudio(s.orgId, s.userId);
  });

  it("B non avvia il percorso sull'azienda di A", async () => {
    await expect(avviaSistema(B.userId, B.orgId, { companyId: A.companyId })).rejects.toThrow("di un altro studio");
  });

  it("B non legge il percorso di A", async () => {
    expect(await leggiPercorsoPas(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("B non scrive sulla radice né aggiunge righe al percorso di A", async () => {
    await expect(setCampoSistema(B.userId, B.orgId, sysA, "ccnl", "Intruso")).rejects.toThrow("di un altro studio");
    await expect(setContenutoPolitica(B.userId, B.orgId, sysA, { chiave: "du", acceso: true })).rejects.toThrow("di un altro studio");
    await expect(creaRiga(B.userId, B.orgId, sysA, "reclamo", OGGI)).rejects.toThrow("di un altro studio");
    await expect(caricaPianoTipo(B.userId, B.orgId, sysA)).rejects.toThrow("di un altro studio");
    await expect(setCampoRequisito(B.userId, B.orgId, sysA, "4.1", "stato", "n")).rejects.toThrow("di un altro studio");
    await expect(setMisura(B.userId, B.orgId, sysA, { anno: 2026, chiave: "lav_tot", valore: "9" })).rejects.toThrow("di un altro studio");
    const [s] = await db.select().from(pasSystem).where(eq(pasSystem.id, sysA));
    expect([s.ccnl, s.politicaContenuti]).toEqual([null, []]);
    expect(await db.select().from(pasRequisitoStato).where(eq(pasRequisitoStato.systemId, sysA))).toHaveLength(0);
    expect(await db.select().from(pasMisura).where(eq(pasMisura.systemId, sysA))).toHaveLength(0);
    expect(await db.select().from(pasReclamo).where(eq(pasReclamo.systemId, sysA))).toHaveLength(1);
  });

  it("B non cambia né cancella una riga di A conoscendone l'id", async () => {
    await expect(setCampoRiga(B.userId, B.orgId, "reclamo", reclamoA, "oggetto", "Rubato")).rejects.toThrow("di un altro studio");
    await expect(eliminaRiga(B.userId, B.orgId, "reclamo", reclamoA)).rejects.toThrow("di un altro studio");
    const [r] = await db.select().from(pasReclamo).where(eq(pasReclamo.id, reclamoA));
    expect(r.oggetto).toBe("Turni di A");
  });
});
