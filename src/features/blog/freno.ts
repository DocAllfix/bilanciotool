import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Il freno sul webhook del blog, e perche' frena la coda invece dell'ingresso.
//
// La revalidazione DEVE avvenire a ogni chiamata: e' il senso stesso del webhook, e
// costa quasi niente. Quello che costa e' la coda — il giro di verifica che bussa a ogni
// pagina del blog e, se qualcosa non risponde, manda un allarme. Un WordPress che si
// mette a ripetere la chiamata (e' gia' successo di veder partire il webhook in modi
// imprevisti) produrrebbe venti giri di controlli e venti allarmi uguali. E un allarme
// che arriva venti volte si smette di leggere: e' la stessa lezione del giro quotidiano.
//
// Quindi: si passa sempre, ma la verifica si fa al massimo una volta al minuto.
//
// Il contatore sta sul DATABASE e non in memoria. Su Vercel ogni istanza ha la propria
// memoria: una variabile di modulo si azzera a ogni avvio a freddo e frena solo chi
// capita sulla stessa istanza. E' lo stesso motivo per cui il freno sull'accesso e'
// finito in tabella.
//
// Si riusa `rate_limit`, che ha gia' la forma giusta (chiave, conteggio, ultimo istante
// in millisecondi) e vive fuori dalle policy di tenant: la chiave qui non e' un
// indirizzo di rete ma il nome del lavoro.

const CHIAVE = "blog:verifica";
const PAUSA_MS = 60_000;

/**
 * `true` se la verifica puo' partire adesso. Registra il passaggio.
 *
 * In caso di errore del database risponde `true`: un contatore che non si riesce a
 * leggere non deve impedire il controllo. Il freno serve a non ripetere un lavoro utile
 * troppe volte, non a impedirlo.
 */
export async function verificaConsentita(adesso = Date.now()): Promise<boolean> {
  try {
    const [riga] = await db.select().from(rateLimit).where(eq(rateLimit.key, CHIAVE)).limit(1);
    if (riga && adesso - riga.lastRequest < PAUSA_MS) return false;

    if (riga) {
      await db
        .update(rateLimit)
        .set({ lastRequest: adesso, count: riga.count + 1 })
        .where(eq(rateLimit.id, riga.id));
    } else {
      await db.insert(rateLimit).values({ id: CHIAVE, key: CHIAVE, count: 1, lastRequest: adesso });
    }
    return true;
  } catch (e) {
    console.error("[blog] freno della verifica non leggibile:", e);
    return true;
  }
}
