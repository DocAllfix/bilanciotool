import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, supplierAnswer, supplierAssessment } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import {
  profiloSchema, sogliaSchema, valutazioneSchema, RISPOSTE, STATI_AZIONE, STATI_DOCUMENTO,
  type ProfiloSupplier,
} from "./validation";
import type { z } from "zod";
import { latestSetId } from "@/features/content-set";

// Valutazioni fornitore: UNA per azienda.
//
// Non è un esercizio contabile ma la fotografia corrente della prontezza, che si
// aggiorna nel tempo; le revisioni consegnate al committente restano congelate
// negli attestati pubblicati, che formano una serie di versioni.

export async function latestSupplierSetId(): Promise<string> {
  return latestSetId("supplier", "Banca domande del modulo fornitori non disponibile");
}

export async function createAssessment(
  userId: string,
  orgId: string,
  input: z.input<typeof valutazioneSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = valutazioneSchema.parse(input);
  const setId = await latestSupplierSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(supplierAssessment).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      contentSetId: setId,
      sogliaRichiesta: v.sogliaRichiesta ?? 60,
    });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "supplier.valutazione.create",
      entita: "supplier_assessment",
      entitaId: id,
    });
  });
  return id;
}

export async function getAssessment(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(supplierAssessment)
      .where(eq(supplierAssessment.companyId, companyId));
    return row ?? null;
  });
}

/** Aggiornamento del profilo campo per campo: il client non manda mai l'oggetto
 *  completo, così due modifiche vicine non si sovrascrivono a vicenda. */
export async function updateProfilo(
  userId: string,
  orgId: string,
  assessmentId: string,
  patch: ProfiloSupplier,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select({ profilo: supplierAssessment.profilo })
      .from(supplierAssessment)
      .where(eq(supplierAssessment.id, assessmentId));
    if (!row) throw new Error("Valutazione inesistente o di un altro tenant");
    const aggiornato = { ...(row.profilo as ProfiloSupplier), ...v };
    await tx.update(supplierAssessment).set({ profilo: aggiornato }).where(eq(supplierAssessment.id, assessmentId));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "supplier.profilo.update",
      entita: "supplier_assessment",
      entitaId: assessmentId,
      dettagli: { campi: Object.keys(v) },
    });
  });
}

/** La soglia la fissa il committente, non il prodotto: cambia da bando a bando
 *  e il documento deve poterla dichiarare. */
export async function setSoglia(
  userId: string,
  orgId: string,
  assessmentId: string,
  soglia: number,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = sogliaSchema.parse(soglia);
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(supplierAssessment)
      .set({ sogliaRichiesta: v })
      .where(eq(supplierAssessment.id, assessmentId))
      .returning({ id: supplierAssessment.id });
    if (!agg.length) throw new Error("Valutazione inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "supplier.soglia.set",
      entita: "supplier_assessment",
      entitaId: assessmentId,
      dettagli: { soglia: v },
    });
  });
}

export async function listAnswers(userId: string, orgId: string, assessmentId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(supplierAnswer).where(eq(supplierAnswer.assessmentId, assessmentId)),
  );
}

/** Aggiornamento di UN SOLO campo della domanda.
 *
 *  Rispondere non deve cancellare la nota, e annotare non deve cancellare la
 *  risposta: il client manda chiave, campo e valore, e il resto della riga si
 *  legge dal database dentro la transazione. La riga sparisce solo quando tutti
 *  i suoi campi sono vuoti, così una domanda mai toccata non occupa spazio e non
 *  compare come "valutata". */
export async function setAnswerField(
  userId: string,
  orgId: string,
  assessmentId: string,
  questionKey: string,
  campo: "risposta" | "nota" | "statoDocumento" | "responsabile" | "scadenza" | "statoAzione",
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  // Il dominio si verifica QUI e non solo nell'azione: questa è la funzione che
  // tocca il database, e deve reggere anche se un domani la chiamasse un import
  // o uno script invece dell'interfaccia.
  const ammessi: Record<string, readonly string[]> = {
    risposta: RISPOSTE,
    statoDocumento: STATI_DOCUMENTO,
    statoAzione: STATI_AZIONE,
  };
  const dominio = ammessi[campo];
  if (valore !== null && dominio && !dominio.includes(valore)) {
    throw new Error(`Valore non ammesso per ${campo}: ${valore}`);
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const [a] = await tx
      .select({ id: supplierAssessment.id })
      .from(supplierAssessment)
      .where(eq(supplierAssessment.id, assessmentId));
    if (!a) throw new Error("Valutazione inesistente o di un altro tenant");

    const dove = and(
      eq(supplierAnswer.assessmentId, assessmentId),
      eq(supplierAnswer.questionKey, questionKey),
    );
    const [esistente] = await tx.select().from(supplierAnswer).where(dove);

    if (!esistente) {
      if (valore === null) return;
      await tx.insert(supplierAnswer).values({
        id: randomUUID(),
        organizationId: orgId,
        assessmentId,
        questionKey,
        [campo]: valore,
      });
    } else {
      const dopo = { ...esistente, [campo]: valore };
      const vuota =
        !dopo.risposta && !dopo.nota && !dopo.statoDocumento &&
        !dopo.responsabile && !dopo.scadenza && !dopo.statoAzione;
      if (vuota) {
        await tx.delete(supplierAnswer).where(eq(supplierAnswer.id, esistente.id));
      } else {
        await tx.update(supplierAnswer).set({ [campo]: valore }).where(eq(supplierAnswer.id, esistente.id));
      }
    }

    // L'audit registra la domanda e il campo, non il valore: una risposta "no"
    // è un dato dell'azienda, non un evento di sistema da conservare in chiaro.
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "supplier.risposta.set",
      entita: "supplier_answer",
      entitaId: assessmentId,
      dettagli: { domanda: questionKey, campo },
    });
  });
}
