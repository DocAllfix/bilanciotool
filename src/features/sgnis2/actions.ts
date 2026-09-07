"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaRoadmap,
  caricaIndicatoriBase,
  creaIndicatore,
  setCampoControllo,
  setCampoFase,
  setCampoIndicatore,
  setRilevazione,
} from "./sistema";
import type {
  campoIndicatoreSchema,
  controlloSchema,
  faseSchema,
  nuovoIndicatoreSchema,
  rilevazioneSchema,
  roadmapSchema,
} from "@/features/nis2/validation";

// Le azioni del solo sistema di gestione: controlli, roadmap, indicatori.
//
// ⚠️ Qui basta rivalidare UNA rotta, al contrario di `features/nis2/actions.ts`: controlli,
// fasi e indicatori esistono solo in questo percorso, e l'autovalutazione non li mostra.
// Rivalidare anche l'altra sarebbe un viaggio per niente.

const rotta = (companyId: string) => percorsoModulo(companyId, "sgnis2");

export async function setCampoControlloAction(
  companyId: string,
  input: z.input<typeof controlloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoControllo(s.userId, s.orgId, companyId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoFaseAction(
  companyId: string,
  input: z.input<typeof faseSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoFase(s.userId, s.orgId, companyId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaRoadmapAction(
  companyId: string,
  patch: z.input<typeof roadmapSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaRoadmap(s.userId, s.orgId, companyId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function caricaIndicatoriBaseAction(
  companyId: string,
): Promise<ActionEsito<{ aggiunti: number }>> {
  try {
    const s = await requireConsultant();
    const aggiunti = await caricaIndicatoriBase(s.userId, s.orgId, companyId);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { aggiunti } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function creaIndicatoreAction(
  companyId: string,
  input: z.input<typeof nuovoIndicatoreSchema>,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaIndicatore(s.userId, s.orgId, companyId, input);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoIndicatoreAction(
  companyId: string,
  input: z.input<typeof campoIndicatoreSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoIndicatore(s.userId, s.orgId, companyId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setRilevazioneAction(
  companyId: string,
  input: z.input<typeof rilevazioneSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setRilevazione(s.userId, s.orgId, companyId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
