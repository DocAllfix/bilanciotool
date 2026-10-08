import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Il freno a finestra fissa, in UNA SOLA istruzione.
//
// ⚠️ Perché esiste. I tre freni del prodotto (candidature Fondatori, pagina di verifica,
// coda del blog) erano scritti ciascuno a mano come «leggi il contatore, confrontalo,
// scrivilo». Tre istruzioni separate: trenta richieste arrivate insieme leggevano tutte lo
// stesso numero, passavano tutte, e l'ultima scrittura vinceva. Il limite di cinque
// candidature l'ora ne lasciava partire trenta, e il contatore alla fine diceva tre (audit
// di sicurezza, ottobre 2026). È la stessa forma del claim del webhook di Stripe, risolta
// allo stesso modo: l'incremento e il confronto li fa Postgres, dentro una riga sola.
//
// ⚠️ Finestra FISSA, che parte dalla prima richiesta: `last_request` è l'inizio della
// finestra e non si sposta finché la finestra non scade. È ciò che facevano già i tre
// freni; cambia solo che adesso è atomico.
//
// ⚠️ Si usa `db` e non una transazione di tenant: `rate_limit` non ha organizzazione
// (passthrough, come le altre tabelle di Better Auth) e il freno si chiama PRIMA di
// qualunque lavoro. Non va chiamato dentro una `withTenant`: prenderebbe una seconda
// connessione da un gruppo di tre.
//
// Le chiavi non collidono con quelle di Better Auth, che compone indirizzo e rotta: le
// nostre cominciano con un nome di lavoro seguito da due punti.

export type Colpo = {
  /** Quante richieste in questa finestra, questa compresa. */
  conteggio: number;
  /** Quando è cominciata la finestra, in millisecondi. */
  inizio: number;
};

/** Registra una richiesta e dice a che punto è la finestra. Solleva se il database non risponde. */
export async function contaColpo(chiave: string, finestraMs: number, adesso = Date.now()): Promise<Colpo> {
  const scadute = adesso - finestraMs;
  const righe = await db.execute<{ count: number; last_request: string | number }>(sql`
    insert into rate_limit (id, key, count, last_request)
    values (${randomUUID()}, ${chiave}, 1, ${adesso})
    on conflict (key) do update set
      count = case when rate_limit.last_request <= ${scadute} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request <= ${scadute} then ${adesso} else rate_limit.last_request end
    returning count, last_request
  `);
  const riga = (righe as unknown as { count: number; last_request: string | number }[])[0]!;
  return { conteggio: Number(riga.count), inizio: Number(riga.last_request) };
}

/**
 * `true` se questa richiesta supera il massimo della finestra.
 *
 * Chi decide che cosa fare quando il database non risponde è il CHIAMANTE, e non è la
 * stessa risposta per tutti: la verifica di un documento deve passare (negarla farebbe
 * credere falso un documento vero), una candidatura può aspettare. Per questo qui non
 * c'è un `try`.
 */
export async function frenato(chiave: string, finestraMs: number, massimo: number): Promise<boolean> {
  return (await contaColpo(chiave, finestraMs)).conteggio > massimo;
}
