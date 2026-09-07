import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";

import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import {
  company,
  nis2Control,
  nis2ControlState,
  nis2Indicator,
  nis2IndicatorDef,
  nis2IndicatorReading,
  nis2Phase,
  nis2PhaseState,
  nis2Profile,
  nis2System,
} from "@/lib/db/schema";
import {
  attuazione,
  perFase,
  prossimaVerifica,
  statoEffettivo,
  type Controllo,
} from "@/lib/calc/nis2/controlli";
import { andamento, scostamento, statoIndicatore, ultimaRilevazione } from "@/lib/calc/nis2/indicatori";
import { giorniA, terminiRoadmap } from "@/lib/calc/nis2/roadmap";
import { scadenze, statoTermine } from "@/lib/calc/nis2/termini";
import { CONTENT_SET } from "@/features/nis2/profilo";
import {
  campoIndicatoreSchema,
  controlloSchema,
  faseSchema,
  nuovoIndicatoreSchema,
  rilevazioneSchema,
  roadmapSchema,
} from "@/features/nis2/validation";

// LA PARTE PROPRIA DEL SISTEMA DI GESTIONE NIS2.
//
// Quattro motori che l'autovalutazione non ha: i 68 controlli, la roadmap a cinque fasi,
// lo scadenzario e gli indicatori. Il profilo e le risposte ai requisiti stanno in
// `features/nis2/profilo.ts` e sono condivisi: qui non si duplica niente di quello.
//
// Sola lettura per i derivati: percentuale d'attuazione, stato effettivo di un controllo,
// stato di un indicatore e scadenze si ricalcolano a ogni apertura dalle funzioni pure.

async function pretendiSistema(tx: Tx, orgId: string, companyId: string) {
  const [s] = await tx
    .select()
    .from(nis2System)
    .where(and(eq(nis2System.companyId, companyId), eq(nis2System.organizationId, orgId)));
  if (!s) throw new Error("Il sistema di gestione NIS2 non è stato avviato per questa azienda");
  return s;
}

async function aziendaDelloStudio(tx: Tx, orgId: string, companyId: string) {
  const [a] = await tx
    .select({ id: company.id, nome: company.nome })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
  return a ?? null;
}

/** I controlli del catalogo, con lo stato dell'azienda, nella forma che il motore vuole. */
async function controlliDi(tx: Tx, orgId: string, companyId: string): Promise<Controllo[]> {
  const catalogo = await tx
    .select()
    .from(nis2Control)
    .where(eq(nis2Control.contentSetId, CONTENT_SET));
  const stati = new Map(
    (
      await tx
        .select()
        .from(nis2ControlState)
        .where(
          and(eq(nis2ControlState.companyId, companyId), eq(nis2ControlState.organizationId, orgId)),
        )
    ).map((s) => [s.controlKey, s]),
  );
  return catalogo
    .sort((a, b) => a.ordine - b.ordine)
    .map((c) => {
      const s = stati.get(c.key);
      return {
        id: c.key,
        capitolo: c.chapterKey,
        critico: c.critico,
        frequenza: c.frequenzaGiorni,
        // ⚠️ `"vuoto"` e non `null`: il motore distingue «nessuno l'ha guardato» dai
        // quattro stati dichiarabili, e quello non dichiarato pesa zero senza uscire dal
        // denominatore.
        stato: (s?.stato ?? "vuoto") as Controllo["stato"],
        ultimaVerifica: s?.ultimaVerifica ?? null,
      };
    });
}

