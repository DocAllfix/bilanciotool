"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import {
  createDeclaration, setDecisionField, setModule, setRuoli, toggleMotivazione, updateProfilo,
} from "./declarations";
import { decisioneSchema, moduloSchema, motivazioneSchema, ruoliSchema, type ProfiloSoa } from "./validation";
import { daErrore, type ActionEsito } from "@/features/esito";

// Confine server↔client del modulo SoA.
//
// La rivalidazione è assente dalle azioni ad alta frequenza (174 controlli, con
// stato, motivazioni, documento e responsabile ciascuno): si compila un
// registro, non si naviga. Il ricalcolo avviene al cambio vista o con
// `ricalcolaAction`. L'attivazione di un modulo invece rivalida: cambia
// l'ambito, cioè quali controlli esistono.

const percorso = (companyId: string) => `/aziende/${companyId}/soa`;

export async function createDeclarationAction(input: {
  companyId: string;
  sogliaObiettivo?: number;
  ruoloPrivacy?: "titolare" | "responsabile" | "entrambi" | "nessuno";
  ruoloCloud?: "cliente" | "fornitore" | "entrambi" | "nessuno";
}): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await createDeclaration(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateProfiloAction(declarationId: string, patch: ProfiloSoa): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateProfilo(s.userId, s.orgId, declarationId, patch);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Ruoli e obiettivo: da questi dipendono gli avvisi sui moduli da attivare,
 *  quindi la pagina si rivalida. */
export async function setRuoliAction(
  companyId: string,
  declarationId: string,
  patch: z.input<typeof ruoliSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setRuoli(s.userId, s.orgId, declarationId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Attivare un modulo cambia l'AMBITO: quali controlli la Dichiarazione deve
 *  elencare. La pagina va rivalidata, ed è un'azione rara. */
export async function setModuleAction(
  companyId: string,
  declarationId: string,
  input: z.input<typeof moduloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setModule(s.userId, s.orgId, declarationId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setDecisionFieldAction(
  declarationId: string,
  input: z.input<typeof decisioneSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    const v = decisioneSchema.parse(input);
    const valore = v.valore.trim() === "" ? null : v.valore.trim();
    await setDecisionField(s.userId, s.orgId, declarationId, v.frameworkKey, v.controlloId, v.campo, valore);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function toggleMotivazioneAction(
  declarationId: string,
  input: z.input<typeof motivazioneSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await toggleMotivazione(s.userId, s.orgId, declarationId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function ricalcolaAction(companyId: string): Promise<ActionEsito> {
  try {
    await requireConsultant();
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
