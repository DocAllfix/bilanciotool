// Lo scadenzario e le statistiche della relazione periodica.
//
// Tutto puro e tutto con `oggi` passato da fuori: una funzione che legge l'orologio non
// si può provare, e le stesse cifre devono uscire uguali a schermo e nel documento
// congelato. È lo stesso motivo per cui i termini stanno in `termini.ts` e non in una
// tabella.

import { avvisoEntro, cancellazioneEntro, giorniA, riscontroEntro } from "./termini";
import { livelloRitorsione } from "./valutazione";

/**
 * Le soglie di preallarme, asimmetriche di proposito e conservate dal prototipo.
 *
 * Sette giorni si recuperano in un pomeriggio, tre mesi no: avvisare a due giorni
 * dall'uno e a quindici dall'altro dà in entrambi i casi il tempo di rimediare.
 */
export const PREALLARME = { avviso: 2, riscontro: 15 } as const;

export type StatoTermine = "fatto" | "termini" | "scadenza" | "scaduto" | "tardivo" | "na";

export type FascicoloTermini = {
  numero: number;
  anonima: boolean;
  recapito: string | null;
  codice: string | null;
  dataRicezione: string | null;
  avvisoReso: string | null;
  riscontroReso: string | null;
  stato: string;
  esito: string | null;
  canale: string | null;
  qualita: string | null;
  dataChiusura: string | null;
  cancellata: string | null;
  monitoraggioAperto: string | null;
  // I sei fattori, coi nomi delle COLONNE. Vedi `fattoriRitorsione` qui sotto.
  ritIdentitaConoscibile: string | null;
  ritSovraordinato: string | null;
  ritContestoRistretto: string | null;
  ritPrecedenti: string | null;
  ritRapportoPrecario: string | null;
  ritGiaEsposto: string | null;
};

/**
 * Dal nome della colonna al nome della chiave del motore.
 *
 * ⚠️ Serve una mappatura esplicita, e non è burocrazia: le colonne portano il prefisso
 * `rit` perché il fascicolo ha settanta campi e senza prefissi i sei si perderebbero fra
 * gli altri; il motore no, perché il suo unico argomento sono loro. Una prima versione
 * di questo file passava il fascicolo intero a `livelloRitorsione`, che cercava
 * `identitaConoscibile` e trovava `undefined`: sei fattori mancanti, livello `null`,
 * **monitoraggi dovuti pari a zero per tutti** — e in una relazione all'organo di
 * controllo quello zero si legge come «nessuno era a rischio». Il compilatore non lo
 * vedeva perché `Partial<Record<...>>` accetta l'assenza di ogni chiave.
 */
function fattoriRitorsione(f: FascicoloTermini) {
  return {
    identitaConoscibile: f.ritIdentitaConoscibile,
    sovraordinato: f.ritSovraordinato,
    contestoRistretto: f.ritContestoRistretto,
    precedenti: f.ritPrecedenti,
    rapportoPrecario: f.ritRapportoPrecario,
    giaEsposto: f.ritGiaEsposto,
  };
}

/** Se al segnalante si può dare avviso e riscontro. Asimmetrica: vedi `valutazione.ts`. */
function contattabile(f: FascicoloTermini): boolean {
  if (!f.anonima) return f.recapito !== "No";
  return !!f.codice || f.recapito === "Sì";
}

/**
 * A che punto è un termine di legge.
 *
 * ⚠️ «Tardivo» è uno stato a sé e non si arrotonda a «fatto». Su un termine perentorio
 * il ritardo è il fatto da riferire, e una relazione che dicesse «avvisi resi: 100%»
 * avendone reso metà fuori termine sarebbe falsa verso l'organo di controllo.
 *
 * ⚠️ «na» non è «scaduto». La segnalazione anonima priva di recapito e di codice non
 * consente né avviso né riscontro: contarla fra le scadute farebbe risultare
 * inadempiente chi non poteva adempiere.
 */
export function statoTermine(
  f: FascicoloTermini,
  quale: "avviso" | "riscontro",
  oggi: string,
): StatoTermine {
  if (!contattabile(f)) return "na";

  const reso = quale === "avviso" ? f.avvisoReso : f.riscontroReso;
  const entro =
    quale === "avviso"
      ? avvisoEntro(f.dataRicezione)
      : riscontroEntro(f.dataRicezione, f.avvisoReso);
  if (!entro) return "na";

  // Confronto inclusivo: reso l'ultimo giorno utile, è nei termini.
  if (reso) return reso <= entro ? "fatto" : "tardivo";

  const g = giorniA(entro, oggi);
  if (g === null) return "na";
  if (g < 0) return "scaduto";
  return g <= PREALLARME[quale] ? "scadenza" : "termini";
}