export async function getSistema(
  userId: string,
  orgId: string,
  companyId: string,
  adesso = new Date(),
) {
  return withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) return null;

    const [sistema] = await tx
      .select()
      .from(nis2System)
      .where(and(eq(nis2System.companyId, companyId), eq(nis2System.organizationId, orgId)));
    if (!sistema) {
      // ⚠️ La forma del ritorno e' SEMPRE la stessa, anche quando il percorso non e'
      // stato aperto. Con due forme diverse ogni chiamante — la pagina, il documento, il
      // collaudo — dovrebbe distinguerle, e il compilatore glielo ricorderebbe solo dove
      // tocca un campo assente: un elenco vuoto e un elenco che non esiste si rendono
      // allo stesso modo, ma solo il primo non costringe a scriverlo.
      return {
        azienda,
        sistema: null,
        attuazione: 0,
        controlli: [],
        roadmap: {
          termini: { comunicazione: null, notifica: null, misure: null, registrazione: "" },
          giorni: { notifica: null, misure: null, registrazione: null },
          fasi: [],
        },
        indicatori: [],
      } as const;
    }

    const [profilo] = await tx
      .select()
      .from(nis2Profile)
      .where(and(eq(nis2Profile.companyId, companyId), eq(nis2Profile.organizationId, orgId)));

    const controlli = await controlliDi(tx, orgId, companyId);
    const dettagli = await tx
      .select()
      .from(nis2Control)
      .where(eq(nis2Control.contentSetId, CONTENT_SET));
    const nomi = new Map(dettagli.map((c) => [c.key, c]));
    const stati = new Map(
      (
        await tx
          .select()
          .from(nis2ControlState)
          .where(
            and(
              eq(nis2ControlState.companyId, companyId),
              eq(nis2ControlState.organizationId, orgId),
            ),
          )
      ).map((s) => [s.controlKey, s]),
    );

    const fasi = (
      await tx.select().from(nis2Phase).where(eq(nis2Phase.contentSetId, CONTENT_SET))
    ).sort((a, b) => a.ordine - b.ordine);
    const statiFase = new Map(
      (
        await tx
          .select()
          .from(nis2PhaseState)
          .where(
            and(eq(nis2PhaseState.companyId, companyId), eq(nis2PhaseState.organizationId, orgId)),
          )
      ).map((f) => [f.phaseKey, f]),
    );

    const indicatori = (
      await tx
        .select()
        .from(nis2Indicator)
        .where(and(eq(nis2Indicator.companyId, companyId), eq(nis2Indicator.organizationId, orgId)))
    ).sort((a, b) => a.ordine - b.ordine || a.codice.localeCompare(b.codice));
    const rilevazioni = await tx
      .select()
      .from(nis2IndicatorReading)
      .where(eq(nis2IndicatorReading.organizationId, orgId));

    const termini = terminiRoadmap(
      {
        comunicazione: profilo?.comunicazioneIl ?? null,
        mesiNotifica: sistema.mesiNotifica,
        mesiMisure: sistema.mesiMisure,
      },
      adesso,
    );

    return {
      azienda,
      sistema,
      attuazione: attuazione(controlli, adesso),
      controlli: controlli.map((c) => ({
        ...c,
        nome: nomi.get(c.id)?.nome ?? c.id,
        descrizione: nomi.get(c.id)?.descrizione ?? "",
        effettivo: statoEffettivo(c, adesso),
        prossima: prossimaVerifica(c),
        stato: stati.get(c.id) ?? null,
        dichiarato: c.stato,
      })),
      roadmap: {
        termini,
        giorni: {
          notifica: giorniA(termini.notifica, adesso),
          misure: giorniA(termini.misure, adesso),
          registrazione: giorniA(termini.registrazione, adesso),
        },
        fasi: fasi.map((f) => ({
          ...f,
          avanzamento: perFase({ id: f.key, aree: f.capitoli }, controlli, adesso),
          stato: statiFase.get(f.key) ?? null,
        })),
      },
      indicatori: indicatori.map((i) => {
        const sue = rilevazioni
          .filter((r) => r.indicatorId === i.id)
          .map((r) => ({ periodo: r.periodo, valore: r.valore == null ? null : Number(r.valore) }));
        const dato = {
          target: i.target == null ? null : Number(i.target),
          soglia: i.soglia == null ? null : Number(i.soglia),
          verso: i.verso,
          rilevazioni: sue,
        };
        return {
          ...i,
          rilevazioni: sue.sort((a, b) => a.periodo.localeCompare(b.periodo)),
          ultima: ultimaRilevazione(dato),
          statoCalcolato: statoIndicatore(dato),
          andamento: andamento(dato),
          scostamento: scostamento(dato),
        };
      }),
    } as const;
  });
}

