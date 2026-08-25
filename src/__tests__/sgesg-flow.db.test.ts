import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgEntitlement, sgesgFase, sgesgProgramma } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  anniProgramma,
  creaProgramma,
  getProgramma,
  setCampoProgramma,
  setNotaFase,
  setStatoFase,
} from "@/features/sgesg/programma";

// Implementazione del sistema di gestione ESG: flusso e confine di tenant.
//
// ⚠️ Il confine si prova ANCHE in sviluppo, dove la connessione e' privilegiata e le
// policy RLS non scattano: e' il caso in cui un filtro applicativo mancante passerebbe
// inosservato, perche' in produzione le policy lo coprirebbero.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let progA = "";

async function pulisci(orgId: string) {
  await db.delete(sgesgFase).where(eq(sgesgFase.organizationId, orgId));
  await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, orgId));
}

beforeAll(async () => {
  A = await creaStudio({ prefisso: "esg-a", run: RUN, nomeAzienda: "Azienda dello studio A" });
  B = await creaStudio({ prefisso: "esg-b", run: RUN, nomeAzienda: "Azienda dello studio B" });
  for (const s of [A, B]) {
    await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  }
  progA = await creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: 2025, standard: "ESRS" });
});

afterAll(async () => {
  for (const s of [A, B]) {
    await pulisci(s.orgId);
    await pulisciStudio(s.orgId, s.userId);
  }
});

describe("programma ESG", () => {
  it("nasce con le otto fasi del catalogo, tutte da avviare", async () => {
    const v = (await getProgramma(A.userId, A.orgId, A.companyId, 2025))!;
    expect(v.fasi).toHaveLength(8);
    expect(v.fasi.map((f) => f.codice)).toEqual([
      "PROC-00", "PROC-01", "PROC-02", "PROC-03", "PROC-04", "PROC-05", "PROC-06", "PROC-07",
    ]);
    expect(v.fasi.every((f) => f.stato === "da_avviare")).toBe(true);
    expect(v.avanzamento).toMatchObject({ totali: 8, concluse: 0, percentuale: 0, prossima: "proc00" });
  });

  it("congela il catalogo alla creazione", async () => {
    const [p] = await db.select().from(sgesgProgramma).where(eq(sgesgProgramma.id, progA));
    // ⚠️ Il set e' sulla riga, non risolto a ogni lettura: e' cio' che impedisce a un
    // metodo aggiornato di cambiare sotto i piedi di un lavoro gia' avviato.
    expect(p.contentSetId).toBe("sgesg-v1");
  });

  it("una fase esiste solo quando viene toccata", async () => {
    expect(await db.select().from(sgesgFase).where(eq(sgesgFase.programId, progA))).toHaveLength(0);
    await setStatoFase(A.userId, A.orgId, progA, "proc00", "in_corso");
    expect(await db.select().from(sgesgFase).where(eq(sgesgFase.programId, progA))).toHaveLength(1);
  });

  it("concludere una fase scrive la data, riaprirla la CANCELLA", async () => {
    await setStatoFase(A.userId, A.orgId, progA, "proc00", "conclusa");
    let [f] = await db
      .select()
      .from(sgesgFase)
      .where(and(eq(sgesgFase.programId, progA), eq(sgesgFase.faseKey, "proc00")));
    expect(f.conclusaIl).not.toBeNull();

    // ⚠️ Il punto: il «quando e' finita» non deve sopravvivere a una riapertura, o il
    // documento finale riporterebbe una data di chiusura per un lavoro riaperto. Lo
    // pretende anche il CHECK del database.
    await setStatoFase(A.userId, A.orgId, progA, "proc00", "in_corso");
    [f] = await db
      .select()
      .from(sgesgFase)
      .where(and(eq(sgesgFase.programId, progA), eq(sgesgFase.faseKey, "proc00")));
    expect(f.conclusaIl).toBeNull();
  });

  it("l'avanzamento conta le CONCLUSE sulle otto, non sulle toccate", async () => {
    for (const k of ["proc00", "proc01", "proc02"]) {
      await setStatoFase(A.userId, A.orgId, progA, k, "conclusa");
    }
    await setStatoFase(A.userId, A.orgId, progA, "proc03", "in_corso");
    const v = (await getProgramma(A.userId, A.orgId, A.companyId, 2025))!;
    expect(v.avanzamento.concluse).toBe(3);
    expect(v.avanzamento.percentuale).toBe(38);
    expect(v.avanzamento.prossima).toBe("proc03");
  });

  it("una nota si salva senza toccare lo stato della fase", async () => {
    await setNotaFase(A.userId, A.orgId, progA, "proc04", "Attesa dei consumi del quarto trimestre.");
    const v = (await getProgramma(A.userId, A.orgId, A.companyId, 2025))!;
    const f = v.fasi.find((x) => x.key === "proc04")!;
    expect(f.note).toBe("Attesa dei consumi del quarto trimestre.");
    expect(f.stato).toBe("da_avviare");
  });

  it("una fase che il catalogo non conosce viene RIFIUTATA", async () => {
    // Non si scarta a valle: non deve proprio entrare. Una riga fantasma non
    // comparirebbe a schermo — la vista rende il catalogo — ma occuperebbe spazio e i
    // conteggi la vedrebbero.
    await expect(setStatoFase(A.userId, A.orgId, progA, "proc99", "conclusa")).rejects.toThrow(/non riconosciuta/i);
    const righe = await db
      .select()
      .from(sgesgFase)
      .where(and(eq(sgesgFase.programId, progA), eq(sgesgFase.faseKey, "proc99")));
    expect(righe).toEqual([]);
  });

  it("una data inesistente viene rifiutata, non fatta scivolare", async () => {
    // ⚠️ `new Date("2026-02-31")` non solleva: scivola al 3 marzo. Su una data
    // contrattuale un giorno inventato non e' un dettaglio.
    await expect(
      setCampoProgramma(A.userId, A.orgId, progA, "dataInizio", "2026-02-31"),
    ).rejects.toThrow(/AAAA-MM-GG/);
    await setCampoProgramma(A.userId, A.orgId, progA, "dataInizio", "2026-02-28");
    const [p] = await db.select().from(sgesgProgramma).where(eq(sgesgProgramma.id, progA));
    expect(p.dataInizio).toBe("2026-02-28");
  });

  it("standard e stato non si svuotano", async () => {
    await expect(setCampoProgramma(A.userId, A.orgId, progA, "standard", "")).rejects.toThrow(/vuoto/i);
    await expect(setCampoProgramma(A.userId, A.orgId, progA, "stato", "  ")).rejects.toThrow(/vuoto/i);
  });

  it("due programmi per lo stesso esercizio non si possono creare", async () => {
    await expect(
      creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: 2025 }),
    ).rejects.toThrow();
    expect(await anniProgramma(A.userId, A.orgId, A.companyId)).toEqual([2025]);
  });
});

