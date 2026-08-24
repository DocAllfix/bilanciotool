"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaProfilo,
  creaPartner,
  creaProgramma,
  eliminaPartner,
  setCampoPartner,
  setFlag,
  setPunteggio,
} from "./programma";
import type {
  campoPartnerSchema,
  flagSchema,
  partnerNuovoSchema,
  profiloSchema,
  punteggioSchema,
} from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP: la validazione vive in `programma.ts`.

const rotta = (companyId: string) => percorsoModulo(companyId, "filiera");

export async function creaProgrammaAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaProgramma(s.userId, s.orgId, { companyId });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaProfiloAction(
  companyId: string,
  programId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, programId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function creaPartnerAction(
  companyId: string,
  programId: string,
  input: z.input<typeof partnerNuovoSchema>,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaPartner(s.userId, s.orgId, programId, input);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoPartnerAction(
  companyId: string,
  partnerId: string,
  input: z.input<typeof campoPartnerSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoPartner(s.userId, s.orgId, partnerId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaPartnerAction(companyId: string, partnerId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaPartner(s.userId, s.orgId, partnerId);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setPunteggioAction(
  companyId: string,
  partnerId: string,
  input: z.input<typeof punteggioSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setPunteggio(s.userId, s.orgId, partnerId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setFlagAction(
  companyId: string,
  partnerId: string,
  input: z.input<typeof flagSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setFlag(s.userId, s.orgId, partnerId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
