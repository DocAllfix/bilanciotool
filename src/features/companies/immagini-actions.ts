"use server";

import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { setCompanyImage } from "@/features/report/projects";
import {
  getImmaginiAzienda, setCopertinaModo, versioneConImmaginiSuperate, type ImmaginiAzienda, type ModoCopertina,
} from "./immagini";
import type { TipoDocumento } from "@/features/documents/tipi";

// Le azioni del riquadro «Logo e copertina», che sta nel pannello di pubblicazione di
// tutti i percorsi. Restituiscono `{ok}|{ok:false,errore}`, mai eccezioni nude al client.
//
// ⚠️ Nessun `revalidatePath`: il riquadro rilegge da sé le immagini dopo ogni gesto, e le
// pagine dei percorsi sono `force-dynamic`. Rivalidare una pagina `force-dynamic` non
// protegge niente e, sul portafoglio, ha rotto l'aggiornamento del client (regola del
// 23 agosto).

export async function getImmaginiAziendaAction(companyId: string): Promise<ActionEsito<ImmaginiAzienda>> {
  try {
    const s = await requireConsultant();
    return { ok: true, dati: await getImmaginiAzienda(s.userId, s.orgId, companyId) };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setImmagineAziendaAction(
  companyId: string,
  tipo: "logo" | "cover",
  dataUrl: string | null,
): Promise<ActionEsito<ImmaginiAzienda>> {
  try {
    if (tipo !== "logo" && tipo !== "cover") throw new Error("Tipo di immagine non valido");
    const s = await requireConsultant();
    // Il divieto (`write_data`), il controllo sui primi byte, il tetto di 3 MB e la
    // protezione dei file usati da documenti pubblicati stanno tutti in `setCompanyImage`:
    // una sola strada per caricare, qualunque sia il percorso da cui si arriva.
    await setCompanyImage(s.userId, s.orgId, companyId, tipo, dataUrl);
    return { ok: true, dati: await getImmaginiAzienda(s.userId, s.orgId, companyId) };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCopertinaModoAction(
  companyId: string,
  modo: ModoCopertina,
): Promise<ActionEsito<ImmaginiAzienda>> {
  try {
    const s = await requireConsultant();
    await setCopertinaModo(s.userId, s.orgId, companyId, modo);
    return { ok: true, dati: await getImmaginiAzienda(s.userId, s.orgId, companyId) };
  } catch (e) {
    return daErrore(e);
  }
}

/** Per l'avviso del pannello: la versione pubblicata le cui immagini sono superate, o `null`. */
export async function versioneConImmaginiSuperateAction(
  companyId: string,
  tipo: TipoDocumento,
  anno: number,
): Promise<ActionEsito<number | null>> {
  try {
    const s = await requireConsultant();
    return { ok: true, dati: await versioneConImmaginiSuperate(s.userId, s.orgId, companyId, tipo, anno) };
  } catch (e) {
    return daErrore(e);
  }
}
