import { and, eq, sql } from "drizzle-orm";

import { formazioneVerifica } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

// L'avanzamento nelle verifiche dei corsi.
//
// ⚠️ La tabella non porta `organization_id`, e non e' una svista: il dato e' della PERSONA,
// non dello studio. Chi ha fatto un corso se lo porta dietro cambiando studio, e il socio
// che apre lo stesso corso comincia dal principio. Il filtro e' `user_id`, e viene dalla
// sessione — mai dal client.
//
// ⚠️ MA PASSA DA `withTenant` LO STESSO, e la prima versione non lo faceva. La policy della
// migrazione 0057 e' scritta sull'UTENTE (`app.user_id`), e quella GUC la imposta solo
// `withTenant`: contro `db` nudo, in sviluppo funziona tutto — la connessione e'
// privilegiata e le policy non scattano — e in produzione, dove la connessione E' `app_rls`,
// `current_setting('app.user_id', true)` e' NULL e la policy nega ogni riga. Il quiz non
// avrebbe salvato e non avrebbe letto niente, in silenzio, senza un solo errore.
//
// E il test lo confermava passando: `RLS_FORCE_ROLE` assume il ruolo ristretto DENTRO
// `withTenant`, quindi su una query che non ci passa non morde. Una difesa che nessuno ha
// mai visto scattare non e' una difesa.
//
// Il contesto porta il solo `userId`: qui non c'e' un'organizzazione, e non ne serve una.

export type EsitoVerifica = {
  corrette: number;
  domande: number;
  superata: boolean;
  tentativi: number;
};

/** Gli esiti di un utente su un corso, per sezione. */
export async function esitiDelCorso(
  userId: string,
  corso: string,
): Promise<Record<string, EsitoVerifica>> {
  const righe = await withTenant({ userId }, (tx) =>
    tx
      .select()
      .from(formazioneVerifica)
      .where(and(eq(formazioneVerifica.userId, userId), eq(formazioneVerifica.corso, corso))),
  );

  return Object.fromEntries(
    righe.map((r) => [
      r.sezione,
      { corrette: r.corrette, domande: r.domande, superata: r.superata, tentativi: r.tentativi },
    ]),
  );
}

/**
 * Registra l'esito di un tentativo.
 *
 * ⚠️ Il tentativo si CONTA, e il conteggio non e' un voto: e' il segno di dove il corso
 * non spiega abbastanza. Una sezione che tutti rifanno tre volte non dice che le persone
 * sono distratte — dice che quel testo non sta funzionando.
 *
 * ⚠️ E un esito superato NON si perde riprovando. Chi rifa' una verifica gia' superata per
 * rivedere le spiegazioni non deve poterla «rompere»: il campo `superata` resta vero una
 * volta diventato vero. Toglierlo sarebbe punire la curiosita'.
 */
export async function registraEsito(
  userId: string,
  corso: string,
  sezione: string,
  corrette: number,
  domande: number,
  minime: number,
): Promise<EsitoVerifica> {
  const superata = corrette >= minime;

  const [riga] = await withTenant({ userId }, (tx) =>
    tx
      .insert(formazioneVerifica)
      .values({ userId, corso, sezione, corrette, domande, superata, tentativi: 1 })
      .onConflictDoUpdate({
        target: [formazioneVerifica.userId, formazioneVerifica.corso, formazioneVerifica.sezione],
        set: {
          corrette,
          domande,
          // ⚠️ `OR` col valore precedente, in UNA istruzione: leggere il vecchio esito e poi
          // riscriverlo sarebbe un leggi-modifica-scrivi, cioè il difetto che questo
          // progetto ha già pagato quattro volte in altre forme. Qui lo decide Postgres.
          superata: sql`${formazioneVerifica.superata} OR ${superata}`,
          tentativi: sql`${formazioneVerifica.tentativi} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning(),
  );

  return {
    corrette: riga.corrette,
    domande: riga.domande,
    superata: riga.superata,
    tentativi: riga.tentativi,
  };
}
