"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import type { ActionEsito } from "@/features/companies/actions";
import { createAssessment, setAnswerField, setSoglia, updateProfilo } from "./assessments";
import { perColonna, rispostaSchema, type ProfiloSupplier } from "./validation";

// Confine server↔client del modulo fornitori. Nessuna eccezione nuda raggiunge
// il browser: ogni azione restituisce un esito.
//
// La rivalidazione è assente dalle azioni ad alta frequenza (le 37 domande, le
// note, il piano): si compila un questionario, non si naviga. Il ricalcolo
// avviene al cambio vista o con `ricalcolaAction`.

function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  if (e instanceof z.ZodError) return { ok: false, errore: e.issues[0]?.message ?? "Dati non validi" };
  return { ok: false, errore: e instanceof Error ? e.message : "Operazione non riuscita" };
}

const percorso = (companyId: string) => `/aziende/${companyId}/fornitore`;

export async function createAssessmentAction(input: {
  companyId: string;
  sogliaRichiesta?: number;
}): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await createAssessment(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateProfiloAction(
  assessmentId: string,
  patch: ProfiloSupplier,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateProfilo(s.userId, s.orgId, assessmentId, patch);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setSogliaAction(
  companyId: string,
  assessmentId: string,
  soglia: number,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setSoglia(s.userId, s.orgId, assessmentId, soglia);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Un campo per volta: rispondere non cancella la nota, annotare non cancella
 *  la risposta. Vale anche per i tre campi del piano d'azione. */
export async function setAnswerFieldAction(
  assessmentId: string,
  input: z.input<typeof rispostaSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    const v = rispostaSchema.parse(input);
    await setAnswerField(s.userId, s.orgId, assessmentId, v.questionKey, v.campo, perColonna(v.campo, v.valore));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Ricalcolo esplicito: l'unica azione che rilegge tutto il questionario. */
export async function ricalcolaAction(companyId: string): Promise<ActionEsito> {
  try {
    await requireConsultant();
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
