"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaProfilo,
  creaAssetto,
  creaCanale,
  creaFascicolo,
  eliminaCanale,
  eliminaFascicolo,
  setCampoCanale,
  setCampoFascicolo,
  setCampoRequisito,
} from "./sistema";
import type {
  campoCanaleSchema,
  campoFascicoloSchema,
  nuovoCanaleSchema,
  nuovoFascicoloSchema,
  profiloAssettoSchema,
  requisitoSchema,
} from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP: i tipi TypeScript non esistono a runtime, quindi la
// validazione vive in `sistema.ts`. Qui solo la guardia di sessione e la traduzione
// dell'eccezione in un esito che il client sa leggere.

const rotta = (companyId: string) => percorsoModulo(companyId, "segnalazioni");

export async function creaAssettoAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaAssetto(s.userId, s.orgId, { companyId });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function aggiornaProfiloAction(
  companyId: string,
  systemId: string,
  patch: z.input<typeof profiloAssettoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, systemId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function creaCanaleAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof nuovoCanaleSchema>,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaCanale(s.userId, s.orgId, systemId, input);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function setCampoCanaleAction(
  companyId: string,
  canaleId: string,
  input: z.input<typeof campoCanaleSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoCanale(s.userId, s.orgId, canaleId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaCanaleAction(companyId: string, canaleId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaCanale(s.userId, s.orgId, canaleId);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function creaFascicoloAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof nuovoFascicoloSchema>,
): Promise<ActionEsito<{ id: string; numero: number }>> {
  try {
    const s = await requireConsultant();
    const dati = await creaFascicolo(s.userId, s.orgId, systemId, input);
    revalidatePath(rotta(companyId));
    return { ok: true, dati };
  } catch (e) { return daErrore(e); }
}

export async function setCampoFascicoloAction(
  companyId: string,
  reportId: string,
  input: z.input<typeof campoFascicoloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoFascicolo(s.userId, s.orgId, reportId, input);
    // ⚠️ Si rivalida la pagina del FASCICOLO, non quella del modulo: `/segnalazioni` non
    // invalida `/segnalazioni/fascicolo/<id>`. È lo stesso difetto già pagato
    // sull'energetico, dove `/aziende/X/energetico` non invalidava l'esercizio.
    revalidatePath(`${rotta(companyId)}/fascicolo/${reportId}`);
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaFascicoloAction(companyId: string, reportId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaFascicolo(s.userId, s.orgId, reportId);
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
