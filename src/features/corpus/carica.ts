import {
  contaCorpus,
  documentoCorpus,
  listaCorpus,
  listaRegistri,
  registroCorpus,
} from "./letture";
import { registriSuperati } from "./registri-superati";
import type { DatiCorpus } from "@/components/corpus/sezione-corpus";

// Il caricamento del corpus per la pagina di un modulo.
//
// ⚠️ Sta qui e non in sei pagine: i sei moduli di conformità chiedono esattamente le
// stesse cose, e la scelta di COSA caricare dipende dalla vista aperta — non da quale
// modulo la sta chiedendo.
//
// ⚠️ E si carica solo ciò che serve. La vista dei registri non ha bisogno dei 6.489
// blocchi di un documento, e la vista di un documento non ha bisogno delle righe di
// sedici registri: caricare tutto a ogni apertura sarebbe il modo più semplice di
// rendere lenta la parte del prodotto che si apre più spesso.

export async function caricaCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  richiesta: { vista?: string; doc?: string; reg?: string },
  /** L'anagrafica del modulo: solo lui sa dove tiene ragione sociale, sede e revisione. */
  anagrafica: Record<string, string | null | undefined>,
): Promise<DatiCorpus> {
  const vista = richiesta.vista;

  const [procedure, moduli, registri, superati] = await Promise.all([
    vista === "procedure" || vista === undefined
      ? listaCorpus(userId, orgId, companyId, contentSetId, "procedura")
      : Promise.resolve([]),
    vista === "moduli" ? listaCorpus(userId, orgId, companyId, contentSetId, "modulo") : Promise.resolve([]),
    vista === "registri" ? listaRegistri(userId, orgId, companyId, contentSetId) : Promise.resolve([]),
    // ⚠️ Solo nella vista dei registri: e' l'unica che ne ha bisogno, e la domanda costa
    // una select in piu' su ogni apertura di procedura se la si fa sempre.
    vista === "registri"
      ? registriSuperati(userId, orgId, companyId, contentSetId)
      : Promise.resolve(new Map()),
  ]);

  const documento =
    richiesta.doc && (vista === "procedure" || vista === "moduli")
      ? await documentoCorpus(userId, orgId, companyId, contentSetId, richiesta.doc, anagrafica)
      : null;

  const registro =
    richiesta.reg && vista === "registri"
      ? await registroCorpus(userId, orgId, companyId, contentSetId, richiesta.reg)
      : null;

  return { procedure, moduli, registri, documento, registro, superati: Object.fromEntries(superati) };
}

/**
 * I contatori delle tre voci, senza caricare i contenuti.
 *
 * ⚠️ Servono SEMPRE — la barra delle viste li mostra anche quando si sta guardando
 * un'altra vista — e caricare procedure, moduli e registri interi per scrivere tre numeri
 * sarebbe il costo peggiore del prodotto: 447 documenti letti per disegnare
 * un'intestazione.
 */
export async function contatoriCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<{ procedure: number; moduli: number; approvate: number }> {
  return contaCorpus(userId, orgId, companyId, contentSetId);
}
