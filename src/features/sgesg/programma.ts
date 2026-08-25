import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { company, sgesgFase, sgesgPhaseDef, sgesgProgramma } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import { avanzamento, type Avanzamento, type StatoFase } from "@/lib/calc/sgesg/avanzamento";

// Implementazione del sistema di gestione ESG: il dodicesimo percorso.
//
// ⚠️ Ogni select porta il filtro esplicito sull'organizzazione OLTRE a RLS. In sviluppo
// la connessione e' privilegiata e le policy non scattano: una query senza filtro
// funzionerebbe qui e mostrerebbe i programmi di tutti gli studi, mentre in produzione
// RLS coprirebbe il difetto lasciandolo li'. La difesa sta in tutti e due gli strati.

export type Programma = typeof sgesgProgramma.$inferSelect;
export type FaseDef = typeof sgesgPhaseDef.$inferSelect;
export type Fase = typeof sgesgFase.$inferSelect;

export type VistaProgramma = {
  programma: Programma;
  /** Le otto fasi del catalogo congelato, in ordine, con lo stato di ciascuna. */
  fasi: (FaseDef & { stato: StatoFase; note: string | null; conclusaIl: Date | null })[];
  avanzamento: Avanzamento;
};

/** Gli anni per cui esiste un programma, dal piu' recente. */
export async function anniProgramma(userId: string, orgId: string, companyId: string): Promise<number[]> {
  const righe = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ anno: sgesgProgramma.anno })
      .from(sgesgProgramma)
      .where(and(eq(sgesgProgramma.companyId, companyId), eq(sgesgProgramma.organizationId, orgId)))
      .orderBy(desc(sgesgProgramma.anno)),
  );
  return righe.map((r) => r.anno);
}

export async function getProgramma(
  userId: string,
  orgId: string,
  companyId: string,
  anno: number,
): Promise<VistaProgramma | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx
      .select()
      .from(sgesgProgramma)
      .where(
        and(
          eq(sgesgProgramma.companyId, companyId),
          eq(sgesgProgramma.organizationId, orgId),
          eq(sgesgProgramma.anno, anno),
        ),
      )
      .limit(1);
    if (!p) return null;

    // ⚠️ Il catalogo si legge dal set CONGELATO nel programma, non dall'ultimo seminato:
    // e' la ragione per cui `content_set_id` sta sulla riga. Un metodo che cambia non
    // deve cambiare sotto i piedi di un lavoro in corso.
    const [definizioni, stati] = await Promise.all([
      tx
        .select()
        .from(sgesgPhaseDef)
        .where(eq(sgesgPhaseDef.setId, p.contentSetId))
        .orderBy(asc(sgesgPhaseDef.ordine)),
      tx
        .select()
        .from(sgesgFase)
        .where(and(eq(sgesgFase.programId, p.id), eq(sgesgFase.organizationId, orgId))),
    ]);

    const perChiave = new Map(stati.map((s) => [s.faseKey, s]));
    const fasi = definizioni.map((d) => {
      const s = perChiave.get(d.key);
      return {
        ...d,
        stato: (s?.stato ?? "da_avviare") as StatoFase,
        note: s?.note ?? null,
        conclusaIl: s?.conclusaIl ?? null,
      };
    });

    return {
      programma: p,
      fasi,
      avanzamento: avanzamento(
        definizioni.map((d) => d.key),
        fasi.map((f) => ({ key: f.key, stato: f.stato })),
      ),
    };
  });
}

export async function creaProgramma(
  userId: string,
  orgId: string,
  dati: { companyId: string; anno: number; standard?: "GRI" | "ESRS" | "ENTRAMBI" },
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  // Il set si risolve FUORI dalla transazione perche' `latestSetId` legge senza contesto
  // di tenant: e' un catalogo, non un dato dello studio.
  const setId = await latestSetId(
    "sgesg",
    "Catalogo delle fasi del sistema di gestione ESG non disponibile: esegui il seed dei contenuti",
  );
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [az] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.id, dati.companyId), eq(company.organizationId, orgId)))
      .limit(1);
    if (!az) throw new Error("Azienda inesistente o di un altro studio");

    await tx.insert(sgesgProgramma).values({
      id,
      organizationId: orgId,
      companyId: dati.companyId,
      contentSetId: setId,
      anno: dati.anno,
      standard: dati.standard ?? "ESRS",
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.programma.create",
      entita: "sgesg_programma",
      entitaId: id,
    });
  });
  return id;
}

export type CampoProgramma = "standard" | "stato" | "responsabile" | "dataInizio" | "dataFine" | "note";

/**
 * Un campo per volta, e il valore precedente non passa mai dal browser.
 *
 * ⚠️ E' la regola nata in Fase 12 e ripetuta tre volte da allora: rimandare la riga
 * intera da props stantie azzera cio' che qualcun altro ha appena salvato.
 */
