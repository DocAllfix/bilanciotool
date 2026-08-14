"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { createInventory, setBaseYear, updateBoundaries, updatePeriodMeta } from "./inventories";
import { setSourceState } from "./sources";
import { addActivityRow, copyRowsFromInventory, deleteActivityRow, duplicateActivityRow, updateActivityRow } from "./activity-data";
import { deleteOrgFactor, upsertOrgFactor } from "./factors";
import { addTarget, deleteTarget } from "./targets";
import { setChecklistState } from "./checklist";
import { importGhgFromJson, type GhgImportEsito } from "./import";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";

// Server actions del modulo GHG: sessione → funzioni F4. La revalidation è sul
// percorso dell'inventario: la pagina ricarica i risultati dal server (mai
// ricalcoli client: stessa fonte di verità).

// L'anno NON si passa, e resta come prima di proposito: questo modulo ha la
// sottopagina `[anno]` ma ha sempre rivalidato il percorso padre. Passarlo qui
// cambierebbe che cosa viene invalidato — invisibile oggi (le pagine sono
// `force-dynamic`), ma e' un cambio di comportamento e va deciso, non introdotto
// di straforo mentre si accorpa.
const percorso = (companyId: string) => percorsoModulo(companyId, "ghg");

export async function createInventoryAction(input: { companyId: string; anno: number; annoBase?: number }): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await createInventory(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateBoundariesAction(companyId: string, inventoryId: string, patch: Record<string, string>): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateBoundaries(s.userId, s.orgId, inventoryId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updatePeriodMetaAction(
  companyId: string,
  inventoryId: string,
  patch: { ricavi?: string | null; fte?: string | null; produzione?: string | null; umProduzione?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updatePeriodMeta(s.userId, s.orgId, inventoryId, patch);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setBaseYearAction(companyId: string, inventoryId: string, annoBase: number): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setBaseYear(s.userId, s.orgId, inventoryId, annoBase);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setSourceStateAction(
  companyId: string,
  inventoryId: string,
  input: { sourceTypeKey: string; stato: "in" | "out" | "na"; motivazione?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setSourceState(s.userId, s.orgId, inventoryId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export type RigaInput = Parameters<typeof addActivityRow>[3];

export async function addActivityRowAction(companyId: string, inventoryId: string, riga: RigaInput): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await addActivityRow(s.userId, s.orgId, inventoryId, riga);
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function updateActivityRowAction(companyId: string, rowId: string, riga: RigaInput): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await updateActivityRow(s.userId, s.orgId, rowId, riga);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function duplicateActivityRowAction(companyId: string, rowId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await duplicateActivityRow(s.userId, s.orgId, rowId);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function deleteActivityRowAction(companyId: string, rowId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await deleteActivityRow(s.userId, s.orgId, rowId);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function copyRowsAction(companyId: string, fromInventoryId: string, toInventoryId: string): Promise<ActionEsito<{ copiate: number }>> {
  try {
    const s = await requireConsultant();
    const copiate = await copyRowsFromInventory(s.userId, s.orgId, fromInventoryId, toInventoryId);
    revalidatePath(percorso(companyId));
    return { ok: true, dati: { copiate } };
  } catch (e) {
    return daErrore(e);
  }
}

export type FattoreInput = Parameters<typeof upsertOrgFactor>[2];

export async function upsertOrgFactorAction(companyId: string, input: FattoreInput): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await upsertOrgFactor(s.userId, s.orgId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function deleteOrgFactorAction(companyId: string, key: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await deleteOrgFactor(s.userId, s.orgId, key);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function addTargetAction(input: {
  companyId: string;
  nome: string;
  ambito: "1" | "2" | "12" | "3" | "tot";
  riduzionePct: string;
  annoTarget: number;
  note?: string;
}): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await addTarget(s.userId, s.orgId, input);
    revalidatePath(percorso(input.companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function deleteTargetAction(companyId: string, targetId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await deleteTarget(s.userId, s.orgId, targetId);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setChecklistStateAction(
  companyId: string,
  inventoryId: string,
  input: { requirementKey: string; stato: "ok" | "par" | "no"; nota?: string },
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setChecklistState(s.userId, s.orgId, inventoryId, input);
    revalidatePath(percorso(companyId));
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function importGhgAction(companyId: string, json: unknown): Promise<ActionEsito<GhgImportEsito>> {
  try {
    const s = await requireConsultant();
    const esito = await importGhgFromJson(s.userId, s.orgId, companyId, json);
    revalidatePath(percorso(companyId));
    revalidatePath("/dashboard");
    return { ok: true, dati: esito };
  } catch (e) {
    return daErrore(e);
  }
}
