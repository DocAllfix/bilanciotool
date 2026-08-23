"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaProfilo, aggiungiScenario, creaModello, creaProcesso, eliminaProcesso,
  eliminaScenario, setApplicabilita, setCampoProcesso, setCampoRequisito, setCampoScenario,
} from "./modello";
import type { applicabilitaSchema, campoProcessoSchema, campoScenarioSchema, profiloSchema, requisitoSchema } from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP: i tipi TypeScript non esistono a runtime, quindi la
// validazione vive in `modello.ts`. Qui solo la guardia di sessione e la traduzione
// dell'eccezione in un esito che il client sa leggere.

const rotta = (companyId: string) => percorsoModulo(companyId, "mog231");

export async function creaModelloAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaModello(s.userId, s.orgId, { companyId });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function aggiornaProfiloAction(companyId: string, modelId: string, patch: z.input<typeof profiloSchema>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, modelId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function creaProcessoAction(companyId: string, modelId: string, nome: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaProcesso(s.userId, s.orgId, modelId, { nome });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function setCampoProcessoAction(companyId: string, processId: string, input: z.input<typeof campoProcessoSchema>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoProcesso(s.userId, s.orgId, processId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaProcessoAction(companyId: string, processId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaProcesso(s.userId, s.orgId, processId);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function aggiungiScenarioAction(companyId: string, processId: string, crimeKey: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await aggiungiScenario(s.userId, s.orgId, processId, crimeKey);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function setCampoScenarioAction(companyId: string, scenarioId: string, input: z.input<typeof campoScenarioSchema>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoScenario(s.userId, s.orgId, scenarioId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaScenarioAction(companyId: string, scenarioId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaScenario(s.userId, s.orgId, scenarioId);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setApplicabilitaAction(companyId: string, modelId: string, input: z.input<typeof applicabilitaSchema>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setApplicabilita(s.userId, s.orgId, modelId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setCampoRequisitoAction(companyId: string, modelId: string, input: z.input<typeof requisitoSchema>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoRequisito(s.userId, s.orgId, modelId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}
