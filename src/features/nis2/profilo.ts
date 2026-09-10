import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";

import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import {
  company,
  nis2Assessment,
  nis2Criterion,
  nis2Profile,
  nis2Requirement,
  nis2RequirementState,
  nis2Sector,
  nis2System,
} from "@/lib/db/schema";
import { classifica, sanzione, type Criterio, type Dimensione } from "@/lib/calc/nis2/ambito";
import {
  OBIETTIVO_PREDEFINITO,
  conformita,
  livelloMedio,
  perCapitolo,
  priorita,
  scostamenti,
  type Valutazione,
} from "@/lib/calc/nis2/conformita";
import { ambitoSchema, assettoSchema, requisitoSchema, type Perimetro } from "./validation";

// IL NUCLEO CONDIVISO DEI DUE PERCORSI NIS2.
//
// ⚠️ Il profilo e le risposte ai requisiti stanno QUI e non in uno dei due moduli, perche'
// sono gli stessi dati per tutti e due. Il settore, la dimensione e i criteri specifici di
// un'azienda non cambiano a seconda del percorso che si sta seguendo, e la risposta al
// requisito G.01 e' una sola: con due copie la stessa azienda potrebbe avere due
// classificazioni d'ambito, e da quella discendono gli obblighi e il tetto delle sanzioni.
//
// Il perimetro decide che cosa ciascun percorso MOSTRA, non che cosa esiste.

export const CONTENT_SET = "nis2-v1";

/** Il profilo esiste, oppure lo si crea. Lo apre il primo dei due percorsi. */
async function pretendiProfilo(tx: Tx, orgId: string, companyId: string) {
  const [gia] = await tx
    .select()
    .from(nis2Profile)
    .where(and(eq(nis2Profile.companyId, companyId), eq(nis2Profile.organizationId, orgId)));
  if (gia) return gia;

  const [nuovo] = await tx
    .insert(nis2Profile)
    .values({
      id: randomUUID(),
      organizationId: orgId,
      companyId,
      contentSetId: CONTENT_SET,
      obiettivo: OBIETTIVO_PREDEFINITO,
    })
    // ⚠️ Due percorsi possono aprirlo nello stesso istante: la corsa la chiude l'unique
    // sulla colonna, non un controllo applicativo. Chi perde rilegge.
    .onConflictDoNothing({ target: nis2Profile.companyId })
    .returning();
  if (nuovo) return nuovo;

  const [riletto] = await tx
    .select()
    .from(nis2Profile)
    .where(and(eq(nis2Profile.companyId, companyId), eq(nis2Profile.organizationId, orgId)));
  if (!riletto) throw new Error("Profilo NIS2 non creato");
  return riletto;
}

/** L'azienda dello studio, o niente. Il filtro sull'organizzazione e' ESPLICITO oltre a RLS. */
async function aziendaDelloStudio(tx: Tx, orgId: string, companyId: string) {
  const [a] = await tx
    .select({ id: company.id, nome: company.nome, settore: company.settore, sede: company.sede })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
  return a ?? null;
}

export type EsitoAmbito = ReturnType<typeof classifica> & {
  sanzione: ReturnType<typeof sanzione>;
};

/**
 * Il quadro condiviso: profilo, ambito calcolato, conformita'.
 *
 * ⚠️ NIENTE si persiste di cio' che si calcola. La classificazione d'ambito e' un derivato
 * di settore, dimensione e criteri: una colonna `classe` potrebbe restare indietro
 * rispetto ai suoi ingredienti e sarebbe indistinguibile da una classificazione corretta.
 * Si congela solo nello snapshot, al momento della pubblicazione.
 */
