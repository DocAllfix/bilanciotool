import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

// Il freno della pagina pubblica di verifica.
//
// ⚠️ Serve, e la ragione non è il carico: è che questa è l'unica rotta del prodotto che
// risponde «sì, questo documento esiste» a chiunque, senza sessione. Senza freno diventa
// un oracolo che si può interrogare a raffica — e anche se lo spazio dei codici è di
// venticinque simboli su otto posizioni (circa 1,5 × 10¹¹), un oracolo gratuito è il tipo
// di cosa che va chiusa quando costa poco, non quando qualcuno la usa.
//
// ⚠️ Il contatore sta sul DATABASE e non in memoria. Su Vercel ogni istanza ha la
// propria memoria: un contatore che si azzera a ogni avvio a freddo non ferma nessuno,
// basta che le richieste cadano su istanze diverse. È la stessa lezione già pagata dal
// freno dell'autenticazione, e la tabella è la stessa — con una chiave che non può
// collidere con le sue.

const FINESTRA_MS = 60_000;
/** Trenta al minuto: chi verifica a mano ne digita uno, chi sonda ne prova migliaia. */
const MASSIMO = 30;

export type EsitoFreno = { passa: true } | { passa: false; riprovaFra: number };

/**
 * Consuma un colpo per questo indirizzo.
 *
 * ⚠️ Non solleva mai. Se il database non risponde, la verifica **passa**: negare la
 * conferma di autenticità perché il nostro contatore è rotto sarebbe il danno peggiore
 * dei due — chi ha in mano il PDF concluderebbe che è falso.
 */
export async function consumaColpo(indirizzo: string): Promise<EsitoFreno> {
  const chiave = `verifica:${indirizzo}`;
  const adesso = Date.now();
  try {
    const [riga] = await db.select().from(rateLimit).where(eq(rateLimit.key, chiave)).limit(1);

    if (!riga || adesso - riga.lastRequest > FINESTRA_MS) {
      if (riga) {
        await db
          .update(rateLimit)
          .set({ count: 1, lastRequest: adesso })
          .where(eq(rateLimit.key, chiave));
      } else {
        await db
          .insert(rateLimit)
          .values({ id: randomUUID(), key: chiave, count: 1, lastRequest: adesso })
          .onConflictDoNothing();
      }
      return { passa: true };
    }

    if (riga.count >= MASSIMO) {
      return { passa: false, riprovaFra: Math.ceil((FINESTRA_MS - (adesso - riga.lastRequest)) / 1000) };
    }

    await db
      .update(rateLimit)
      .set({ count: riga.count + 1, lastRequest: riga.lastRequest })
      .where(eq(rateLimit.key, chiave));
    return { passa: true };
  } catch {
    return { passa: true };
  }
}
