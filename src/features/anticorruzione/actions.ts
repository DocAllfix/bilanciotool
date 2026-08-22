"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaProfilo,
  creaSistema,
  creaSocio,
  eliminaSocio,
  setCampoRequisito,
  setCampoSocio,
} from "./sistema";
import type { campoSocioSchema, profiloSchema, requisitoSchema } from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP. I tipi TypeScript non esistono a runtime, quindi
// l'input si valida SEMPRE con zod dentro le funzioni di `sistema.ts`: qui si fa solo
// la guardia di sessione e si traduce l'eccezione in un esito che il client sa leggere.
//
// Al client non arriva mai un'eccezione nuda: `{ok:true}` oppure `{ok:false, errore}`.

export async function creaSistemaAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaSistema(s.userId, s.orgId, { companyId });
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaProfiloAction(
  companyId: string,
  systemId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, systemId, patch);
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function creaSocioAction(
  companyId: string,
  systemId: string,
  nome: string,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaSocio(s.userId, s.orgId, systemId, { nome });
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoSocioAction(
  companyId: string,
  socioId: string,
  input: z.input<typeof campoSocioSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoSocio(s.userId, s.orgId, socioId, input);
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaSocioAction(companyId: string, socioId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaSocio(s.userId, s.orgId, socioId);
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoRequisitoAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoRequisito(s.userId, s.orgId, systemId, input);
    revalidatePath(percorsoModulo(companyId, "anticorruzione"));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