/** L'ordine di lavorazione: 0 il più urgente, 3 ciò che è concluso. */
export function urgenza(f: FascicoloTermini, oggi: string): number {
  if (f.stato === "Chiusa" || f.stato === "Archiviata") return 3;
  const a = statoTermine(f, "avviso", oggi);
  const r = statoTermine(f, "riscontro", oggi);
  if (a === "scaduto" || r === "scaduto") return 0;
  if (a === "scadenza" || r === "scadenza") return 1;
  return 2;
}

const ESITI = ["Fondata", "Parzialmente fondata", "Non fondata", "Manifestamente infondata"] as const;
const CANALI = [
  "Scritto informatico",
  "Scritto analogico",
  "Orale telefonico",
  "Incontro diretto",
  "Canale esterno ANAC",
  "Altro",
] as const;

/** Le qualità che stanno FUORI dal rapporto di lavoro in corso. */
const ESTERNI = [
  "Collaboratore o consulente",
  "Lavoratore autonomo",
  "Volontario o tirocinante",
  "Fornitore o appaltatore",
  "Lavoratore di appaltatore",
  "Candidato",
  "Ex dipendente",
];

export type ContoTermine = {
  /** Quanti erano dovuti: le non contattabili non contano. */
  dovuti: number;
  neiTermini: number;
  tardivi: number;
  scaduti: number;
  /** `null` quando non ce n'era nessuno dovuto: zero direbbe un'altra cosa. */
  percentuale: number | null;
};

function conta(fascicoli: readonly FascicoloTermini[], quale: "avviso" | "riscontro", oggi: string): ContoTermine {
  const stati = fascicoli.map((f) => statoTermine(f, quale, oggi)).filter((s) => s !== "na");
  const neiTermini = stati.filter((s) => s === "fatto").length;
  const tardivi = stati.filter((s) => s === "tardivo").length;
  const scaduti = stati.filter((s) => s === "scaduto").length;
  return {
    dovuti: stati.length,
    neiTermini,
    tardivi,
    scaduti,
    // ⚠️ `null` e non zero: «non ce n'erano» e «non ne ha reso nessuno» sono due frasi
    // diverse, e la seconda in una relazione è un'accusa.
    percentuale: stati.length ? Math.round((neiTermini / stati.length) * 100) : null,
  };
}

export function statistiche(fascicoli: readonly FascicoloTermini[], oggi: string) {
  const chiuse = (f: FascicoloTermini) => f.stato === "Chiusa" || f.stato === "Archiviata";

  const livello = (f: FascicoloTermini) => livelloRitorsione(fattoriRitorsione(f), f.anonima);

  return {
    totali: fascicoli.length,
    aperte: fascicoli.filter((f) => !chiuse(f)).length,
    concluse: fascicoli.filter(chiuse).length,

    /**
     * ⚠️ Il rilievo metodologico più importante del prototipo, e si conserva: un canale
     * senza segnalazioni è più spesso un canale che nessuno conosce, di cui nessuno si
     * fida, o che nessuno riesce a raggiungere. Presentare lo zero come un risultato
     * direbbe il falso all'organo di controllo — che è chi legge questa relazione.
     */
    zeroDaInterpretare: fascicoli.length === 0,

    avvisi: conta(fascicoli, "avviso", oggi),
    riscontri: conta(fascicoli, "riscontro", oggi),

    perEsito: Object.fromEntries(
      ESITI.map((e) => [e, fascicoli.filter((f) => f.esito === e).length]),
    ) as Record<(typeof ESITI)[number], number>,

    perCanale: Object.fromEntries(
      CANALI.map((c) => [c, fascicoli.filter((f) => f.canale === c).length]),
    ) as Record<(typeof CANALI)[number], number>,
    senzaCanale: fascicoli.filter((f) => !f.canale).length,

    anonime: fascicoli.filter((f) => f.anonima).length,
    /**
     * Da chi la legge protegge oltre i dipendenti. Se non arriva mai niente da
     * fornitori, candidati o ex dipendenti, il canale non è pubblicato dove loro
     * possono vederlo — ed è un rilievo sull'informazione, non sulle segnalazioni.
     */
    daEsterni: fascicoli.filter((f) => f.qualita !== null && ESTERNI.includes(f.qualita)).length,

    monitoraggiAperti: fascicoli.filter((f) => f.monitoraggioAperto === "Sì").length,
    // Solo dove il livello è NOTO ed è almeno Medio: un rischio non ancora misurato non
    // rende dovuto niente, e segnalarlo come lacuna insegnerebbe a ignorare le lacune.
    monitoraggiDovutiNonAperti: fascicoli.filter((f) => {
      const l = livello(f);
      return (l === "Medio" || l === "Alto") && f.monitoraggioAperto !== "Sì";
    }).length,

    daCancellare: fascicoli.filter((f) => {
      if (f.cancellata === "Sì") return false;
      const g = giorniA(cancellazioneEntro(f.dataChiusura), oggi);
      return g !== null && g <= 0;
    }).length,
  };
}
