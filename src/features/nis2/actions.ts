"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import {
  aggiornaAmbito,
  aggiornaAssetto,
  creaAutovalutazione,
  creaSistema,
  setCampoRequisito,
} from "./profilo";
import type { ambitoSchema, assettoSchema, requisitoSchema } from "./validation";

// Server action = endpoint HTTP: la validazione e l'entitlement vivono in `profilo.ts`.
// Qui la guardia di sessione e la traduzione dell'eccezione in un esito che il client sa
// leggere — mai un'eccezione nuda, che al browser arriverebbe come un errore di rete.
//
// ⚠️ DUE ROTTE DA RIVALIDARE, e non e' una svista. Profilo e risposte sono condivisi fra
// l'autovalutazione e il sistema di gestione: scrivendo da una parte cambia anche l'altra,
// e rivalidare una sola lascerebbe la seconda schermata a mostrare il numero di prima —
// che e' il difetto peggiore, perche' i due percorsi si aprono entrambi e nessuno saprebbe
// quale crede.

const rotte = (companyId: string) => [
  percorsoModulo(companyId, "nis2"),
  percorsoModulo(companyId, "sgnis2"),
];

function rivalida(companyId: string) {
  for (const r of rotte(companyId)) revalidatePath(r);
}

export async function creaAutovalutazioneAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaAutovalutazione(s.userId, s.orgId, companyId);
    rivalida(companyId);
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function creaSistemaNis2Action(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaSistema(s.userId, s.orgId, companyId);
    rivalida(companyId);
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaAmbitoAction(
  companyId: string,
  patch: z.input<typeof ambitoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaAmbito(s.userId, s.orgId, companyId, patch);
    rivalida(companyId);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaAssettoAction(
  companyId: string,
  patch: z.input<typeof assettoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaAssetto(s.userId, s.orgId, companyId, patch);
    rivalida(companyId);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoRequisitoAction(
  companyId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoRequisito(s.userId, s.orgId, companyId, input);
    rivalida(companyId);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