// ───────────────────────────────────────────────────────────────── mutazioni

/**
 * Lo stato di UN controllo, UN campo per volta. Stessa regola dei requisiti.
 *
 * ⚠️ Il controllo deve esistere nel catalogo: una chiave inventata creerebbe una riga che
 * nessuna schermata mostra — la vista rende il catalogo — ma che la percentuale
 * d'attuazione conterebbe.
 */
export async function setCampoControllo(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof controlloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = controlloSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    if (!(await aziendaDelloStudio(tx, orgId, companyId))) throw new Error("Azienda non trovata");
    await pretendiSistema(tx, orgId, companyId);

    const [esiste] = await tx
      .select({ key: nis2Control.key })
      .from(nis2Control)
      .where(and(eq(nis2Control.contentSetId, CONTENT_SET), eq(nis2Control.key, v.controlKey)));
    if (!esiste) throw new Error(`Controllo «${v.controlKey}» sconosciuto`);

    await tx
      .insert(nis2ControlState)
      .values({ organizationId: orgId, companyId, controlKey: v.controlKey, [v.campo]: v.valore })
      .onConflictDoUpdate({
        target: [nis2ControlState.companyId, nis2ControlState.controlKey],
        set: { [v.campo]: v.valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.controllo.set",
      entita: "nis2_control_state",
      entitaId: `${companyId}:${v.controlKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

export async function setCampoFase(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof faseSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = faseSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    if (!(await aziendaDelloStudio(tx, orgId, companyId))) throw new Error("Azienda non trovata");
    await pretendiSistema(tx, orgId, companyId);

    const [esiste] = await tx
      .select({ key: nis2Phase.key })
      .from(nis2Phase)
      .where(and(eq(nis2Phase.contentSetId, CONTENT_SET), eq(nis2Phase.key, v.phaseKey)));
    if (!esiste) throw new Error(`Fase «${v.phaseKey}» sconosciuta`);

    await tx
      .insert(nis2PhaseState)
      .values({ organizationId: orgId, companyId, phaseKey: v.phaseKey, [v.campo]: v.valore })
      .onConflictDoUpdate({
        target: [nis2PhaseState.companyId, nis2PhaseState.phaseKey],
        set: { [v.campo]: v.valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.fase.set",
      entita: "nis2_phase_state",
      entitaId: `${companyId}:${v.phaseKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

export async function aggiornaRoadmap(
  userId: string,
  orgId: string,
  companyId: string,
  patch: z.input<typeof roadmapSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = roadmapSchema.parse(patch);

  await withTenant({ userId, orgId }, async (tx) => {
    if (!(await aziendaDelloStudio(tx, orgId, companyId))) throw new Error("Azienda non trovata");
    const sistema = await pretendiSistema(tx, orgId, companyId);
    await tx
      .update(nis2System)
      .set({ ...v, updatedAt: new Date() })
      .where(and(eq(nis2System.id, sistema.id), eq(nis2System.organizationId, orgId)));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.roadmap.set",
      entita: "nis2_system",
      entitaId: sistema.id,
    });
  });
}

/**
 * Copia nel sistema dell'azienda i 19 indicatori proposti dal catalogo.
 *
 * ⚠️ Si COPIANO, non si riferiscono. Un indicatore dello studio si modifica — il target
 * si tara sull'azienda, la formula si adatta al dato che quel cliente ha davvero — e un
 * riferimento al catalogo renderebbe quelle modifiche impossibili o le farebbe ricadere
 * su tutti. È la stessa scelta dei fattori di emissione a sovrapposizione.
 */
export async function caricaIndicatoriBase(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<number> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    if (!(await aziendaDelloStudio(tx, orgId, companyId))) throw new Error("Azienda non trovata");
    await pretendiSistema(tx, orgId, companyId);

    const base = (
      await tx.select().from(nis2IndicatorDef).where(eq(nis2IndicatorDef.contentSetId, CONTENT_SET))
    ).sort((a, b) => a.ordine - b.ordine);

    let aggiunti = 0;
    for (const d of base) {
      const righe = await tx
        .insert(nis2Indicator)
        .values({
          id: randomUUID(),
          organizationId: orgId,
          companyId,
          codice: d.key,
          nome: d.nome,
          ambito: d.ambito,
          tipo: d.tipo,
          formula: d.formula,
          unita: d.unita,
          frequenza: d.frequenza,
          target: d.target == null ? null : String(d.target),
          soglia: d.soglia == null ? null : String(d.soglia),
          verso: d.verso,
          ordine: d.ordine,
        })
        // ⚠️ Chi ne ha gia' uno con quel codice se lo tiene: rilanciare il caricamento non
        // deve sovrascrivere il target che il consulente ha tarato sull'azienda.
        .onConflictDoNothing({ target: [nis2Indicator.companyId, nis2Indicator.codice] })
        .returning({ id: nis2Indicator.id });
      aggiunti += righe.length;
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.indicatori.carica",
      entita: "nis2_indicator",
      entitaId: companyId,
      dettagli: { aggiunti },
    });
    return aggiunti;
  });
}

