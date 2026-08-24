import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { documentCodice } from "@/lib/db/schema";
import { ALFABETO, LUNGHEZZA, formattaCodice } from "@/lib/calc/documenti/codice";
import type { TipoDocumento } from "./tipi";

// La generazione del codice di verifica, e la sua lettura pubblica.
//
// ⚠️ Sta qui e non in `src/lib/calc`: `randomInt` viene da `node:crypto`, che nel browser
// non esiste. Il modulo puro accanto (`lib/calc/documenti/codice.ts`) tiene alfabeto,
// forma e normalizzazione — cioè tutto ciò che serve anche al client — e non genera nulla.

/**
 * Otto caratteri dall'alfabeto, con un generatore CRITTOGRAFICO.
 *
 * ⚠️ `Math.random()` sarebbe stato sufficiente «in pratica» e sbagliato in linea di
 * principio: il valore di questo codice è che chi lo riceve non possa costruirsene uno.
 * Con un generatore prevedibile, chi vedesse due codici emessi di seguito potrebbe
 * indovinare il terzo — e il terzo appartiene a un altro studio.
 *
 * ⚠️ E `randomInt(n)` invece di `randomBytes() % n`: il modulo su una potenza di due
 * introduce una distorsione a favore dei primi caratteri dell'alfabeto, che con 25 simboli
 * si vede. `randomInt` scarta e ritenta.
 */
function generaGrezzo(): string {
  let out = "";
  for (let i = 0; i < LUNGHEZZA; i++) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

/**
 * Assegna il codice a uno snapshot appena pubblicato.
 *
 * ⚠️ Va chiamata DENTRO la transazione della pubblicazione: un documento senza codice
 * è un documento che non si potrà mai verificare con quel PDF, perché il PDF stampa il
 * codice. Se questa fallisce, non deve esistere neanche lo snapshot.
 *
 * ⚠️ La collisione si gestisce riprovando, e il tentativo si conta: con 25^8 combinazioni
 * una collisione è remota, ma «remota» non è «impossibile» e un vincolo di unicità che
 * esplode in faccia a un consulente che sta pubblicando sarebbe il modo peggiore di
 * scoprirlo. Dopo cinque tentativi si arrende con un errore leggibile.
 */
export async function assegnaCodice(
  tx: Tx,
  input: {
    snapshotId: string;
    organizationId: string;
    emittente: string;
    azienda: string;
    tipo: TipoDocumento;
    anno: number;
    versione: number;
  },
): Promise<string> {
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const codice = formattaCodice(generaGrezzo());
    const righe = await tx
      .insert(documentCodice)
      .values({ ...input, codice })
      .onConflictDoNothing({ target: documentCodice.codice })
      .returning({ codice: documentCodice.codice });
    if (righe.length) return righe[0]!.codice;
  }
  throw new Error("Non è stato possibile generare un codice di verifica: riprova");
}

export type EsitoVerifica = {
  codice: string;
  emittente: string;
  azienda: string;
  tipo: TipoDocumento;
  anno: number;
  versione: number;
  pubblicatoIl: Date;
  verifiche: number;
};

/**
 * La lettura pubblica: un codice, una riga, nient'altro.
 *
 * ⚠️ Nessun `withTenant`: chi verifica non ha una sessione, ed è il punto della funzione.
 * La query tocca **solo** `document_codice`, che porta i campi già denormalizzati: non
 * c'è nessun join verso `company`, `organization` o lo snapshot, quindi non esiste una
 * versione di questa funzione che per errore mostri qualcosa in più.
 *
 * ⚠️ E incrementa il contatore. È l'unica lettura del prodotto che scrive insieme al
 * fascicolo di una segnalazione, ma per una ragione opposta: là il registro **è** la
 * garanzia e l'apertura si nega se non si può registrare; qui è una nota di cronaca per
 * lo studio, e un guasto del contatore non deve togliere a nessuno la conferma che sta
 * chiedendo. Per questo l'aggiornamento è fuori dal ramo che decide l'esito.
 */
export async function verificaCodice(codiceCanonico: string): Promise<EsitoVerifica | null> {
  const [riga] = await db
    .select()
    .from(documentCodice)
    .where(eq(documentCodice.codice, codiceCanonico))
    .limit(1);
  if (!riga) return null;

  try {
    await db
      .update(documentCodice)
      .set({ verifiche: sql`${documentCodice.verifiche} + 1`, ultimaVerifica: new Date() })
      .where(eq(documentCodice.codice, codiceCanonico));
  } catch {
    // Il contatore non è la funzione: se non si scrive, la conferma si dà lo stesso.
  }

  return {
    codice: riga.codice,
    emittente: riga.emittente,
    azienda: riga.azienda,
    tipo: riga.tipo as TipoDocumento,
    anno: riga.anno,
    versione: riga.versione,
    pubblicatoIl: riga.pubblicatoIl,
    verifiche: riga.verifiche,
  };
}

/** Il codice di uno snapshot, per stamparlo nel colophon del documento. */
export async function codiceDelloSnapshot(
  userId: string,
  orgId: string,
  snapshotId: string,
): Promise<string | null> {
  const [riga] = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ codice: documentCodice.codice })
      .from(documentCodice)
      .where(and(eq(documentCodice.snapshotId, snapshotId), eq(documentCodice.organizationId, orgId)))
      .limit(1),
  );
  return riga?.codice ?? null;
}
