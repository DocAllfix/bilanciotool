"use server";

import { z } from "zod";

import { requireSession } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { registraEsito, type EsitoVerifica } from "./verifiche";
import { corsoDelModulo, esisteCorso, esisteCorsoTrasversale, corsoTrasversale } from "./index";

// La consegna di una verifica.
//
// ⚠️ LE RISPOSTE GIUSTE NON ARRIVANO DAL CLIENT. Il browser manda le scelte, e il conteggio
// lo fa il server leggendo il catalogo dei corsi: mandare «ho fatto 4 su 4» renderebbe la
// verifica un campo di testo. Non e' una difesa contro l'imbroglio — chi vuole imbrogliare
// su un corso proprio ha gia' vinto — e' che un conteggio fatto in due posti prima o poi
// diverge, e allora nessuno dei due significa piu' niente.

const consegnaSchema = z.object({
  corso: z.string().trim().min(1).max(60),
  sezione: z.string().trim().min(1).max(80),
  /** L'indice scelto per ciascuna domanda, nell'ordine. `null` = non risposta. */
  scelte: z.array(z.number().int().min(0).max(9).nullable()).max(40),
});

/** Le sezioni di un corso, qualunque sia la sua famiglia. */
function sezioniDi(corso: string) {
  if (esisteCorso(corso)) return corsoDelModulo(corso).sezioni;
  if (esisteCorsoTrasversale(corso)) return corsoTrasversale(corso).sezioni;
  // ⚠️ Un corso che non esiste non produce sezioni, e la verifica viene rifiutata poco
  // sotto con un messaggio invece di cercare in un elenco vuoto: e' la stessa scelta
  // fatta per i requisiti e i controlli sconosciuti.
  return [];
}

export async function consegnaVerificaAction(
  input: z.input<typeof consegnaSchema>,
): Promise<ActionEsito<{ esito: EsitoVerifica; giuste: number[] }>> {
  try {
    const s = await requireSession();
    const v = consegnaSchema.parse(input);

    const sezione = sezioniDi(v.corso).find((x) => x.id === v.sezione);
    if (!sezione?.verifica) throw new Error("Questa sezione non ha una verifica");

    const { domande, minime } = sezione.verifica;
    // ⚠️ Le scelte si contano sulle DOMANDE, non sulla lunghezza dell'array che arriva:
    // un client che ne mandasse una in meno farebbe scendere il denominatore invece di
    // perdere un punto.
    const corrette = domande.reduce(
      (n, d, i) => n + (v.scelte[i] === d.corretta ? 1 : 0),
      0,
    );

    const esito = await registraEsito(
      s.userId,
      v.corso,
      v.sezione,
      corrette,
      domande.length,
      minime,
    );

    // Le risposte giuste tornano al client SOLO dopo la consegna: servono a mostrare le
    // spiegazioni, che sono la parte che insegna.
    return { ok: true, dati: { esito, giuste: domande.map((d) => d.corretta) } };
  } catch (e) {
    return daErrore(e);
  }
}