describe("confine fra studi", () => {
  it("lo studio B non vede il programma dello studio A", async () => {
    expect(await getProgramma(B.userId, B.orgId, A.companyId, 2025)).toBeNull();
    expect(await anniProgramma(B.userId, B.orgId, A.companyId)).toEqual([]);
  });

  it("lo studio B non tocca il programma dello studio A, e la riga non cambia", async () => {
    await expect(
      setCampoProgramma(B.userId, B.orgId, progA, "responsabile", "Rubato"),
    ).rejects.toThrow(/altro studio/i);
    await expect(setStatoFase(B.userId, B.orgId, progA, "proc05", "conclusa")).rejects.toThrow(/altro studio/i);
    await expect(setNotaFase(B.userId, B.orgId, progA, "proc05", "Intrusione")).rejects.toThrow(/altro studio/i);

    // ⚠️ La prova non e' il messaggio: e' la riga che non e' cambiata.
    const [p] = await db.select().from(sgesgProgramma).where(eq(sgesgProgramma.id, progA));
    expect(p.responsabile).toBeNull();
    const fantasma = await db
      .select()
      .from(sgesgFase)
      .where(and(eq(sgesgFase.programId, progA), eq(sgesgFase.faseKey, "proc05")));
    expect(fantasma).toEqual([]);
  });

  it("lo studio B non crea un programma su un'azienda dello studio A", async () => {
    await expect(
      creaProgramma(B.userId, B.orgId, { companyId: A.companyId, anno: 2024 }),
    ).rejects.toThrow(/altro studio/i);
    const righe = await db
      .select()
      .from(sgesgProgramma)
      .where(and(eq(sgesgProgramma.companyId, A.companyId), eq(sgesgProgramma.organizationId, B.orgId)));
    expect(righe).toEqual([]);
  });
});