export async function getQuadro(
  userId: string,
  orgId: string,
  companyId: string,
  perimetro: Perimetro,
) {
  return withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) return null;

    const [profilo] = await tx
      .select()
      .from(nis2Profile)
      .where(and(eq(nis2Profile.companyId, companyId), eq(nis2Profile.organizationId, orgId)));

    const settori = await tx
      .select()
      .from(nis2Sector)
      .where(eq(nis2Sector.contentSetId, CONTENT_SET));
    const criteri = await tx
      .select()
      .from(nis2Criterion)
      .where(eq(nis2Criterion.contentSetId, CONTENT_SET));

    const allegati = {
      primo: settori.filter((s) => s.allegato === 1).map((s) => s.key),
      secondo: settori.filter((s) => s.allegato === 2).map((s) => s.key),
    };

    if (!profilo) {
      // ⚠️ La forma del ritorno e' SEMPRE la stessa, anche quando non c'e' niente. Con due
      // forme diverse ogni chiamante dovrebbe distinguerle, e il compilatore glielo
      // ricorderebbe solo dove usa un campo assente: un elenco vuoto e un elenco che non
      // esiste si rendono allo stesso modo, ma solo il primo non costringe a scriverlo.
      return {
        azienda,
        profilo: null,
        allegati,
        criteri,
        ambito: null,
        conformita: null,
        requisiti: [],
      } as const;
    }

    const esito = classifica(
      {
        settore: profilo.settore,
        dimensione: profilo.dimensione as Dimensione | null,
        criteri: profilo.criteri as Criterio[],
      },
      allegati,
    );
    const ambito: EsitoAmbito = { ...esito, sanzione: sanzione(esito.classe) };

    // I requisiti del PERIMETRO, e le risposte dell'azienda.
    const requisiti = (
      await tx.select().from(nis2Requirement).where(eq(nis2Requirement.contentSetId, CONTENT_SET))
    )
      .filter((r) => r.perimetri.includes(perimetro))
      .sort((a, b) => a.ordine - b.ordine);

    const risposte = new Map(
      (
        await tx
          .select()
          .from(nis2RequirementState)
          .where(
            and(
              eq(nis2RequirementState.companyId, companyId),
              eq(nis2RequirementState.organizationId, orgId),
            ),
          )
      ).map((r) => [r.requirementKey, r]),
    );

    const valutazione = (key: string): Valutazione => {
      const r = risposte.get(key);
      return { livello: r?.livello ?? null, nonApplicabile: r?.nonApplicabile ?? false };
    };

    const tutte = requisiti.map((r) => valutazione(r.key));
    const capitoli = [...new Set(requisiti.map((r) => r.chapterKey))];

    const obiettivo = profilo.obiettivo;
    const sotto = scostamenti(
      requisiti.map((r) => ({ id: r.key, critico: r.critico, valutazione: valutazione(r.key) })),
      obiettivo,
    );

    return {
      azienda,
      profilo,
      allegati,
      criteri,
      ambito,
      conformita: {
        obiettivo,
        percentuale: conformita(tutte),
        livelloMedio: livelloMedio(tutte),
        applicabili: tutte.filter((v) => !v.nonApplicabile).length,
        valutati: tutte.filter((v) => !v.nonApplicabile && v.livello != null).length,
        perCapitolo: perCapitolo(
          capitoli.map((c) => ({
            capitolo: c,
            valutazioni: requisiti.filter((r) => r.chapterKey === c).map((r) => valutazione(r.key)),
          })),
        ),
        scostamenti: sotto.map((r) => ({
          key: r.id,
          critico: r.critico,
          livello: r.valutazione.livello,
          priorita: priorita({ critico: r.critico, livello: r.valutazione.livello }, obiettivo),
        })),
      },
      requisiti: requisiti.map((r) => ({
        ...r,
        stato: risposte.get(r.key) ?? null,
      })),
    } as const;
  });
}

// ───────────────────────────────────────────────────────────────── mutazioni

export async function aggiornaAmbito(
  userId: string,
  orgId: string,
  companyId: string,
  patch: z.input<typeof ambitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = ambitoSchema.parse(patch);

  await withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) throw new Error("Azienda non trovata");
    const profilo = await pretendiProfilo(tx, orgId, companyId);

    await tx
      .update(nis2Profile)
      .set({
        ...(v.settore !== undefined ? { settore: v.settore } : {}),
        ...(v.dimensione !== undefined ? { dimensione: v.dimensione } : {}),
        ...(v.criteri !== undefined ? { criteri: v.criteri } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(nis2Profile.id, profilo.id), eq(nis2Profile.organizationId, orgId)));

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "nis2.ambito.set",
      entita: "nis2_profile",
      entitaId: profilo.id,
    });
  });
}

export async function aggiornaAssetto(
  userId: string,
  orgId: string,
  companyId: string,
  patch: z.input<typeof assettoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = assettoSchema.parse(patch);

  await withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) throw new Error("Azienda non trovata");
    const profilo = await pretendiProfilo(tx, orgId, companyId);

    await tx
      .update(nis2Profile)
      .set({ ...v, updatedAt: new Date() })
      .where(and(eq(nis2Profile.id, profilo.id), eq(nis2Profile.organizationId, orgId)));

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "nis2.assetto.set",
      entita: "nis2_profile",
      entitaId: profilo.id,
    });
  });
}

