import { MODULI_AZIENDA, type ModuloAzienda } from "@/features/companies/moduli";
import { sezioniComuni } from "./comuni";
import { ENERGETICO } from "./corsi/energetico";
import { BILANCIO } from "./corsi/bilancio";
import { GHG } from "./corsi/ghg";
import { FORNITORE } from "./corsi/fornitore";
import { FILIERA } from "./corsi/filiera";
import { MOG231 } from "./corsi/mog231";
import { ANTICORRUZIONE } from "./corsi/anticorruzione";
import { SEGNALAZIONI } from "./corsi/segnalazioni";
import { SGIQAS } from "./corsi/sgiqas";
import { SA8000 } from "./corsi/sa8000";
import { SOA } from "./corsi/soa";
import { SGESG } from "./corsi/sgesg";
import { AVVIARE_ATTIVITA } from "./corsi/avviare-attivita";
import { minutiTotali, type Corso, type Sezione } from "./tipi";

export { NUMERI } from "./numeri";
export type { Blocco, Sezione, Tono, VistaFinta } from "./tipi";

/**
 * I corsi con sezioni PROPRIE.
 *
 * ⚠️ Ci si registra dentro, e chi non c'è non finge. Oggi due percorsi su
 * `MODULI_AZIENDA.length` hanno la parte specifica; gli altri mostrano il corso comune e
 * DICHIARANO che manca. Un corso che finge di esserci è peggio di un corso che manca,
 * perché chi lo apre smette di cercare altrove — ed è la stessa scelta già fatta per il
 * percorso che non produce ancora un documento.
 *
 * La chiave è `ModuloAzienda`: un percorso che non esiste non si può registrare, e un
 * percorso rinominato rompe il compilatore invece di sparire in silenzio dalla formazione.
 */
const PROPRIE: Partial<Record<ModuloAzienda, Sezione[]>> = {
  ghg: GHG,
  energetico: ENERGETICO,
  bilancio: BILANCIO,
  fornitore: FORNITORE,
  filiera: FILIERA,
  mog231: MOG231,
  anticorruzione: ANTICORRUZIONE,
  segnalazioni: SEGNALAZIONI,
  sgiqas: SGIQAS,
  sa8000: SA8000,
  soa: SOA,
  sgesg: SGESG,
};

export type SchedaCorso = {
  modulo: ModuloAzienda;
  nome: string;
  norma: string;
  /** Ha sezioni proprie, o solo la parte comune a tutti? */
  completo: boolean;
  minuti: number;
  sezioni: Sezione[];
  /** I titoli delle sezioni PROPRIE: è ciò che distingue un corso dall'altro. */
  argomenti: string[];
  /**
   * Gli id delle sezioni COMUNI di questo corso.
   *
   * ⚠️ Serve a sapere dove sta la traccia audio: le comuni sono un file solo riusato da
   * tutti e dodici i corsi, le proprie stanno sotto il corso. Dedurlo dalla posizione —
   * «le ultime N sono proprie» — reggerebbe finché nessuno cambia l'ordine, e il giorno
   * in cui cambia le tracce finirebbero sulla sezione sbagliata senza un errore.
   */
  idComuni: string[];
};

/** Il corso di un percorso: sezioni comuni più, se ci sono, quelle sue. */
export function corsoDelModulo(modulo: ModuloAzienda): SchedaCorso {
  const m = MODULI_AZIENDA.find((x) => x.href === modulo);
  if (!m) throw new Error(`Percorso sconosciuto: ${modulo}`);

  const corso: Corso = { modulo, proprie: PROPRIE[modulo] ?? [] };
  const comuni = sezioniComuni(modulo);
  const sezioni = [...comuni, ...corso.proprie];

  return {
    modulo,
    nome: m.nome,
    norma: m.norma,
    completo: corso.proprie.length > 0,
    minuti: minutiTotali(sezioni),
    sezioni,
    argomenti: corso.proprie.map((s) => s.titolo),
    idComuni: comuni.map((s) => s.id),
  };
}

/**
 * Tutti i corsi, nell'ordine del registro dei percorsi.
 *
 * Si deriva da `MODULI_AZIENDA`: un percorso nuovo compare qui da solo, col corso comune,
 * e non può restare fuori per dimenticanza.
 */
export function tuttiICorsi(): SchedaCorso[] {
  return MODULI_AZIENDA.map((m) => corsoDelModulo(m.href));
}

export function esisteCorso(modulo: string): modulo is ModuloAzienda {
  return MODULI_AZIENDA.some((m) => m.href === modulo);
}

/**
 * I corsi TRASVERSALI: non insegnano un percorso, insegnano il mestiere.
 *
 * ⚠️ Stanno fuori da `PROPRIE` perché la loro chiave non è un `ModuloAzienda`, e la
 * differenza non è formale: il pulsante «Formazione» dentro un percorso porta al corso di
 * QUEL percorso, e un corso trasversale non ha un percorso da cui essere raggiunto. Sta
 * nell'indice, in una sezione sua, e ci si arriva da lì.
 */
export const TRASVERSALI = {
  "avviare-attivita": {
    nome: "Avviare e far crescere l'attività",
    sottotitolo:
      "Dove sono i clienti, come si diagnostica un bisogno, come si costruisce e si prezza una proposta, come si conduce un progetto fino alla verifica, come si organizza uno studio.",
    sezioni: AVVIARE_ATTIVITA,
  },
} as const;

export type CorsoTrasversale = keyof typeof TRASVERSALI;

export function esisteCorsoTrasversale(chiave: string): chiave is CorsoTrasversale {
  return Object.hasOwn(TRASVERSALI, chiave);
}

export function corsoTrasversale(chiave: CorsoTrasversale) {
  const c = TRASVERSALI[chiave];
  return { chiave, ...c, minuti: minutiTotali(c.sezioni) };
}
