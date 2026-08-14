import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeProcessedEvent } from "@/lib/db/schema";

// Idempotenza del webhook.
//
// Stripe consegna «almeno una volta»: lo stesso evento può arrivare due volte per un
// timeout di rete, per un nostro errore, o perché qualcuno preme «reinvia» dal
// cruscotto. Processarlo due volte significherebbe, nel caso migliore, due righe di
// audit; nel caso peggiore, due abbonamenti o due attivazioni.
//
// Il claim è un INSERT: se la riga c'è già, l'evento è nostro e l'abbiamo già visto.
// Non un SELECT seguito da INSERT — fra i due passerebbe la seconda copia dell'evento,
// e due processi vedrebbero entrambi «non ancora fatto».
//
// ── Il caso che mancava: il processo che muore ────────────────────────────────
//
// `rilascia` copre l'errore APPLICATIVO, perché sta in un `catch`. Non copre il timeout
// della funzione serverless, un OOM, o un guasto del database durante la `rilascia`
// stessa — che è essa stessa una scrittura, e può fallire.
//
// Quando il processo muore a metà, la riga resta. Stripe ritenta, trova il claim, e noi
// rispondiamo «già processato» con 200. Stripe smette di ritentare. **Un cliente che ha
// pagato resta bloccato, con 200 su tutta la linea e nessun errore in nessun log.**
//
// La tabella non poteva accorgersene: un claim preso e uno completato erano la stessa
// riga. Ora c'è uno `stato`, e un claim `in_corso` troppo vecchio si può RIPESCARE.

/**
 * Oltre questa età un claim ancora `in_corso` è morto, non lento.
 *
 * La rotta dichiara `maxDuration = 60`, quindi nessuna elaborazione legittima può durare
 * più di un minuto: cinque è un margine largo che non può mai sovrapporsi a un lavoro
 * vivo. Sovrapporsi sarebbe grave — due processi sullo stesso evento — quindi il numero
 * si sceglie generoso, non stretto.
 */
const CLAIM_MORTO_DOPO_MINUTI = 5;

/**
 * `true` se l'evento è da processare adesso; `false` se era già stato preso.
 *
 * UNA sola istruzione, e deve restare una: `insert ... on conflict do update ... where`.
 * L'`INSERT` prende il claim se non c'era; il `DO UPDATE` lo RIPESCA se c'era ma è un
 * claim morto. Se la riga è `completato`, o è `in_corso` da poco, la condizione del
 * `where` non passa, non torna nessuna riga, e l'evento si considera già visto — che è
 * il comportamento di prima, invariato.
 *
 * Spezzarla in un `select` seguito da un `update` riaprirebbe esattamente la corsa che
 * questo file esiste per chiudere.
 */
export async function prendiInCarico(eventId: string): Promise<boolean> {
  const preso = await db
    .insert(stripeProcessedEvent)
    .values({ eventId, stato: "in_corso", presoIl: new Date() })
    .onConflictDoUpdate({
      target: stripeProcessedEvent.eventId,
      set: { stato: "in_corso", presoIl: new Date() },
      setWhere: and(
        eq(stripeProcessedEvent.stato, "in_corso"),
        lt(stripeProcessedEvent.presoIl, sql`now() - interval '${sql.raw(String(CLAIM_MORTO_DOPO_MINUTI))} minutes'`),
      ),
    })
    .returning({ id: stripeProcessedEvent.eventId });
  return preso.length > 0;
}

/**
 * Segna il claim come completato: da qui in poi l'evento non si riprocessa più, nemmeno
 * se Stripe lo rimanda.
 *
 * Va chiamata SOLO dopo che il lavoro è andato a buon fine. Finché non lo si chiama, il
 * claim resta `in_corso` e — se il processo muore — verrà ripescato al ritentativo di
 * Stripe invece di sparire.
 */
export async function segnaCompletato(eventId: string): Promise<void> {
  await db
    .update(stripeProcessedEvent)
    .set({ stato: "completato", processedAt: new Date() })
    .where(eq(stripeProcessedEvent.eventId, eventId));
}

/**
 * Rilascia il claim quando il processing è fallito **con un'eccezione**.
 *
 * Resta utile anche adesso: cancellare subito fa ritentare Stripe al primo tentativo
 * utile, invece di aspettare i cinque minuti del ripescaggio.
 */
export async function rilascia(eventId: string): Promise<void> {
  await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, eventId));
}
