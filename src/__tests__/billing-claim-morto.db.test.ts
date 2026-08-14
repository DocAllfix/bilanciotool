import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { stripeProcessedEvent } from "@/lib/db/schema";
import { prendiInCarico, segnaCompletato, rilascia } from "@/features/billing/idempotenza";
import { eq, sql } from "drizzle-orm";

// Un claim preso e mai chiuso non deve far sparire un pagamento.
//
// IL DIFETTO. `route.ts` rilascia il claim nel `catch`, che intercetta le eccezioni
// JavaScript. Non intercetta il timeout della funzione serverless, un OOM, o un guasto
// del database durante la `rilascia` stessa. Quando il processo moriva a metà la riga
// restava, Stripe ritentava, la rotta rispondeva `200 «già processato»`, e Stripe
// smetteva di ritentare: **un cliente che ha pagato restava bloccato, con 200 ovunque e
// nessun errore in nessun log**.
//
// La tabella non poteva accorgersene: un claim preso e uno completato erano la stessa
// riga. Adesso c'è uno stato, e un claim `in_corso` troppo vecchio si ripesca.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const usati: string[] = [];

/** Invecchia il claim, per non dover aspettare cinque minuti veri. */
async function invecchia(eventId: string, minuti: number) {
  await db
    .update(stripeProcessedEvent)
    .set({ presoIl: sql`now() - interval '${sql.raw(String(minuti))} minutes'` })
    .where(eq(stripeProcessedEvent.eventId, eventId));
}

const evento = (nome: string) => {
  const id = `evt_${nome}_${RUN}`;
  usati.push(id);
  return id;
};

describe.skipIf(!url)("il claim del webhook distingue «fatto» da «morto a metà»", () => {
  afterEach(async () => {
    for (const id of usati) await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, id));
    usati.length = 0;
  });

  it("il primo lo prende, il secondo no", async () => {
    // Il comportamento di prima, che non deve cambiare: due copie dello stesso evento
    // in parallelo, una sola lavora.
    const id = evento("doppio");
    expect(await prendiInCarico(id)).toBe(true);
    expect(await prendiInCarico(id)).toBe(false);
  });

  it("un evento COMPLETATO non si riprocessa mai, per quanto vecchio", async () => {
    // È il caso che il ripescaggio non deve rompere: Stripe rimanda volentieri gli
    // eventi, e un rinvio a distanza di giorni non deve rifare il lavoro.
    const id = evento("completato");
    expect(await prendiInCarico(id)).toBe(true);
    await segnaCompletato(id);
    await invecchia(id, 60 * 24 * 7);
    expect(await prendiInCarico(id)).toBe(false);
  });

  it("un claim IN CORSO da poco non si ruba", async () => {
    // Due processi sullo stesso evento contemporaneamente sarebbero peggio del difetto
    // che stiamo correggendo: la finestra è generosa apposta.
    const id = evento("in-volo");
    expect(await prendiInCarico(id)).toBe(true);
    await invecchia(id, 2);
    expect(await prendiInCarico(id)).toBe(false);
  });

  it("un claim IN CORSO da troppo tempo si RIPESCA — è il rimedio", async () => {
    // Il processo è morto senza arrivare né a `segnaCompletato` né a `rilascia`.
    // Prima: Stripe ritentava, riceveva «già processato», e il pagamento spariva.
    const id = evento("morto");
    expect(await prendiInCarico(id)).toBe(true);
    await invecchia(id, 10);

    expect(await prendiInCarico(id), "il ritentativo di Stripe deve poter lavorare").toBe(true);

    // E dopo il ripescaggio il claim è di nuovo fresco: nessun terzo processo lo prende.
    expect(await prendiInCarico(id)).toBe(false);
  });

  it("dopo il ripescaggio il lavoro si chiude normalmente", async () => {
    const id = evento("ripescato-e-chiuso");
    await prendiInCarico(id);
    await invecchia(id, 10);
    await prendiInCarico(id);
    await segnaCompletato(id);

    const [r] = await db.select().from(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, id));
    expect(r.stato).toBe("completato");
    await invecchia(id, 60);
    expect(await prendiInCarico(id)).toBe(false);
  });

  it("`rilascia` resta la strada rapida per un errore applicativo", async () => {
    // Cancellare subito fa ritentare Stripe al primo tentativo utile, senza aspettare
    // i cinque minuti del ripescaggio.
    const id = evento("rilasciato");
    await prendiInCarico(id);
    await rilascia(id);
    expect(await prendiInCarico(id)).toBe(true);
  });
});
