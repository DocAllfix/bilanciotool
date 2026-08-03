"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import type { ActionEsito } from "@/features/companies/actions";
import { createBalance, setAnnoBase, updateProfilo } from "./balances";
import { deleteCompanyFactor, setMonthlyValue, setVectorInput, upsertCompanyFactor } from "./vectors";
import { setAllocation, setEndUseState, setStima } from "./allocation";
import { setDriverValue } from "./drivers";
import { addMeasure, deleteMeasure, updateMeasure } from "./measures";
import { addMedia, removeMedia, saveChapter, updateMedia } from "./narrative";
import { fattoreCompanySchema, type ProfiloEnergetico } from "./validation";

// Confine server↔client del modulo energetico. Nessuna eccezione nuda raggiunge
// il browser: ogni azione restituisce un esito, e l'interfaccia decide come dirlo.
//
// La rivalidazione è DELIBERATAMENTE assente dalle azioni ad alta frequenza
// (celle della matrice, mesi, variabili, campi degli interventi): con fino a
// duecentoventi celle, un revalidatePath per ogni uscita dal campo produrrebbe
// decine di ricalcoli mentre si compila. Il ricalcolo avviene al cambio passo o
// su richiesta esplicita, con `ricalcolaAction`.

function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  if (e instanceof z.ZodError) return { ok: false, errore: e.issues[0]?.message ?? "Dati non validi" };
  return { ok: false, errore: e instanceof Error ? e.message : "Operazione non riuscita" };
}

const percorso = (companyId: string) => `/aziende/${companyId}/energetico`;

export async function createBalanceAction(input: {
  companyId: string;
  anno: number;
  annoBase?: number;
}): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await createBalance(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateProfiloAction(
  companyId: string,
  balanceId: string,
  patch: ProfiloEnergetico,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateProfilo(s.userId, s.orgId, balanceId, patch);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setAnnoBaseAction(
  companyId: string,
  balanceId: string,
  annoBase: number,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setAnnoBase(s.userId, s.orgId, balanceId, annoBase);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setVectorInputAction(
  balanceId: string,
  input: { vettoreKey: string; quantita?: string; costo?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setVectorInput(s.userId, s.orgId, balanceId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setMonthlyValueAction(
  balanceId: string,
  input: { vettoreKey: string; mese: number; valore: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setMonthlyValue(s.userId, s.orgId, balanceId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function upsertCompanyFactorAction(
  companyId: string,
  input: z.input<typeof fattoreCompanySchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    const v = fattoreCompanySchema.parse(input);
    await upsertCompanyFactor(s.userId, s.orgId, companyId, v);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function deleteCompanyFactorAction(companyId: string, key: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await deleteCompanyFactor(s.userId, s.orgId, companyId, key);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Una sola cella della matrice. Valore vuoto = la cella si svuota davvero. */
export async function setAllocationAction(
  balanceId: string,
  input: { usoKey: string; vettoreKey: string; quantita: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setAllocation(s.userId, s.orgId, balanceId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setEndUseStateAction(
  companyId: string,
  balanceId: string,
  input: { usoKey: string; attivo?: boolean; metodo?: "mis" | "cal" | "sti" | null; nota?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setEndUseState(s.userId, s.orgId, balanceId, input);
    // Accendere o spegnere un uso cambia le righe della matrice: qui la
    // rivalidazione serve, ed è un'azione rara.
    if (input.attivo !== undefined) revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setStimaAction(
  balanceId: string,
  input: {
    usoKey: string;
    stimaVettoreKey?: string;
    stimaKw?: string;
    stimaOre?: string;
    stimaFattoreCarico?: string;
  },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setStima(s.userId, s.orgId, balanceId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setDriverValueAction(
  companyId: string,
  input: { anno: number; driverKey: string; valore: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setDriverValue(s.userId, s.orgId, companyId, input);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function addMeasureAction(
  companyId: string,
  balanceId: string,
  input: { descrizione?: string; vettoreKey: string },
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await addMeasure(s.userId, s.orgId, balanceId, input);
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateMeasureAction(
  measureId: string,
  patch: {
    descrizione?: string;
    vettoreKey?: string;
    quantita?: string;
    investimento?: string;
    incentivo?: string;
    usoKey?: string | null;
    stato?: "proposto" | "valutato" | "approvato" | "in_corso" | "realizzato" | "scartato";
    annoPrevisto?: number | null;
    note?: string | null;
  },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateMeasure(s.userId, s.orgId, measureId, patch);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function deleteMeasureAction(companyId: string, measureId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await deleteMeasure(s.userId, s.orgId, measureId);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function saveChapterAction(
  balanceId: string,
  templateKey: string,
  contenuto: unknown,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await saveChapter(s.userId, s.orgId, balanceId, templateKey, contenuto);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function addMediaAction(
  companyId: string,
  balanceId: string,
  templateKey: string,
  input: {
    tipo: "img" | "chart";
    storageKey?: string | null;
    chartKey?: string | null;
    didascalia?: string | null;
    larghezza?: "piena" | "meta";
  },
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await addMedia(s.userId, s.orgId, balanceId, templateKey, input);
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function removeMediaAction(companyId: string, mediaId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await removeMedia(s.userId, s.orgId, mediaId);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateMediaAction(
  companyId: string,
  mediaId: string,
  patch: { didascalia?: string | null; credito?: string | null; larghezza?: "piena" | "meta"; posizione?: number },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateMedia(s.userId, s.orgId, mediaId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/** Ricalcolo esplicito: è l'unica azione che rilegge tutto il percorso, ed è
 *  quella che le azioni ad alta frequenza deliberatamente non fanno. */
export async function ricalcolaAction(companyId: string): Promise<ActionEsito> {
  try {
    await requireConsultant();
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
