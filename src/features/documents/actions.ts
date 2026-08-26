"use server";

import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import type { TipoDocumento } from "./tipi";
import {
  listSnapshots, publishBilancioSnapshot, publishEnergySnapshot, publishGhgSnapshot,
  publishSoaSnapshot, publishSupplierSnapshot,
  publishRelazionePcSnapshot, publishMatricePcSnapshot,
  publishMatrice231Snapshot, publishRelazioneOdvSnapshot,
  publishRelazioneWbSnapshot,
  publishRiesameQasSnapshot,
  publishManualeSa8000Snapshot,
  publishDichiarazioneFilieraSnapshot,
  publishSgesgSnapshot,
  publishAnalisiAmbientaleSnapshot,
  publishValutazioneSslSnapshot,
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
        case "relazione_pc":
          return (u: string, o: string, c: string) => publishRelazionePcSnapshot(u, o, c);
        case "matrice_pc":
          return (u: string, o: string, c: string) => publishMatricePcSnapshot(u, o, c);
        case "matrice_231":
          return (u: string, o: string, c: string) => publishMatrice231Snapshot(u, o, c);
        case "relazione_odv":
          return (u: string, o: string, c: string) => publishRelazioneOdvSnapshot(u, o, c);
        case "relazione_wb":
          return (u: string, o: string, c: string) => publishRelazioneWbSnapshot(u, o, c);
        case "riesame_qas":
          return (u: string, o: string, c: string) => publishRiesameQasSnapshot(u, o, c);
        case "manuale_sa8000":
          return (u: string, o: string, c: string) => publishManualeSa8000Snapshot(u, o, c);
        case "analisi_ambientale":
          return (u: string, o: string, c: string) => publishAnalisiAmbientaleSnapshot(u, o, c);
        case "valutazione_ssl":
          return (u: string, o: string, c: string) => publishValutazioneSslSnapshot(u, o, c);
        case "dichiarazione_filiera":
          return (u: string, o: string, c: string) => publishDichiarazioneFilieraSnapshot(u, o, c);
        // ⚠️ I quattro del metodo ESG passano da UNA funzione sola, che riceve anche il
        // tipo: il contenuto di ciascuno e' il compilato di schede diverse, e cio' che
        // cambia sta nel registro. Quattro `case` con quattro funzioni sarebbero quattro
        // posti da tenere allineati.
        case "offerta_esg":
        case "verbale_avvio":
        case "diagnosi_esg":
        case "dossier_finale": {
          const t = tipo;
          return (u: string, o: string, c: string, a: number) => publishSgesgSnapshot(u, o, c, a, t);
        }
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
  /** Solo il FATTO che esista, non dove sta. Il client se ne serviva come booleano per
   *  un'etichetta «PDF generato», e intanto riceveva il percorso dentro l'archivio:
   *  organizzazione, azienda, tipo e versione di ogni documento pubblicato, cioe' una
   *  mappa del bucket regalata a chiunque apra gli strumenti del browser. */
  haPdf: boolean;
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
        haPdf: Boolean(r.pdfStorageKey),
        publishedAt: r.publishedAt.toISOString(),
      })),
    };
  } catch (e) {
    return daErrore(e);
  }
}
