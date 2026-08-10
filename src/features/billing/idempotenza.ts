import { db } from "@/lib/db";
import { stripeProcessedEvent } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

/** true se l'evento è da processare adesso; false se era già stato preso. */
export async function prendiInCarico(eventId: string): Promise<boolean> {
  const inserito = await db
    .insert(stripeProcessedEvent)
    .values({ eventId })
    .onConflictDoNothing()
    .returning({ id: stripeProcessedEvent.eventId });
  return inserito.length > 0;
}

/**
 * Rilascia il claim quando il processing è fallito.
 *
 * Senza questo, un errore momentaneo — il database irraggiungibile per un istante —
 * lascerebbe l'evento marcato come «fatto» mentre non è stato fatto niente: Stripe
 * ritenterebbe, noi risponderemmo «già visto», e un cliente resterebbe senza il suo
 * abbonamento senza che nessun errore lo segnali.
 */
export async function rilascia(eventId: string): Promise<void> {
  await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, eventId));
}