export async function setCampoProgramma(
  userId: string,
  orgId: string,
  programId: string,
  campo: CampoProgramma,
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = valore?.trim() || null;

  if (campo === "standard" && v && !["GRI", "ESRS", "ENTRAMBI"].includes(v)) {
    throw new Error("Standard non riconosciuto");
  }
  if (campo === "stato" && v && !["avvio", "in_corso", "sospeso", "concluso"].includes(v)) {
    throw new Error("Stato non riconosciuto");
  }
  // ⚠️ Le date si controllano RICOMPONENDOLE, non con una regex: `new Date("2026-02-31")`
  // non solleva, scivola al 3 marzo. Su date contrattuali un giorno inventato non e' un
  // dettaglio — e' gia' costato una correzione nel modulo segnalazioni.
  if ((campo === "dataInizio" || campo === "dataFine") && v && !dataIsoValida(v)) {
    throw new Error("La data va scritta come AAAA-MM-GG e deve esistere");
  }
  // I due campi obbligatori non si svuotano: un programma senza standard non sa quale
  // indice dei contenuti produrre, e uno senza stato non si puo' elencare.
  if ((campo === "standard" || campo === "stato") && !v) {
    throw new Error("Questo campo non puo' restare vuoto");
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const tocca = await tx
      .update(sgesgProgramma)
      .set({ [campo]: v, updatedAt: new Date() })
      .where(and(eq(sgesgProgramma.id, programId), eq(sgesgProgramma.organizationId, orgId)))
      .returning({ id: sgesgProgramma.id });
    if (!tocca.length) throw new Error("Programma inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.programma.set",
      entita: "sgesg_programma",
      entitaId: programId,
      dettagli: { campo },
    });
  });
}

/** Vero se `v` e' una data ISO che ESISTE davvero. */
export function dataIsoValida(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [, a, me, g] = m;
  const d = new Date(Date.UTC(Number(a), Number(me) - 1, Number(g)));
  return (
    d.getUTCFullYear() === Number(a) && d.getUTCMonth() === Number(me) - 1 && d.getUTCDate() === Number(g)
  );
}

/**
 * Lo stato di una fase.
 *
 * ⚠️ `conclusaIl` si scrive e si CANCELLA insieme allo stato, perche' il database
 * pretende la coerenza fra i due (`sgesg_fase_conclusa_coerente_ck`). Senza, il «quando
 * e' finita» sopravviverebbe a una riapertura e il documento finale riporterebbe una
 * data di chiusura per un lavoro riaperto.
 */
export async function setStatoFase(
  userId: string,
  orgId: string,
  programId: string,
  faseKey: string,
  stato: StatoFase,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx
      .select({ id: sgesgProgramma.id, setId: sgesgProgramma.contentSetId })
      .from(sgesgProgramma)
      .where(and(eq(sgesgProgramma.id, programId), eq(sgesgProgramma.organizationId, orgId)))
      .limit(1);
    if (!p) throw new Error("Programma inesistente o di un altro studio");

    // ⚠️ La chiave si verifica contro il catalogo CONGELATO del programma. Senza, una
    // chiave arbitraria che arriva dalla rete creerebbe una fase fantasma: non
    // comparirebbe a schermo (la vista rende il catalogo) ma occuperebbe una riga, e i
    // conteggi la vedrebbero. Il motore la scarta, ma scartarla e' un ripiego: qui non
    // deve proprio entrare.
    const [def] = await tx
      .select({ key: sgesgPhaseDef.key })
      .from(sgesgPhaseDef)
      .where(and(eq(sgesgPhaseDef.setId, p.setId), eq(sgesgPhaseDef.key, faseKey)))
      .limit(1);
    if (!def) throw new Error("Fase non riconosciuta");

    const conclusaIl = stato === "conclusa" ? new Date() : null;
    await tx
      .insert(sgesgFase)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        programId,
        faseKey,
        stato,
        conclusaIl,
      })
      .onConflictDoUpdate({
        target: [sgesgFase.programId, sgesgFase.faseKey],
        set: { stato, conclusaIl, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.fase.set",
      entita: "sgesg_fase",
      entitaId: `${programId}:${faseKey}`,
      dettagli: { faseKey, stato },
    });
  });
}

/** La nota di una fase: crea la riga se la fase non e' mai stata toccata. */
export async function setNotaFase(
  userId: string,
  orgId: string,
  programId: string,
  faseKey: string,
  note: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx
      .select({ id: sgesgProgramma.id, setId: sgesgProgramma.contentSetId })
      .from(sgesgProgramma)
      .where(and(eq(sgesgProgramma.id, programId), eq(sgesgProgramma.organizationId, orgId)))
      .limit(1);
    if (!p) throw new Error("Programma inesistente o di un altro studio");
    const [def] = await tx
      .select({ key: sgesgPhaseDef.key })
      .from(sgesgPhaseDef)
      .where(and(eq(sgesgPhaseDef.setId, p.setId), eq(sgesgPhaseDef.key, faseKey)))
      .limit(1);
    if (!def) throw new Error("Fase non riconosciuta");

    const v = note?.trim() || null;
    await tx
      .insert(sgesgFase)
      .values({ id: randomUUID(), organizationId: orgId, programId, faseKey, note: v })
      .onConflictDoUpdate({
        target: [sgesgFase.programId, sgesgFase.faseKey],
        set: { note: v, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.fase.nota",
      entita: "sgesg_fase",
      entitaId: `${programId}:${faseKey}`,
      dettagli: { faseKey },
    });
  });
}