export async function creaIndicatore(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof nuovoIndicatoreSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoIndicatoreSchema.parse(input);

  return withTenant({ userId, orgId }, async (tx) => {
    if (!(await aziendaDelloStudio(tx, orgId, companyId))) throw new Error("Azienda non trovata");
    await pretendiSistema(tx, orgId, companyId);

    const id = randomUUID();
    const righe = await tx
      .insert(nis2Indicator)
      .values({ id, organizationId: orgId, companyId, codice: v.codice, nome: v.nome })
      .onConflictDoNothing({ target: [nis2Indicator.companyId, nis2Indicator.codice] })
      .returning({ id: nis2Indicator.id });
    if (!righe.length) throw new Error(`Esiste già un indicatore con il codice «${v.codice}»`);

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.indicatore.crea",
      entita: "nis2_indicator",
      entitaId: id,
    });
    return id;
  });
}

export async function setCampoIndicatore(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof campoIndicatoreSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoIndicatoreSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const aggiornate = await tx
      .update(nis2Indicator)
      .set({ [v.campo]: v.valore, updatedAt: new Date() })
      // ⚠️ Il filtro sull'organizzazione E sull'azienda sta nella UPDATE, non in una
      // lettura prima: fra la lettura e la scrittura ci sarebbe una finestra, e un
      // `.returning()` vuoto e' l'unico modo di sapere che non si e' toccato niente.
      .where(
        and(
          eq(nis2Indicator.id, v.id),
          eq(nis2Indicator.organizationId, orgId),
          eq(nis2Indicator.companyId, companyId),
        ),
      )
      .returning({ id: nis2Indicator.id });
    if (!aggiornate.length) throw new Error("Indicatore non trovato");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.indicatore.set",
      entita: "nis2_indicator",
      entitaId: v.id,
      dettagli: { campo: v.campo },
    });
  });
}

export async function setRilevazione(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof rilevazioneSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = rilevazioneSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [suo] = await tx
      .select({ id: nis2Indicator.id })
      .from(nis2Indicator)
      .where(
        and(
          eq(nis2Indicator.id, v.indicatorId),
          eq(nis2Indicator.organizationId, orgId),
          eq(nis2Indicator.companyId, companyId),
        ),
      );
    if (!suo) throw new Error("Indicatore non trovato");

    await tx
      .insert(nis2IndicatorReading)
      .values({
        organizationId: orgId,
        indicatorId: v.indicatorId,
        periodo: v.periodo,
        valore: v.valore,
        note: v.note ?? null,
      })
      .onConflictDoUpdate({
        target: [nis2IndicatorReading.indicatorId, nis2IndicatorReading.periodo],
        set: { valore: v.valore, note: v.note ?? null, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgnis2.rilevazione.set",
      entita: "nis2_indicator_reading",
      entitaId: `${v.indicatorId}:${v.periodo}`,
    });
  });
}

export { scadenze, statoTermine };
