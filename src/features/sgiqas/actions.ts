"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaProfilo,
  caricaIndicatoriBase,
  creaIndicatore,
  creaSistema,
  eliminaIndicatore,
  eliminaRilevazione,
  setCampoIndicatore,
  setCampoRequisito,
  setNorme,
  setRilevazione,
} from "./sistema";
import type {
  campoIndicatoreSchema,
  normeSchema,
  nuovoIndicatoreSchema,
  profiloSchema,
  requisitoSchema,
  rilevazioneSchema,
} from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP: la validazione vive in `sistema.ts`. Qui la guardia di
// sessione e la traduzione dell'eccezione in un esito che il client sa leggere.

const rotta = (companyId: string) => percorsoModulo(companyId, "sgiqas");

export async function creaSistemaAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaSistema(s.userId, s.orgId, { companyId });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function aggiornaProfiloAction(
  companyId: string,
  systemId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, systemId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setNormeAction(
  companyId: string,
  systemId: string,
  norme: z.input<typeof normeSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setNorme(s.userId, s.orgId, systemId, norme);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setCampoRequisitoAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoRequisito(s.userId, s.orgId, systemId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function creaIndicatoreAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof nuovoIndicatoreSchema>,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaIndicatore(s.userId, s.orgId, systemId, input);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function caricaIndicatoriBaseAction(
  companyId: string,
  systemId: string,
): Promise<ActionEsito<{ aggiunti: number }>> {
  try {
    const s = await requireConsultant();
    const dati = await caricaIndicatoriBase(s.userId, s.orgId, systemId);
    revalidatePath(rotta(companyId));
    return { ok: true, dati };
  } catch (e) { return daErrore(e); }
}

export async function setCampoIndicatoreAction(
  companyId: string,
  indicatorId: string,
  input: z.input<typeof campoIndicatoreSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoIndicatore(s.userId, s.orgId, indicatorId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaIndicatoreAction(companyId: string, indicatorId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaIndicatore(s.userId, s.orgId, indicatorId);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setRilevazioneAction(
  companyId: string,
  input: z.input<typeof rilevazioneSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setRilevazione(s.userId, s.orgId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaRilevazioneAction(
  companyId: string,
  indicatorId: string,
  periodo: string,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaRilevazione(s.userId, s.orgId, indicatorId, periodo);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}
