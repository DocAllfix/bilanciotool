import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gdprRequisitoStato, gdprSystem, gdprTrattamento, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  avviaSistema,
  creaRiga,
  eliminaRiga,
  setCampoRequisito,
  setCampoRiga,
  setCampoSistema,
  setCriterio,
  caricaPianoTipo,
} from "@/features/gdpr/sistema";
import { leggiPercorsoGdpr } from "@/features/gdpr/queries";

// Il confine fra due studi sul percorso Protezione dei dati.
//
// ⚠️ Le figlie non portano `company_id`: il confine passa dal filtro esplicito sulla
// radice (`pretendiSistema`) e dal filtro `organization_id` di ogni update e delete, oltre
// che da RLS. Questo test gira in entrambe le modalità: senza `RLS_FORCE_ROLE` la
// connessione è privilegiata e le policy non scattano, quindi ciò che regge qui regge per
// il filtro applicativo da solo — che è la difesa che deve esserci in ogni caso.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-12";

describe.skipIf(!url)("GDPR: lo studio B non tocca il percorso dello studio A", () => {
  let A: Studio;
  let B: Studio;
  let sysA: string;
  let trattamentoA: string;

  beforeAll(async () => {
    A = await creaStudio({ prefisso: "gdprA", run: RUN, nomeAzienda: "Cliente di A" });
    B = await creaStudio({ prefisso: "gdprB", run: RUN, nomeAzienda: "Cliente di B" });
    for (const s of [A, B]) await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
    sysA = await avviaSistema(A.userId, A.orgId, { companyId: A.companyId });
    trattamentoA = await creaRiga(A.userId, A.orgId, sysA, "trattamento", OGGI);
    await setCampoRiga(A.userId, A.orgId, "trattamento", trattamentoA, "nome", "Paghe di A");
  });

  afterAll(async () => {
    for (const s of [A, B]) await pulisciStudio(s.orgId, s.userId);
  });

  it("B non avvia il percorso sull'azienda di A", async () => {
    await expect(avviaSistema(B.userId, B.orgId, { companyId: A.companyId })).rejects.toThrow("di un altro studio");
  });

  it("B non legge il percorso di A", async () => {
    expect(await leggiPercorsoGdpr(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("B non scrive sulla radice né aggiunge righe al percorso di A", async () => {
    await expect(setCampoSistema(B.userId, B.orgId, sysA, "legale", "Intruso")).rejects.toThrow("di un altro studio");
    await expect(creaRiga(B.userId, B.orgId, sysA, "richiesta", OGGI)).rejects.toThrow("di un altro studio");
    await expect(caricaPianoTipo(B.userId, B.orgId, sysA)).rejects.toThrow("di un altro studio");
    await expect(setCampoRequisito(B.userId, B.orgId, sysA, "P-01", "stato", "n")).rejects.toThrow("di un altro studio");
    const [s] = await db.select().from(gdprSystem).where(eq(gdprSystem.id, sysA));
    expect(s.legale).toBeNull();
    expect(await db.select().from(gdprRequisitoStato).where(eq(gdprRequisitoStato.systemId, sysA))).toHaveLength(0);
  });

  it("B non cambia né cancella una riga di A conoscendone l'id", async () => {
    await expect(setCampoRiga(B.userId, B.orgId, "trattamento", trattamentoA, "nome", "Rubato")).rejects.toThrow("di un altro studio");
    await expect(setCriterio(B.userId, B.orgId, trattamentoA, { chiave: "sens", acceso: true })).rejects.toThrow("di un altro studio");
    await expect(eliminaRiga(B.userId, B.orgId, "trattamento", trattamentoA)).rejects.toThrow("di un altro studio");
    const [t] = await db.select().from(gdprTrattamento).where(eq(gdprTrattamento.id, trattamentoA));
    expect([t.nome, t.criteri]).toEqual(["Paghe di A", []]);
  });
});
