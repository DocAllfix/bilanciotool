"use server";

import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import type { ActionEsito } from "@/features/companies/actions";
import { listSnapshots, publishBilancioSnapshot, publishGhgSnapshot } from "./snapshot";

function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  return { ok: false, errore: e instanceof Error ? e.message : "Operazione non riuscita" };
}

export async function publishDocumentAction(
  companyId: string,
  tipo: "ghg" | "bilancio",
  anno: number,
): Promise<ActionEsito<{ snapshotId: string }>> {
  try {
    const s = await requireConsultant();
    const snapshotId =
      tipo === "ghg"
        ? await publishGhgSnapshot(s.userId, s.orgId, companyId, anno)
        : await publishBilancioSnapshot(s.userId, s.orgId, companyId, anno);
    return { ok: true, dati: { snapshotId } };
  } catch (e) {
    return daErrore(e);
  }
}

export type SnapshotRiga = {
  id: string;
  tipo: "ghg" | "bilancio";
  anno: number;
  versione: number;
  pdfStorageKey: string | null;
  publishedAt: string;
};

export async function listSnapshotsAction(companyId: string): Promise<ActionEsito<SnapshotRiga[]>> {
  try {
    const s = await requireConsultant();
    const rows = await listSnapshots(s.userId, s.orgId, companyId);
    return {
      ok: true,
      dati: rows.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        anno: r.anno,
        versione: r.versione,
        pdfStorageKey: r.pdfStorageKey,
        publishedAt: r.publishedAt.toISOString(),
      })),
    };
  } catch (e) {
    return daErrore(e);
  }
}
