import { and, asc, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import {
  company,
  wbChannel,
  wbChapter,
  wbReport,
  wbRequirement,
  wbRequirementState,
  wbSystem,
} from "@/lib/db/schema";
import { statoCanale, condivisioneAmmessa, consultazioneSindacale } from "@/lib/calc/segnalazioni/canale";
import { mediaCapitoli, mediaPesata, valutati } from "@/lib/calc/comune/valutazione";

// Le letture della gestione delle segnalazioni.
//
// Sola lettura e nessun derivato persistito: quanto è conforme il sistema, quali forme
// del canale mancano, a che punto sono i termini — si ricalcolano a ogni apertura dalle
// funzioni pure, che sono le stesse che useranno l'interfaccia e il documento.

/** I pesi del prototipo: «parzialmente conforme» vale metà. */
const PESI_REQUISITO = {
  Conforme: 100,
  "Parzialmente conforme": 50,
  "Non conforme": 0,
} as const;

export async function getSegnalazioni(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    // L'azienda si legge sempre: la pagina deve distinguere «non esiste o è di un altro
    // studio» — che è un 404 — da «la gestione non è ancora stata avviata», che è un
    // invito a cominciare. Restituire `null` per entrambi manderebbe in errore chi apre
    // il modulo per la prima volta.
    const [azienda] = await tx
      .select({ id: company.id, nome: company.nome, settore: company.settore, sede: company.sede })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!azienda) return null;

    const [assetto] = await tx
      .select()
      .from(wbSystem)
      .where(and(eq(wbSystem.companyId, companyId), eq(wbSystem.organizationId, orgId)));
    if (!assetto) return { azienda, assetto: null } as const;

    const [canali, capi, requisiti, stati, fascicoli] = await Promise.all([
      tx
        .select()
        .from(wbChannel)
        .where(and(eq(wbChannel.systemId, assetto.id), eq(wbChannel.organizationId, orgId)))
        .orderBy(asc(wbChannel.createdAt)),
      tx.select().from(wbChapter).where(eq(wbChapter.setId, assetto.contentSetId)).orderBy(asc(wbChapter.ordine)),
      tx
        .select()
        .from(wbRequirement)
        .where(eq(wbRequirement.setId, assetto.contentSetId))
        .orderBy(asc(wbRequirement.ordine)),
      tx
        .select()
        .from(wbRequirementState)
        .where(and(eq(wbRequirementState.systemId, assetto.id), eq(wbRequirementState.organizationId, orgId))),
      // ⚠️ L'elenco dei fascicoli NON porta il contenuto: solo ciò che serve al registro
      // e ai termini. I fatti segnalati si leggono aprendo il fascicolo, e quel gesto si
      // registra. Selezionare `*` qui renderebbe l'audit una formalità: il contenuto
      // sarebbe già uscito con l'elenco.
      tx
        .select({
          id: wbReport.id,
          numero: wbReport.numero,
          dataRicezione: wbReport.dataRicezione,
          canale: wbReport.canale,
          anonima: wbReport.anonima,
          codice: wbReport.codice,
          recapito: wbReport.recapito,
          qualita: wbReport.qualita,
          ambito: wbReport.ambito,
          oggetto: wbReport.oggetto,
          stato: wbReport.stato,
          esito: wbReport.esito,
          avvisoReso: wbReport.avvisoReso,
          riscontroReso: wbReport.riscontroReso,
          dataChiusura: wbReport.dataChiusura,
          cancellata: wbReport.cancellata,
          // I sei fattori di ritorsione e lo stato del monitoraggio servono
          // all'AGGREGATO — «quanti monitoraggi sono dovuti e non aperti» — e sono
          // valutazioni di processo, non contenuto della segnalazione. Restano quindi
          // nell'elenco; i fatti segnalati no.
          monitoraggioAperto: wbReport.monitoraggioAperto,
          ritIdentitaConoscibile: wbReport.ritIdentitaConoscibile,
          ritSovraordinato: wbReport.ritSovraordinato,
          ritContestoRistretto: wbReport.ritContestoRistretto,
          ritPrecedenti: wbReport.ritPrecedenti,
          ritRapportoPrecario: wbReport.ritRapportoPrecario,
          ritGiaEsposto: wbReport.ritGiaEsposto,
        })
        .from(wbReport)
        .where(and(eq(wbReport.systemId, assetto.id), eq(wbReport.organizationId, orgId)))
        .orderBy(asc(wbReport.numero)),
    ]);

    const perChiave = new Map(stati.map((s) => [s.requirementKey, s]));
    const perCapitolo = capi.map((c) => {
      const suoi = requisiti.filter((r) => r.chapterKey === c.key);
      const valori = suoi.map((r) => perChiave.get(r.key)?.stato ?? null);
      return {
        capitolo: c,
        requisiti: suoi.length,
        valutati: valutati(valori),
        indice: mediaPesata(valori, PESI_REQUISITO),
      };
    });

    return {
      azienda,
      assetto,
      canali,
      capi,
      requisiti,
      stati,
      fascicoli,
      conformita: {
        perCapitolo,
        indice: mediaCapitoli(perCapitolo.map((c) => c.indice)),
        valutati: perCapitolo.reduce((a, c) => a + c.valutati, 0),
        totale: requisiti.length,
      },
      canale: {
        stato: statoCanale(canali),
        consultazione: consultazioneSindacale(
          assetto.consultazioneSindacale,
          canali.filter((c) => c.attiva).map((c) => c.attivatoIl),
        ),
        condivisioneAmmessa: condivisioneAmmessa(assetto.addetti),
      },
    };
  });
}

/**
 * Un fascicolo intero, e l'accesso registrato.
 *
 * ⚠️ È l'UNICA lettura di tutto il prodotto che scrive. La ragione sta in una frase
 * dell'autore del prototipo, che è anche la migliore specifica che si potesse scrivere:
 * «un registro compilato solo dopo la contestazione non ha valore probatorio». Il
 * prototipo aveva il registro degli accessi e lo faceva riempire a mano, cioè dopo, cioè
 * da chi ha interesse a non riempirlo.
 *
 * ⚠️ E l'audit è una PRECONDIZIONE, non un effetto collaterale: se la scrittura fallisce,
 * il fascicolo non si apre. È il contrario della regola che vale altrove in questo
 * prodotto — «il registro non deve mai poter far fallire il lavoro che sta registrando»,
 * scritta per il webhook di Stripe. Lì il registro annotava un lavoro che il cliente
 * aveva già pagato, e farlo fallire negava un servizio comprato. Qui il registro È la
 * garanzia, e leggere senza registrare è esattamente il danno: chi ha visto l'identità
 * di una persona che si è esposta deve risultare da qualche parte, o la tutela non
 * esiste. Le due regole non si contraddicono, rispondono a due domande diverse.
 */
export async function getFascicolo(userId: string, orgId: string, reportId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(wbReport)
      .where(and(eq(wbReport.id, reportId), eq(wbReport.organizationId, orgId)));
    if (!row) return null;

    // Dentro la stessa transazione della lettura: se l'inserimento fallisce, la
    // transazione si annulla e il chiamante non riceve il fascicolo.
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.fascicolo.read",
      entita: "wb_report",
      entitaId: reportId,
      dettagli: { numero: row.numero },
    });
    return row;
  });
}
