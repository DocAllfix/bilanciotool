"use server";

import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import { daErrore, type ActionEsito } from "@/features/esito";
import type { TipoDocumento } from "./tipi";
import {
  listSnapshots, publishBilancioSnapshot, publishEnergySnapshot, publishGhgSnapshot,
  publishSoaSnapshot, publishSupplierSnapshot,
} from "./snapshot";

export async function publishDocumentAction(
  companyId: string,
  tipo: TipoDocumento,
  anno: number,
): Promise<ActionEsito<{ snapshotId: string }>> {
  try {
    const s = await requireConsultant();
    // Switch esaustivo: un tipo nuovo senza funzione di pubblicazione non compila.
    const pubblica = (() => {
      switch (tipo) {
        case "ghg":
          return publishGhgSnapshot;
        case "bilancio":
          return publishBilancioSnapshot;
        case "energetico":
          return publishEnergySnapshot;
        case "soa":
          return (u: string, o: string, c: string) => publishSoaSnapshot(u, o, c);
        case "attestato":
          // Non ha esercizio: l'anno ricevuto è SENZA_ESERCIZIO e va scartato.
          return (u: string, o: string, c: string) => publishSupplierSnapshot(u, o, c);
        default: {
          const mai: never = tipo;
          throw new Error(`Tipo di documento non pubblicabile: ${String(mai)}`);
        }
      }
    })();
    const snapshotId = await pubblica(s.userId, s.orgId, companyId, anno);
    return { ok: true, dati: { snapshotId } };
  } catch (e) {
    return daErrore(e);
  }
}

export type SnapshotRiga = {
  id: string;
  tipo: TipoDocumento;
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
