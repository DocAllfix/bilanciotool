import { and, eq } from "drizzle-orm";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { wbSystem } from "@/lib/db/schema";

// I registri del corpus che un MODULO più specifico ha superato.
//
// ⚠️ Il caso è uno solo e va capito prima di generalizzarlo. Il Modello 231 e la ISO
// 37001 contengono ciascuno un registro delle segnalazioni — è giusto che ci siano,
// perché entrambe le norme lo prescrivono — ma quel registro è una **tabella da
// quattordici colonne**, mentre il modulo Gestione delle segnalazioni ha un fascicolo da
// settanta campi con i termini di legge calcolati. Tenerli scrivibili entrambi produce
// due copie dello stesso dato personale ultra-sensibile, e quella meno curata è quella
// che si compila per prima perché è lì sotto gli occhi.
//
// ⚠️ **Non si tolgono dal corpus**, e il motivo è di versionamento: il corpus è congelato
// alla creazione, quindi un modello già avviato continuerebbe a vedere la versione con
// dentro il registro, e la correzione varrebbe solo per i clienti futuri. Si rendono di
// SOLA LETTURA quando il modulo Segnalazioni è attivo per quell'azienda, col rimando al
// posto dove i termini si calcolano davvero.
//
// ⚠️ E si spengono SOLO se il modulo è attivo. Un ente che ha un Modello 231 e non ha
// (ancora) aperto il modulo Segnalazioni deve poter usare il proprio registro: toglierlo
// a prescindere significherebbe togliergli l'unico posto dove annotare una segnalazione
// ricevuta, che è il contrario di ciò che la norma chiede.

/** Il registro superato, per content set: `<set>` → `mod_code`. */
const SUPERATI: Record<string, { modCode: string; da: string }> = {
  "mog231-v1": { modCode: "MOD-06.02", da: "segnalazioni" },
  "iso37001-v1": { modCode: "MOD-11.02", da: "segnalazioni" },
};

export type RegistroSuperato = {
  /** Il rimando: la rotta del modulo che lo ha superato. */
  rotta: string;
  motivo: string;
};

/**
 * Quali registri di questo content set sono superati, per questa azienda.
 *
 * Chiave della mappa: `mod_code`. Vuota quando non c'è niente da spegnere — che è il
 * caso di nove content set su undici, e di tutti finché il modulo non viene aperto.
 */
export async function registriSuperati(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<Map<string, RegistroSuperato>> {
  return withTenant({ userId, orgId }, (tx) => registriSuperatiTx(tx, orgId, companyId, contentSetId));
}

/**
 * La stessa domanda, dentro una transazione già aperta.
 *
 * ⚠️ Serve al divieto lato server: la mutazione dei registri gira già dentro
 * `withTenant`, e aprirne un'altra dall'interno significherebbe una connessione nuova
 * per una domanda che si può fare con quella che si ha in mano.
 */
export async function registriSuperatiTx(
  tx: Tx,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<Map<string, RegistroSuperato>> {
  const voce = SUPERATI[contentSetId];
  if (!voce) return new Map();

  const [attivo] = await tx
    .select({ id: wbSystem.id })
    .from(wbSystem)
    .where(and(eq(wbSystem.companyId, companyId), eq(wbSystem.organizationId, orgId)))
    .limit(1);
  if (!attivo) return new Map();

  return new Map([
    [
      voce.modCode,
      {
        rotta: `/aziende/${companyId}/${voce.da}`,
        motivo:
          "Le segnalazioni si registrano nel modulo dedicato, dove ogni fascicolo porta i termini di legge calcolati (sette giorni per l'avviso, tre mesi per il riscontro) e la valutazione del rischio di ritorsione. Tenere due registri della stessa cosa significa due copie di un dato personale ultra-sensibile, e quella meno curata è quella che si compila per prima.",
      },
    ],
  ]);
}
