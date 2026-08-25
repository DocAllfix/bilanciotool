import { and, asc, eq, sql as raw } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { sgesgProgramma, sgesgSchedaDef, sgesgSchedaDato } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";

// Le schede del metodo: catalogo congelato + compilato del programma.
//
// ⚠️ Ogni select porta il filtro esplicito sull'organizzazione oltre a RLS: in sviluppo
// la connessione e' privilegiata e le policy non scattano, quindi un filtro mancante
// funzionerebbe qui e mostrerebbe il compilato di tutti gli studi.

export type CampoDef = {
  /** Chiave del dato. `d: 1` se derivata dall'etichetta invece che dichiarata. */
  k: string;
  d?: 1;
  l: string;
  t: "testo" | "testo_lungo" | "numero" | "data" | "scelta" | "scelte";
  r?: 1;
  w?: number;
  o?: string[];
};
export type SezioneDef = { t: string; c: CampoDef[] };
export type SchedaDef = typeof sgesgSchedaDef.$inferSelect & { sezioni: SezioneDef[] };

export type VoceScheda = {
  key: string;
  codice: string | null;
  titolo: string;
  sottotitolo: string | null;
  haLogica: boolean;
  /** Campi compilabili del catalogo. Zero per le schede con logica. */
  campi: number;
  /** Campi effettivamente valorizzati. */
  compilati: number;
  stato: "non_aperta" | "bozza" | "completata";
};

/** Quanti campi ha una scheda, contando dentro le sezioni. */
function contaCampi(sezioni: SezioneDef[]): number {
  return sezioni.reduce((n, z) => n + z.c.length, 0);
}

/** Quanti campi risultano valorizzati. Vuoto, `null` e spazi non contano. */
function contaCompilati(sezioni: SezioneDef[], dati: Record<string, unknown>): number {
  let n = 0;
  for (const z of sezioni) {
    for (const c of z.c) {
      const v = dati[c.k];
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      n++;
    }
  }
  return n;
}

/** Il set di contenuti congelato nel programma, verificando che sia dello studio. */
async function setDelProgramma(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  orgId: string,
  programId: string,
): Promise<string> {
  const [p] = await tx
    .select({ setId: sgesgProgramma.contentSetId })
    .from(sgesgProgramma)
    .where(and(eq(sgesgProgramma.id, programId), eq(sgesgProgramma.organizationId, orgId)))
    .limit(1);
  if (!p) throw new Error("Programma inesistente o di un altro studio");
  return p.setId;
}

/** Le schede di una fase, con lo stato di compilazione di ciascuna. */
export async function elencaSchede(
  userId: string,
  orgId: string,
  programId: string,
  faseKey: string,
): Promise<VoceScheda[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const setId = await setDelProgramma(tx, orgId, programId);
    const [def, dati] = await Promise.all([
      tx
        .select()
        .from(sgesgSchedaDef)
        .where(and(eq(sgesgSchedaDef.setId, setId), eq(sgesgSchedaDef.faseKey, faseKey)))
        .orderBy(asc(sgesgSchedaDef.ordine)),
      tx
        .select()
        .from(sgesgSchedaDato)
        .where(and(eq(sgesgSchedaDato.programId, programId), eq(sgesgSchedaDato.organizationId, orgId))),
    ]);
    const perChiave = new Map(dati.map((d) => [d.schedaKey, d]));
    return def.map((s) => {
      const sezioni = (s.sezioni ?? []) as SezioneDef[];
      const d = perChiave.get(s.key);
      return {
        key: s.key,
        codice: s.codice,
        titolo: s.titolo,
        sottotitolo: s.sottotitolo,
        haLogica: s.haLogica,
        campi: contaCampi(sezioni),
        compilati: d ? contaCompilati(sezioni, (d.dati ?? {}) as Record<string, unknown>) : 0,
        stato: !d ? "non_aperta" : d.stato,
      };
    });
  });
}

export type VistaScheda = {
  def: SchedaDef;
  dati: Record<string, unknown>;
  stato: "non_aperta" | "bozza" | "completata";
};

export async function getScheda(
  userId: string,
  orgId: string,
  programId: string,
  schedaKey: string,
): Promise<VistaScheda | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const setId = await setDelProgramma(tx, orgId, programId);
    const [def] = await tx
      .select()
      .from(sgesgSchedaDef)
      .where(and(eq(sgesgSchedaDef.setId, setId), eq(sgesgSchedaDef.key, schedaKey)))
      .limit(1);
    if (!def) return null;
    const [d] = await tx
      .select()
      .from(sgesgSchedaDato)
      .where(
        and(
          eq(sgesgSchedaDato.programId, programId),
          eq(sgesgSchedaDato.schedaKey, schedaKey),
          eq(sgesgSchedaDato.organizationId, orgId),
        ),
      )
      .limit(1);
    return {
      def: { ...def, sezioni: (def.sezioni ?? []) as SezioneDef[] },
      dati: (d?.dati ?? {}) as Record<string, unknown>,
      stato: d ? d.stato : "non_aperta",
    };
  });
}

