import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { env } from "@/lib/env";

// withTenant: esegue il callback in una transazione con le GUC di tenant impostate,
// così le policy RLS scopano le query. Origine delle GUC = SEMPRE la sessione
// autenticata, mai i dati della richiesta:
//   - consulente → { userId, orgId }   (policy: match su organization_id)
//   - staff piattaforma → { platformAdmin: true } (valvola cross-tenant, gated a monte)
//
// In dev la connessione è `postgres` (bypassrls): le GUC sono innocue, comportamento
// identico. In produzione la connessione è `app_rls` (NOBYPASSRLS): default-deny.
// Seam di verifica dev/CI: RLS_FORCE_ROLE=app_rls fa assumere il ruolo ristretto a ogni
// transazione withTenant, mentre il seeding dei test resta privilegiato.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TenantCtx = {
  userId?: string | null;
  orgId?: string | null;
  platformAdmin?: boolean;
};

// Whitelist anti-injection: il valore arriva da env, mai da input utente.
const FORCE_ROLE = env.RLS_FORCE_ROLE && /^[a-z_][a-z0-9_]*$/.test(env.RLS_FORCE_ROLE) ? env.RLS_FORCE_ROLE : null;

/**
 * La transazione aperta adesso, in questa catena di chiamate.
 *
 * ⚠️ Esiste per DUE ragioni misurate, e la seconda è un guasto vero.
 *
 * 1. **Il costo.** Ogni transazione paga il proprio giro di apertura e chiusura, e su
 *    questo database un viaggio costa ~70 ms: `BEGIN`, le GUC, `COMMIT`. Una pagina che
 *    ne apriva sei — la dashboard — spendeva quasi due secondi prima di leggere un dato.
 *    Riusandola, quelle sei diventano una.
 *
 * 2. **Il blocco.** Una `withTenant` dentro un'altra `withTenant` prendeva una SECONDA
 *    connessione dal pool. Con cinque letture in parallelo che ne aprivano una ciascuna,
 *    le connessioni finivano e le esterne restavano ad aspettare le interne, che non
 *    potevano partire: l'accesso rispondeva 200 e la dashboard non finiva mai di
 *    rendersi. Non era lentezza, era un abbraccio mortale — e ci sono caduto scrivendo
 *    una funzione condivisa fra due letture che giravano già dentro una transazione.
 *    Con il riuso quel caso non esiste piu': la chiamata annidata trova la transazione
 *    che c'è e non ne chiede un'altra.
 *
 * ⚠️ Il prezzo, dichiarato: una chiamata annidata NON ha piu' una transazione propria,
 * quindi non si annulla da sola senza annullare anche quella esterna. Per le LETTURE non
 * cambia niente. Per le scritture nemmeno, perche' ogni mutazione apre la sua `withTenant`
 * al livello piu' alto e non ne annida altre — ma se un domani servisse una scrittura che
 * deve poter fallire senza trascinarsi dietro l'esterna, quella va scritta contro `db`
 * direttamente e con la sua ragione scritta accanto.
 *
 * ⚠️ Il riuso vale solo a PARITA' di contesto. Un `platformAdmin` dentro un contesto di
 * consulente aprirebbe una transazione sua, come deve: le GUC sono il perimetro, e
 * riusarne una con il perimetro sbagliato sarebbe il difetto peggiore di tutti.
 */
const aperta = new AsyncLocalStorage<{ chiave: string; tx: Tx; conn: number | null }>();

// Lo strumento di misura `DB_SPIA_CONN` (vedi `src/lib/db/index.ts`) legge da qui quale
// connessione tiene la transazione aperta. Passa da `globalThis` e non da un import perché
// `index.ts` è importato da questo file: il contrario creerebbe un giro fra i due moduli.
(globalThis as { __txAperta?: typeof aperta }).__txAperta = aperta;

/**
 * Da dove si legge una tabella DI PIATTAFORMA: la transazione aperta in questa catena di
 * chiamate, se c'è; altrimenti una connessione nuova, come `db`.
 *
 * ⚠️ PERCHÉ ESISTE: IL BLOCCO DEL 29-30 SETTEMBRE 2026. Il gruppo di connessioni di ogni
 * istanza è di TRE (`max: 3`). I cataloghi e la configurazione si leggevano con `db`
 * anche quando la chiamata stava DENTRO una `withTenant`: la transazione teneva una
 * connessione e la lettura ne prendeva una seconda. Tre richieste insieme sulla stessa
 * istanza tenevano le tre connessioni aspettando ciascuna la quarta, e restavano ferme per
 * sempre — in produzione fino ai 300 secondi di vita della funzione, perché Fluid Compute
 * serve più richieste per istanza. Misurato, non dedotto: la dashboard leggeva
 * `platform_config` così a ogni apertura, e l'iscrizione una ventina di cataloghi.
 *
 * ⚠️ SOLO PER LE TABELLE DI PIATTAFORMA, quelle senza `organization_id`: cataloghi,
 * content set, configurazione. Per loro leggere dentro o fuori la transazione dello
 * studio dà lo stesso risultato, perché le loro policy non dipendono dal contesto. Una
 * tabella di uno studio letta così vedrebbe ciò che vede la transazione — che non è ciò
 * che vede `db` — e quello è un cambio di perimetro, da decidere caso per caso.
 *
 * Restituisce il solo `select`: è uno strumento per leggere, e una scrittura fatta così
 * finirebbe dentro una transazione altrui, annullata se quella si annulla.
 */
export function dbCorrente(): Pick<typeof db, "select"> {
  return aperta.getStore()?.tx ?? db;
}

const chiaveDi = (ctx: TenantCtx) =>
  `${ctx.userId ?? ""}|${ctx.orgId ?? ""}|${ctx.platformAdmin ? "1" : ""}`;

export async function withTenant<T>(ctx: TenantCtx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const chiave = chiaveDi(ctx);
  const corrente = aperta.getStore();
  if (corrente && corrente.chiave === chiave) return fn(corrente.tx);

  const inizio = process.env.DB_TRACCIA === "1" ? Date.now() : 0;
  return db.transaction(async (tx) => {
    // La transazione entra nel contesto PRIMA della sua prima istruzione: così lo strumento
    // `DB_SPIA_CONN` sa su quale connessione gira, e riconosce ogni lettura che parte su
    // un'altra mentre questa è aperta. Per tutto il resto non cambia niente.
    return aperta.run({ chiave, tx, conn: null }, async () => {
      if (FORCE_ROLE) await tx.execute(sql.raw(`SET LOCAL ROLE ${FORCE_ROLE}`));
      // ⚠️ Le tre GUC in UN'ISTRUZIONE SOLA. Erano tre `SELECT set_config(...)` separate,
      // cioè tre viaggi al database da ~70 ms ciascuno pagati da ogni transazione, prima
      // di leggere qualunque dato. Il risultato è identico: `set_config` con `is_local` a
      // vero vale per la transazione, e tre chiamate nella stessa SELECT si applicano
      // tutte.
      await tx.execute(sql`SELECT
        set_config('app.user_id', ${ctx.userId ?? ""}, true),
        set_config('app.org_id', ${ctx.orgId ?? ""}, true),
        set_config('app.platform_admin', ${ctx.platformAdmin ? "on" : ""}, true)`);
      const esito = await fn(tx);
      if (inizio) console.error(`[tx] ${Date.now() - inizio} ms`);
      return esito;
    });
  });
}

export type { Tx };
