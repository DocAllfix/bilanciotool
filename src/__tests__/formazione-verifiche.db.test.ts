import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user, formazioneVerifica } from "@/lib/db/schema";
import { esitiDelCorso, registraEsito } from "@/features/formazione/verifiche";

// L'AVANZAMENTO NELLE VERIFICHE, SUL DATABASE.
//
// ⚠️ Il fatto che questo file esiste per difendere è UNO: un esito superato non si perde
// riprovando. Chi rifà una verifica già superata per rileggere le spiegazioni non deve
// poterla «rompere», e a garantirlo non è il codice applicativo — è Postgres, con un `OR`
// dentro l'`ON CONFLICT`. Leggere il vecchio esito e riscriverlo sarebbe un
// leggi-modifica-scrivi, cioè il difetto che questo progetto ha già pagato quattro volte:
// la quantità dell'energetico, l'impatto della materialità, il contatto di riferimento,
// le politiche del bilancio.

const RUN = Date.now();
const CORSO = `prova-${RUN}`;
let userId = "";

beforeAll(async () => {
  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: `Verifiche ${RUN}`,
    email: `verifiche-${RUN}@example.com`,
    emailVerified: true,
  });
});

afterAll(async () => {
  await db.delete(formazioneVerifica).where(eq(formazioneVerifica.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
});

async function riga(sezione: string) {
  const r = await db
    .select()
    .from(formazioneVerifica)
    .where(
      and(
        eq(formazioneVerifica.userId, userId),
        eq(formazioneVerifica.corso, CORSO),
        eq(formazioneVerifica.sezione, sezione),
      ),
    );
  return r[0];
}

describe("registraEsito", () => {
  it("scrive il primo tentativo e dice se è superato", async () => {
    const e = await registraEsito(userId, CORSO, "s1", 4, 5, 3);
    expect(e).toMatchObject({ corrette: 4, domande: 5, superata: true, tentativi: 1 });
  });

  it("NON perde un superamento quando si riprova e si va peggio", async () => {
    // È il cuore del file. Prima 4/5 (superata), poi 1/5: il punteggio si aggiorna,
    // `superata` resta vero.
    const e = await registraEsito(userId, CORSO, "s1", 1, 5, 3);
    expect(e.corrette).toBe(1);
    expect(e.superata).toBe(true);
    expect(e.tentativi).toBe(2);
  });

  it("conta i tentativi sommando sul valore del DATABASE, non su quello che arriva", async () => {
    // ⚠️ Il chiamante non manda mai il numero di tentativi: se lo mandasse, due consegne
    // in volo nello stesso istante ne perderebbero una. Qui è `tentativi + 1` in SQL.
    await registraEsito(userId, CORSO, "s1", 5, 5, 3);
    expect((await riga("s1"))!.tentativi).toBe(3);
  });

  it("resta non superata finché non si raggiunge la soglia", async () => {
    const e = await registraEsito(userId, CORSO, "s2", 2, 5, 4);
    expect(e.superata).toBe(false);
    const e2 = await registraEsito(userId, CORSO, "s2", 3, 5, 4);
    expect(e2.superata).toBe(false);
    const e3 = await registraEsito(userId, CORSO, "s2", 4, 5, 4);
    expect(e3.superata).toBe(true);
  });

  it("tiene le sezioni separate", async () => {
    const esiti = await esitiDelCorso(userId, CORSO);
    expect(Object.keys(esiti).sort()).toEqual(["s1", "s2"]);
    expect(esiti.s1.corrette).toBe(5);
    expect(esiti.s2.corrette).toBe(4);
  });

  it("non vede i corsi altrui", async () => {
    // Il filtro è `user_id` + `corso`, e viene dalla sessione: mai dal client.
    expect(await esitiDelCorso(userId, `${CORSO}-altro`)).toEqual({});
    expect(await esitiDelCorso(randomUUID(), CORSO)).toEqual({});
  });
});
