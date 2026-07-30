"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import { z } from "zod";
import type { ActionEsito } from "@/features/companies/actions";
import { createReportProject, setCompanyImage, setSoglia, updateProfilo, updateStandardEPerimetro } from "./projects";
import { setTopicScoreField, getAtecoSuggestions } from "./materiality";
import { setKpiValue } from "./kpi";
import { setTopicManagement } from "./policies";
import { addMedia, removeMedia, saveChapter, updateMedia } from "./chapters";
import { importBilancioFromJson, type BilancioImportEsito } from "./import";
import { latestContentSetId } from "@/features/ghg/inventories";

function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  if (e instanceof z.ZodError) return { ok: false, errore: e.issues[0]?.message ?? "Dati non validi" };
  return { ok: false, errore: e instanceof Error ? e.message : "Operazione non riuscita" };
}

const percorso = (companyId: string) => `/aziende/${companyId}/bilancio`;

export async function createReportProjectAction(input: { companyId: string; anno: number }): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await createReportProject(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateProfiloAction(companyId: string, projectId: string, patch: Record<string, string>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateProfilo(s.userId, s.orgId, projectId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateImpostazioniAction(
  companyId: string,
  projectId: string,
  patch: { standard?: string; perimetro?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateStandardEPerimetro(s.userId, s.orgId, projectId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCompanyImageAction(companyId: string, tipo: "logo" | "cover", dataUrl: string | null): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCompanyImage(s.userId, s.orgId, companyId, tipo, dataUrl);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setSogliaAction(companyId: string, projectId: string, soglia: number): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setSoglia(s.userId, s.orgId, projectId, soglia);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setTopicScoreFieldAction(
  companyId: string,
  projectId: string,
  input: { topicKey: string; campo: "imp" | "fin"; valore: number | null },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setTopicScoreField(s.userId, s.orgId, projectId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function getAtecoSuggestionsAction(ateco: string): Promise<ActionEsito<{ macroSettore: string; descrizione: string; punteggi: Record<string, { imp: number; fin: number }> } | null>> {
  try {
    await requireConsultant();
    const setId = await latestContentSetId("report");
    const s = await getAtecoSuggestions(ateco, setId);
    return {
      ok: true,
      dati: s ? { macroSettore: s.macroSettore, descrizione: s.descrizione, punteggi: s.punteggi as Record<string, { imp: number; fin: number }> } : null,
    };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setKpiValueAction(
  companyId: string,
  input: { kpiKey: string; anno: number; valore: string | null },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setKpiValue(s.userId, s.orgId, companyId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setTopicManagementAction(
  companyId: string,
  projectId: string,
  input: { topicKey: string; politica?: string; azioni?: string; target?: string; annoBase?: string; annoTarget?: string; responsabile?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setTopicManagement(s.userId, s.orgId, projectId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function saveChapterAction(companyId: string, projectId: string, templateKey: string, contenuto: unknown): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await saveChapter(s.userId, s.orgId, projectId, templateKey, contenuto);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function addMediaAction(
  companyId: string,
  projectId: string,
  templateKey: string,
  input: { tipo: "img" | "chart"; chartKey?: string; dataUrl?: string; didascalia?: string; credito?: string; larghezza?: "full" | "half" },
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await addMedia(s.userId, s.orgId, projectId, templateKey, input as Parameters<typeof addMedia>[4]);
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
  patch: { didascalia?: string; credito?: string; larghezza?: "full" | "half"; posizione?: number },
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

export async function importBilancioAction(companyId: string, json: unknown): Promise<ActionEsito<BilancioImportEsito>> {
  try {
    const s = await requireConsultant();
    const esito = await importBilancioFromJson(s.userId, s.orgId, companyId, json);
    revalidatePath(percorso(companyId));
    revalidatePath("/dashboard");
    return { ok: true, dati: esito };
  } catch (e) {
    return daErrore(e);
  }
}