/**
 * Scrive UN campo, atomicamente, dentro il JSONB.
 *
 * ⚠️ `jsonb_set` e non «leggi, modifica, riscrivi». E' la regola che questo progetto ha
 * pagato tre volte con lo stesso difetto: rimandare l'oggetto intero azzera i campi che
 * qualcun altro — o lo stesso utente in un altro riquadro — ha salvato nel frattempo.
 * Qui il client manda il nome del campo e il suo valore, e il database applica la
 * modifica sulla riga com'e' adesso, non su una copia di un istante fa.
 *
 * ⚠️ E la chiave si verifica contro il CATALOGO: senza, una chiave arbitraria che arriva
 * dalla rete si scriverebbe nel JSONB, non comparirebbe mai a schermo — la scheda rende
 * il catalogo — e resterebbe li' dentro per sempre.
 */
export async function setCampoScheda(
  userId: string,
  orgId: string,
  programId: string,
  schedaKey: string,
  campo: string,
  valore: string | string[] | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const setId = await setDelProgramma(tx, orgId, programId);
    const [def] = await tx
      .select({ sezioni: sgesgSchedaDef.sezioni, haLogica: sgesgSchedaDef.haLogica })
      .from(sgesgSchedaDef)
      .where(and(eq(sgesgSchedaDef.setId, setId), eq(sgesgSchedaDef.key, schedaKey)))
      .limit(1);
    if (!def) throw new Error("Scheda non riconosciuta");
    if (def.haLogica) throw new Error("Questa scheda non si compila da qui");

    const sezioni = (def.sezioni ?? []) as SezioneDef[];
    const atteso = sezioni.flatMap((z) => z.c).find((c) => c.k === campo);
    if (!atteso) throw new Error("Campo non riconosciuto");

    // Un valore vuoto TOGLIE la chiave invece di lasciarla a stringa vuota: cosi' il
    // conteggio dei compilati e' una domanda sola («la chiave c'e'?») e non due.
    const vuoto =
      valore === null || (typeof valore === "string" && valore.trim() === "") || (Array.isArray(valore) && !valore.length);
    const nuovo = vuoto ? null : Array.isArray(valore) ? valore : String(valore).trim();

    await tx
      .insert(sgesgSchedaDato)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        programId,
        schedaKey,
        dati: nuovo === null ? {} : { [campo]: nuovo },
      })
      .onConflictDoUpdate({
        target: [sgesgSchedaDato.programId, sgesgSchedaDato.schedaKey],
        set: {
          dati:
            nuovo === null
              ? raw`${sgesgSchedaDato.dati} - ${campo}`
              : raw`jsonb_set(${sgesgSchedaDato.dati}, ${`{${campo}}`}, ${JSON.stringify(nuovo)}::jsonb, true)`,
          updatedAt: new Date(),
        },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.scheda.set",
      entita: "sgesg_scheda_dato",
      entitaId: `${programId}:${schedaKey}`,
      dettagli: { schedaKey, campo },
    });
  });
}

/** Lo stato dichiarato della scheda: e' del consulente, non dedotto dal riempimento. */
export async function setStatoScheda(
  userId: string,
  orgId: string,
  programId: string,
  schedaKey: string,
  stato: "bozza" | "completata",
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const setId = await setDelProgramma(tx, orgId, programId);
    const [def] = await tx
      .select({ key: sgesgSchedaDef.key })
      .from(sgesgSchedaDef)
      .where(and(eq(sgesgSchedaDef.setId, setId), eq(sgesgSchedaDef.key, schedaKey)))
      .limit(1);
    if (!def) throw new Error("Scheda non riconosciuta");

    await tx
      .insert(sgesgSchedaDato)
      .values({ id: randomUUID(), organizationId: orgId, programId, schedaKey, stato })
      .onConflictDoUpdate({
        target: [sgesgSchedaDato.programId, sgesgSchedaDato.schedaKey],
        set: { stato, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgesg.scheda.stato",
      entita: "sgesg_scheda_dato",
      entitaId: `${programId}:${schedaKey}`,
      dettagli: { schedaKey, stato },
    });
  });
}

/** Quante schede per fase, e quante completate: per il riepilogo del percorso. */
export async function riepilogoSchede(
  userId: string,
  orgId: string,
  programId: string,
): Promise<Map<string, { totali: number; completate: number }>> {
  return withTenant({ userId, orgId }, async (tx) => {
    const setId = await setDelProgramma(tx, orgId, programId);
    const [def, dati] = await Promise.all([
      tx
        .select({ key: sgesgSchedaDef.key, faseKey: sgesgSchedaDef.faseKey })
        .from(sgesgSchedaDef)
        .where(eq(sgesgSchedaDef.setId, setId)),
      tx
        .select({ schedaKey: sgesgSchedaDato.schedaKey, stato: sgesgSchedaDato.stato })
        .from(sgesgSchedaDato)
        .where(and(eq(sgesgSchedaDato.programId, programId), eq(sgesgSchedaDato.organizationId, orgId))),
    ]);
    const completate = new Set(dati.filter((d) => d.stato === "completata").map((d) => d.schedaKey));
    const out = new Map<string, { totali: number; completate: number }>();
    for (const d of def) {
      const v = out.get(d.faseKey) ?? { totali: 0, completate: 0 };
      v.totali++;
      if (completate.has(d.key)) v.completate++;
      out.set(d.faseKey, v);
    }
    return out;
  });
}
