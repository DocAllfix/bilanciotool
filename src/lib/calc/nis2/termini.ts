// I TERMINI DI NOTIFICA DELL'ART. 25 DEL D.LGS. 138/2024, e l'aritmetica che li produce.
//
// Sono l'unica cosa perentoria del modulo. Tutto il resto di NIS2 si recupera — un
// controllo non attuato si attua, un requisito a livello 1 si porta a 3 — un termine
// mancato no: resta scritto, e l'Autorita' lo guarda.
//
// ⚠️ DUE DIVERGENZE DAL PROTOTIPO, VOLUTE, E MISURATE PRIMA DI SCRIVERE QUESTO FILE.
//
// 1 · Le ore si sommano in MILLISECONDI UTC, non con `setHours`.
//     `setHours(d.getHours() + 24)` aggiunge ventiquattro all'ora dell'OROLOGIO, e
//     l'orologio salta due volte l'anno. Nel fuso italiano:
//         28 marzo 2026, 23:00  +24h → 29 marzo 23:00  = 23 ore reali
//         24 ottobre 2026, 23:00 +24h → 25 ottobre 23:00 = 25 ore reali
//     Un'ora tolta a chi deve pre-notificare, e il prodotto che gli dice che e' in
//     tempo. Qui un istante piu' ventiquattro ore fa ventiquattro ore, ovunque giri.
//
// 2 · I mesi si AGGANCIANO all'ultimo giorno invece di traboccare.
//     `setMonth(+1)` sul 31 gennaio da' il 3 marzo. Qui da' il 28 febbraio, che e' cio'
//     che calcolano date-fns, Luxon e l'`INTERVAL` di Postgres, e cio' che calcolerebbe
//     un avvocato.
//
// E' la stessa coppia di difetti gia' corretta per il D.Lgs. 24/2023, in una forma
// diversa: la' i termini erano in giorni da una data, qui sono in ore da un ISTANTE.
// Le funzioni non si riusano perche' le grandezze sono diverse; la REGOLA si', ed e'
// per questo che il mese passa da `piuMesi` di `segnalazioni/termini.ts`.

import { piuMesi } from "@/lib/calc/segnalazioni/termini";
import { giornoItaliano, oraItaliana, daOraItaliana } from "@/lib/calc/comune/tempo-italia";

/** Art. 25 c. 1 lett. a): pre-notifica entro 24 ore dalla conoscenza. */
export const H_PRE_NOTIFICA = 24;
/** Art. 25 c. 1 lett. b): notifica entro 72 ore dalla conoscenza. */
export const H_NOTIFICA = 72;
/** Art. 25 c. 1 lett. d): relazione finale entro un mese dalla notifica. */
export const MESI_RELAZIONE = 1;

/** I tre adempimenti, nell'ordine in cui il decreto li pone. */
export const ADEMPIMENTI = ["preNotifica", "notifica", "relazione"] as const;
export type Adempimento = (typeof ADEMPIMENTI)[number];

export type StatoTermine =
  /** L'adempimento non e' dovuto: l'incidente non e' significativo, o manca il presupposto. */
  | "non_applicabile"
  /** Fatto entro il termine. */
  | "nei_termini"
  /** ⚠️ Fatto, ma dopo il termine. Resta scritto: e' cio' che l'Autorita' guarda. */
  | "fuori_termine"
  /** Da fare, e c'e' tempo. */
  | "in_corso"
  /** Da fare, e manca meno di un quarto del termine. */
  | "in_scadenza"
  /** Da fare, e il termine e' passato. */
  | "scaduto";

export type Incidente = {
  /** Solo un incidente significativo fa scattare i termini (art. 25 c. 2). */
  significativo: boolean;
  /** L'istante in cui l'ente ne ha avuto conoscenza. Da qui decorre tutto. */
  conoscenzaIl: string | null;
  preNotificaIl: string | null;
  notificaIl: string | null;
  relazioneIl: string | null;
};

export type Scadenze = Record<Adempimento, string | null>;

