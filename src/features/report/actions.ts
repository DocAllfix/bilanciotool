"use server";

import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { reportProject } from "@/lib/db/schema";
import { requireEntitlement } from "@/features/entitlement";
import { proponiMaterialita } from "./materiality";

import { requirePercorso } from "@/features/auth/percorsi";
import { revalidatePath } from "next/cache";
import { createReportProject, setSoglia, updateProfilo, updateStandardEPerimetro } from "./projects";
import { setTopicScoreField, getAtecoSuggestions } from "./materiality";
import { setKpiValue } from "./kpi";
import { setTopicManagement, setTopicManagementField, type CampoGestione } from "./policies";
import { addMedia, removeMedia, saveChapter, updateMedia } from "./chapters";
import { importBilancioFromJson, type BilancioImportEsito } from "./import";
import { latestContentSetId } from "@/features/ghg/inventories";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";

// L'anno NON si passa, e resta come prima di proposito: questo modulo ha la
// sottopagina `[anno]` ma ha sempre rivalidato il percorso padre. Passarlo qui
// cambierebbe che cosa viene invalidato — invisibile oggi (le pagine sono
// `force-dynamic`), ma e' un cambio di comportamento e va deciso, non introdotto
// di straforo mentre si accorpa.
const percorso = (companyId: string) => percorsoModulo(companyId, "bilancio");

export async function createReportProjectAction(input: { companyId: string; anno: number }): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requirePercorso("bilancio");
    const id = await createReportProject(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateProfiloAction(companyId: string, projectId: string, patch: Record<string, string>): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
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
  // `unknown` di proposito: il tipo del browser non è una garanzia, lo è lo schema che
  // `updateStandardEPerimetro` applica.
  patch: unknown,
): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
    await updateStandardEPerimetro(s.userId, s.orgId, projectId, patch as never);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setSogliaAction(companyId: string, projectId: string, soglia: number): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
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
    const s = await requirePercorso("bilancio");
    await setTopicScoreField(s.userId, s.orgId, projectId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function getAtecoSuggestionsAction(ateco: string): Promise<ActionEsito<{ macroSettore: string; descrizione: string; punteggi: Record<string, { imp: number; fin: number }> } | null>> {
  try {
    await requirePercorso("bilancio");
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
    const s = await requirePercorso("bilancio");
    await setKpiValue(s.userId, s.orgId, companyId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

/**
 * ⚠️ UN CAMPO PER VOLTA, ed e' la forma che il client deve usare.
 *
 * `setTopicManagementAction` scrive tutti e sei i campi con quello che riceve: chiamata
 * con una riga letta da props stantie, cancella cio' che e' stato salvato un istante
 * prima. Resta perche' la usa l'import del prototipo, che la riga intera ce l'ha davvero.
 */
export async function setTopicManagementFieldAction(
  companyId: string,
  projectId: string,
  input: { topicKey: string; campo: CampoGestione; valore: string },
): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
    await setTopicManagementField(s.userId, s.orgId, projectId, input);
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
    const s = await requirePercorso("bilancio");
    await setTopicManagement(s.userId, s.orgId, projectId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function saveChapterAction(companyId: string, projectId: string, templateKey: string, contenuto: unknown): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
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
    const s = await requirePercorso("bilancio");
    const id = await addMedia(s.userId, s.orgId, projectId, templateKey, input as Parameters<typeof addMedia>[4]);
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function removeMediaAction(companyId: string, mediaId: string): Promise<ActionEsito> {
  try {
    const s = await requirePercorso("bilancio");
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
    const s = await requirePercorso("bilancio");
    await updateMedia(s.userId, s.orgId, mediaId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function importBilancioAction(companyId: string, json: unknown): Promise<ActionEsito<BilancioImportEsito>> {
  try {
    const s = await requirePercorso("bilancio");
    const esito = await importBilancioFromJson(s.userId, s.orgId, companyId, json);
    revalidatePath(percorso(companyId));
    revalidatePath("/dashboard");
    return { ok: true, dati: esito };
  } catch (e) {
    return daErrore(e);
  }
}

/**
 * Applica la materialità tipica del codice ATECO del progetto ai temi ancora vuoti (o
 * aggiorna quelle già proposte e non toccate). Il consulente le conferma toccandole.
 */
export async function applicaPropostaMaterialitaAction(companyId: string, projectId: string): Promise<ActionEsito<{ inserite: number }>> {
  try {
    const s = await requirePercorso("bilancio");
    await requireEntitlement(s.userId, s.orgId, "write_data");
    const esito = await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
      const [p] = await tx
        .select({ profilo: reportProject.profilo })
        .from(reportProject)
        .where(and(eq(reportProject.id, projectId), eq(reportProject.organizationId, s.orgId)))
        .limit(1);
      if (!p) throw new Error("Progetto inesistente o di un altro tenant");
      const ateco = (p.profilo as Record<string, string | undefined>).ateco;
      if (!ateco?.trim()) throw new Error("Compila il codice ATECO al passo 1 per avere una proposta di partenza.");
      return proponiMaterialita(tx, s.userId, s.orgId, projectId, ateco);
    });
    if (!esito.inserite) throw new Error("Nessuna proposta curata per questo settore, oppure tutti i temi sono già valutati: valutali con le guide.");
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { inserite: esito.inserite } };
  } catch (e) {
    return daErrore(e);
  }
}
