import { frequenzaDueDiligence, livelloDueDiligence, scaduta, superiore } from "./rischio";
import type { Obbligo, SocioInAffari } from "./tipi";

// Gli otto obblighi che discendono dal livello di rischio. E' il cuore del modulo:
// la norma non chiede «fai la due diligence a tutti», chiede di farla in misura
// proporzionata al rischio, e questa e' la funzione che dice a chi e quanto.

type Regola = Obbligo & {
  /** Se l'obbligo si applica a questo socio. */
  dovuto: (s: SocioInAffari) => boolean;
  /** Se e' assolto. */
  assolto: (s: SocioInAffari, oggi: Date) => boolean;
  /** Perche' e' dovuto, o cosa serve sapere. Stringa vuota = niente da dire. */
  nota?: (s: SocioInAffari) => string;
};

const REGOLE: Regola[] = [
  {
    chiave: "dd",
    etichetta: "Due diligence svolta e valida",
    riferimento: "8.2 · PAC-07",
    dovuto: superiore,
    assolto: (s, oggi) => !!s.dueDiligenceIl && !scaduta(s.dueDiligenceIl, frequenzaDueDiligence(s), oggi),
    nota: (s) => `Livello ${livelloDueDiligence(s)}, rinnovo ogni ${frequenzaDueDiligence(s)} mesi`,
  },
  {
    chiave: "pol",
    etichetta: "Politica comunicata direttamente",
    riferimento: "5.2 · 7.4.2",
    dovuto: superiore,
    assolto: (s) => s.politicaComunicata === "Sì",
  },
  {
    chiave: "imp",
    etichetta: "Impegni anticorruzione acquisiti",
    riferimento: "8.6 · PAC-09",
    dovuto: superiore,
    assolto: (s) => s.impegni === "Sì" || s.impegni === "Non fattibile, motivato",
    nota: (s) => (s.impegni === "Non fattibile, motivato" ? "Non fattibilità registrata: valutata nel rischio" : ""),
  },
  {
    chiave: "clau",
    etichetta: "Clausole contrattuali inserite",
    riferimento: "8.6 · PAC-09",
    dovuto: superiore,
    // ⚠️ SCOSTAMENTO VOLUTO dal prototipo, verificato sul sorgente e non ricordato.
    // Li' l'obbligo accettava solo «Sì» (riga 286) mentre l'INDICATORE contava
    // «Sì» oppure «Non applicabile» (riga 1286): lo stesso socio risultava
    // inadempiente nella propria scheda e adempiente nel cruscotto. Ci si allinea
    // all'assolvimento, che e' anche il comportamento degli altri due obblighi
    // della stessa norma — impegni e controlli accettano gia' la non fattibilita'
    // motivata. «Non applicabile» e' una risposta, non un'omissione.
    assolto: (s) => s.clausole === "Sì" || s.clausole === "Non applicabile",
    nota: (s) => (s.clausole === "Non applicabile" ? "Dichiarate non applicabili al rapporto" : ""),
  },
  {
    chiave: "ctrl",
    etichetta: "Controlli anticorruzione del socio verificati",
    riferimento: "8.5.2 · PAC-09",
    dovuto: superiore,
    assolto: (s) =>
      s.controlli === "Adeguati" ||
      s.controlli === "Richiesti e attuati" ||
      s.controlli === "Non fattibile, valutato nel rischio",
  },
  {
    chiave: "form",
    etichetta: "Formazione anticorruzione erogata agli addetti",
    riferimento: "7.3.3 · PAC-06",
    // Dovuta solo quando il socio agisce PER CONTO dell'organizzazione (natura ≥ 3):
    // chi fornisce beni standard non espone l'organizzazione allo stesso modo.
    dovuto: (s) => superiore(s) && (s.natura ?? 0) >= 3,
    assolto: (s) => !!s.formazioneIl,
    nota: () => "Dovuta perché il socio agisce per conto o a vantaggio dell'Organizzazione",
  },
  {
    chiave: "pag",
    etichetta: "Verifica di proporzionalità del corrispettivo",
    riferimento: "8.4 · PAC-08",
    // ⚠️ SCOSTAMENTO VOLUTO. Il prototipo guardava SOLO il flag di rischio
    // «remunerazione a provvigione o a successo», e non il campo strutturato che ha
    // gia' le opzioni giuste. Chi sceglieva «A provvigione» nella modalita' di
    // remunerazione senza spuntare anche il flag non aveva l'obbligo: un obbligo che
    // MANCA, non uno di troppo. Ora basta uno dei due segnali — chi ha dichiarato la
    // provvigione la fa scattare, e chi ha spuntato il flag pure.
    dovuto: (s) =>
      s.remunerazioneSuccesso || s.remunerazione === "A provvigione" || s.remunerazione === "A successo",
    // Qui «Non applicabile» NON assolve, e la differenza con le clausole e'
    // deliberata: l'obbligo esiste perche' il corrispettivo E' a provvigione, quindi
    // dichiararlo non applicabile contraddice il proprio presupposto. Una clausola
    // contrattuale puo' davvero non applicarsi; questa verifica no.
    assolto: (s) => s.verificaCorrispettivo === "Sì",
    nota: () => "Dovuta per la remunerazione a provvigione o a successo",
  },
  {
    chiave: "ctr",
    etichetta: "Adeguamento dell'organizzazione controllata",
    riferimento: "8.5.1 · PAC-09",
    // Indipendente dal livello di rischio: si controlla l'organizzazione, quindi
    // la si adegua, qualunque sia la sua esposizione.
    dovuto: (s) => s.controllata === "Sì",
    assolto: (s) => s.adeguamento === "Applica il nostro sistema" || s.adeguamento === "Applica controlli propri",
  },
];

/** Gli obblighi che si applicano a questo socio, nell'ordine della norma. */
export function obblighiDi(s: SocioInAffari): Obbligo[] {
  return REGOLE.filter((r) => r.dovuto(s)).map(({ chiave, etichetta, riferimento }) => ({ chiave, etichetta, riferimento }));
}

/** Quelli dovuti e non assolti. */
export function obblighiAperti(s: SocioInAffari, oggi: Date): Obbligo[] {
  return REGOLE.filter((r) => r.dovuto(s) && !r.assolto(s, oggi)).map(({ chiave, etichetta, riferimento }) => ({
    chiave,
    etichetta,
    riferimento,
  }));
}

/** Obblighi con stato e nota, per la scheda del socio. */
export function statoObblighi(
  s: SocioInAffari,
  oggi: Date,
): { obbligo: Obbligo; assolto: boolean; nota: string }[] {
  return REGOLE.filter((r) => r.dovuto(s)).map((r) => ({
    obbligo: { chiave: r.chiave, etichetta: r.etichetta, riferimento: r.riferimento },
    assolto: r.assolto(s, oggi),
    nota: r.nota?.(s) ?? "",
  }));
}