/**
 * La valutazione di UN requisito, UN campo per volta.
 *
 * ⚠️ Il client non manda mai la riga intera, e il valore precedente non lo conosce
 * nemmeno. E' la quinta volta che questo progetto scrive questa regola: ogni volta che
 * un client ha rimandato una riga letta da props stantie, salvare un campo ne ha azzerato
 * un altro — la quantita' dell'energetico, l'impatto della materialita', il contatto di
 * riferimento, le politiche del bilancio.
 *
 * ⚠️ E la risposta e' UNA per azienda: la chiave e' `(companyId, requirementKey)`, non
 * `(percorso, requirementKey)`. Chi risponde nell'autovalutazione ha risposto anche nel
 * sistema di gestione, e viceversa. E' il modo di rendere impossibile — per costruzione,
 * non per disciplina — che la stessa azienda abbia due risposte diverse alla stessa
 * domanda.
 */
export async function setCampoRequisito(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = requisitoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) throw new Error("Azienda non trovata");
    await pretendiProfilo(tx, orgId, companyId);

    // ⚠️ Il requisito deve esistere nel catalogo. Una chiave inventata creerebbe una riga
    // che nessuna schermata mostra — la vista rende il catalogo — ma che i conteggi
    // vedrebbero: una risposta fantasma che abbassa o alza la conformita' senza comparire.
    const [esiste] = await tx
      .select({ key: nis2Requirement.key })
      .from(nis2Requirement)
      .where(
        and(eq(nis2Requirement.contentSetId, CONTENT_SET), eq(nis2Requirement.key, v.requirementKey)),
      );
    if (!esiste) throw new Error(`Requisito «${v.requirementKey}» sconosciuto`);

    // ⚠️ Dichiarare «non applicabile» azzera il livello, e lo pretende anche un CHECK.
    // Un livello accanto a un «non applicabile» sarebbe un numero che nessuno usa: quel
    // requisito e' fuori dal denominatore, e chi legge la riga non saprebbe che farsene.
    const azzeraLivello = v.campo === "nonApplicabile" && v.valore === true;

    await tx
      .insert(nis2RequirementState)
      .values({
        organizationId: orgId,
        companyId,
        requirementKey: v.requirementKey,
        [v.campo]: v.valore,
        ...(azzeraLivello ? { livello: null } : {}),
      })
      .onConflictDoUpdate({
        target: [nis2RequirementState.companyId, nis2RequirementState.requirementKey],
        set: {
          [v.campo]: v.valore,
          ...(azzeraLivello ? { livello: null } : {}),
          updatedAt: new Date(),
        },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "nis2.requisito.set",
      entita: "nis2_requirement_state",
      entitaId: `${companyId}:${v.requirementKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

// ─────────────────────────────────────────── le radici dei due percorsi

/** La radice del percorso `nis2` (autovalutazione). Crea anche il profilo condiviso. */
export async function creaAutovalutazione(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) throw new Error("Azienda non trovata");
    await pretendiProfilo(tx, orgId, companyId);

    const [gia] = await tx
      .select()
      .from(nis2Assessment)
      .where(and(eq(nis2Assessment.companyId, companyId), eq(nis2Assessment.organizationId, orgId)));
    if (gia) return gia.id;

    const id = randomUUID();
    await tx
      .insert(nis2Assessment)
      .values({ id, organizationId: orgId, companyId, contentSetId: CONTENT_SET })
      .onConflictDoNothing({ target: nis2Assessment.companyId });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "nis2.autovalutazione.crea",
      entita: "nis2_assessment",
      entitaId: id,
    });
    return id;
  });
}

/** La radice del percorso `sgnis2` (sistema di gestione). Crea anche il profilo condiviso. */
export async function creaSistema(userId: string, orgId: string, companyId: string): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const azienda = await aziendaDelloStudio(tx, orgId, companyId);
    if (!azienda) throw new Error("Azienda non trovata");
    await pretendiProfilo(tx, orgId, companyId);

    const [gia] = await tx
      .select()
      .from(nis2System)
      .where(and(eq(nis2System.companyId, companyId), eq(nis2System.organizationId, orgId)));
    if (gia) return gia.id;

    const id = randomUUID();
    await tx
      .insert(nis2System)
      .values({ id, organizationId: orgId, companyId, contentSetId: CONTENT_SET })
      .onConflictDoNothing({ target: nis2System.companyId });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "nis2.sistema.crea",
      entita: "nis2_system",
      entitaId: id,
    });
    return id;
  });
}