/** Un istante ISO valido, oppure `null`. Mai una data che nessuno ha scritto. */
function istante(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Un istante piu' N ore, esatte.
 *
 * ⚠️ In millisecondi: e' l'unica aritmetica che non conosce il cambio d'ora. Ventiquattro
 * ore sono ventiquattro ore anche la notte in cui l'orologio salta.
 */
export function piuOre(iso: string | null | undefined, ore: number): string | null {
  const d = istante(iso);
  if (!d) return null;
  return new Date(d.getTime() + ore * 3_600_000).toISOString();
}

/**
 * Un istante piu' N mesi, agganciando all'ultimo giorno del mese di arrivo.
 *
 * ⚠️ Il CALENDARIO e' quello italiano, l'ORA si conserva. «Un mese dalla notifica» e' un
 * concetto di calendario, e il calendario di un obbligo italiano e' quello italiano: una
 * notifica dell'1 febbraio alle 00:30 ora di Roma cade il 31 gennaio in UTC, e contare i
 * mesi da li' anticiperebbe la scadenza di un giorno. Su un termine perentorio si sbaglia
 * sempre dalla parte del cliente, mai contro.
 *
 * L'aggancio lo fa `piuMesi` di `segnalazioni/termini.ts`, gia' scritta e gia' provata:
 * la regola e' la stessa, e riscriverla qui sarebbe la seconda copia che un giorno diverge.
 */
export function piuMesiDaIstante(iso: string | null | undefined, mesi: number): string | null {
  const d = istante(iso);
  if (!d) return null;
  const giorno = piuMesi(giornoItaliano(d), mesi);
  if (!giorno) return null;
  return daOraItaliana(giorno, oraItaliana(d))?.toISOString() ?? null;
}

/**
 * I tre termini di un incidente.
 *
 * ⚠️ La relazione finale decorre dalla NOTIFICA, non dalla conoscenza: senza notifica non
 * c'e' termine. Farla decorrere dalla conoscenza inventerebbe una scadenza che il decreto
 * non pone, e la metterebbe nello scadenzario di un cliente come se fosse dovuta.
 */
export function scadenze(i: Incidente): Scadenze {
  if (!i.significativo) return { preNotifica: null, notifica: null, relazione: null };
  return {
    preNotifica: piuOre(i.conoscenzaIl, H_PRE_NOTIFICA),
    notifica: piuOre(i.conoscenzaIl, H_NOTIFICA),
    relazione: piuMesiDaIstante(i.notificaIl, MESI_RELAZIONE),
  };
}

/** Quando e' stato adempiuto, se e' stato adempiuto. */
function adempiutoIl(i: Incidente, quale: Adempimento): string | null {
  return quale === "preNotifica" ? i.preNotificaIl : quale === "notifica" ? i.notificaIl : i.relazioneIl;
}

/**
 * Quanto dura la finestra d'allarme, in ore: un QUARTO del termine.
 *
 * Proporzionale e non fissa, perche' i tre termini sono di ordini di grandezza diversi —
 * ventiquattro ore, tre giorni, un mese — e sei ore di preavviso su un mese sono niente,
 * mentre una settimana su ventiquattro ore non esiste. Il prototipo usava tre soglie
 * scritte a mano (6, 24, 168 ore) che stanno nello stesso rapporto: qui la proporzione e'
 * dichiarata invece di essere il risultato di tre numeri.
 */
const QUOTA_ALLARME = 0.25;

function oreDelTermine(quale: Adempimento): number {
  if (quale === "preNotifica") return H_PRE_NOTIFICA;
  if (quale === "notifica") return H_NOTIFICA;
  return MESI_RELAZIONE * 30 * 24; // un mese, in ordine di grandezza: serve solo alla soglia
}

export function statoTermine(i: Incidente, quale: Adempimento, adesso = new Date()): StatoTermine {
  if (!i.significativo) return "non_applicabile";
  const termine = istante(scadenze(i)[quale]);
  if (!termine) return "non_applicabile";

  const fatto = istante(adempiutoIl(i, quale));
  if (fatto) return fatto.getTime() <= termine.getTime() ? "nei_termini" : "fuori_termine";

  const mancano = termine.getTime() - adesso.getTime();
  if (mancano < 0) return "scaduto";
  return mancano <= oreDelTermine(quale) * QUOTA_ALLARME * 3_600_000 ? "in_scadenza" : "in_corso";
}

/**
 * L'urgenza di un incidente, per ordinarli: piu' basso, piu' urgente.
 *
 * Un incidente chiuso va in fondo qualunque cosa sia successo; fra gli aperti viene prima
 * quello che ha un termine gia' scaduto.
 */
export function urgenza(i: Incidente, chiuso: boolean, adesso = new Date()): number {
  if (chiuso) return 3;
  const stati = ADEMPIMENTI.map((a) => statoTermine(i, a, adesso));
  if (stati.includes("scaduto")) return 0;
  if (stati.includes("in_scadenza")) return 1;
  return 2;
}
