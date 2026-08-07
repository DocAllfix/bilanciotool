// Il listino, in un posto solo.
//
// Lo leggono l'entitlement (per sapere quanta capacità concedere), il checkout (per sapere
// cosa vendere), lo script di avvio di Stripe (per creare i prezzi) e la pagina Abbonamento
// (per mostrarli). Quattro consumatori, una sola verità: un listino ricopiato in quattro
// posti diverge al primo aggiornamento, e il posto che diverge è sempre quello che decide
// se una richiesta passa.
//
// ⚠️ **NON va mai importato dalla landing.** Decisione del committente del 2026-08-07: i
// prezzi non stanno sul sito pubblico, si vedono solo dopo l'accesso.
//
// ⚠️ **Gli importi sono in CENTESIMI.** Stripe ragiona in centesimi, e un importo in euro
// diventa un addebito cento volte più piccolo senza che nessuno se ne accorga fino al primo
// pagamento vero.

export type PianoKey = "professional" | "studio" | "studio_plus" | "enterprise";

export const CHIAVI_PIANO: readonly PianoKey[] = ["professional", "studio", "studio_plus", "enterprise"];

export type Piano = {
  key: PianoKey;
  nome: string;
  descrizione: string;
  /** Aziende attive incluse nel piano. Le archiviate e la demo non contano mai. */
  aziende: number;
  /** Persone che possono accedere allo studio, titolare compreso. */
  accessi: number;
  /** Centesimi. Primo anno, avviamento incluso. */
  primoAnno: number;
  /** Centesimi. Dal secondo anno, rinnovo automatico. */
  rinnovo: number;
  /** Vero solo per Enterprise: non si vende da solo, si tratta. */
  trattativa?: boolean;
  /** Chiavi Stripe. I prezzi si risolvono per queste, mai per id in variabile d'ambiente. */
  lookupAnno1?: string;
  lookupRinnovo?: string;
};

export const PIANI: Record<PianoKey, Piano> = {
  professional: {
    key: "professional",
    nome: "Professional",
    descrizione: "Per il consulente singolo che segue poche aziende.",
    aziende: 3,
    accessi: 2,
    primoAnno: 120000,
    rinnovo: 90000,
    lookupAnno1: "evalisdeck_professional_anno1_v1",
    lookupRinnovo: "evalisdeck_professional_rinnovo_v1",
  },
  studio: {
    key: "studio",
    nome: "Studio",
    descrizione: "Il piano dello studio di consulenza con un portafoglio avviato.",
    aziende: 10,
    accessi: 5,
    primoAnno: 290000,
    rinnovo: 220000,
    lookupAnno1: "evalisdeck_studio_anno1_v1",
    lookupRinnovo: "evalisdeck_studio_rinnovo_v1",
  },
  studio_plus: {
    key: "studio_plus",
    nome: "Studio Plus",
    descrizione: "Per chi rendiconta molte aziende e lavora in squadra.",
    aziende: 25,
    accessi: 10,
    primoAnno: 540000,
    rinnovo: 420000,
    lookupAnno1: "evalisdeck_studio_plus_anno1_v1",
    lookupRinnovo: "evalisdeck_studio_plus_rinnovo_v1",
  },
  enterprise: {
    key: "enterprise",
    nome: "Enterprise",
    descrizione: "Reti e gruppi: capacità e condizioni concordate.",
    // La base è quella del piano più capiente, e il negoziato si scrive nelle estensioni.
    // Così non servono capacità «nulle» da gestire ovunque, e l'accordo resta leggibile:
    // Studio Plus più i blocchi che sono stati concordati.
    aziende: 25,
    accessi: 10,
    primoAnno: 0,
    rinnovo: 0,
    trattativa: true,
  },
};

export const ESTENSIONI = {
  /** Unità di VENDITA: un blocco vale cinque aziende. In `aziendeExtra` finiscono le
   *  aziende (cinque per blocco), non i blocchi. */
  bloccoAziende: { aziende: 5, prezzo: 90000, lookup: "evalisdeck_blocco_aziende_v1" },
  /** Un accesso in più per lo studio. */
  accesso: { prezzo: 15000, lookup: "evalisdeck_accesso_v1" },
  /** I documenti escono col marchio dello studio invece del nostro. */
  whiteLabel: { prezzo: 60000, lookup: "evalisdeck_white_label_v1" },
  /** Formazione e configurazione iniziale: una tantum, importo concordato entro la forbice. */
  avvioAssistito: { min: 50000, max: 80000, lookup: "evalisdeck_avvio_assistito_v1" },
} as const;

export type Limiti = { maxActiveCompanies: number; warnAtCompanies: number; maxMembers: number };

/**
 * Quando avvisare che la capacità sta finendo: **a un quinto dalla fine**, non a un numero
 * fisso. Con l'8 fisso di prima un piano da 3 aziende non avrebbe mai avvisato, e uno da 25
 * avrebbe avvisato a un terzo di capacità. La regola riproduce esattamente il vecchio
 * 10 → 8, che era il solo caso in cui quel numero aveva senso.
 */
export function sogliaAvviso(limite: number): number {
  if (limite <= 1) return 1;
  return Math.max(1, limite - Math.max(1, Math.round(limite * 0.2)));
}

/** Un numero di estensioni che possiamo sommare senza rischi. Tutto il resto vale zero. */
function extraValido(n: unknown): number {
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export function capacitaDelPiano(piano: PianoKey): { aziende: number; accessi: number } {
  const p = PIANI[piano];
  return { aziende: p.aziende, accessi: p.accessi };
}

/**
 * I limiti che valgono davvero per uno studio: capacità del piano **più** i blocchi comprati.
 *
 * Senza piano si torna ai valori di riserva della piattaforma: è il caso di chi sta ancora in
 * demo, che non ha comprato niente e non deve per questo restare senza limiti.
 */
export function limitiEffettivi(
  abbonamento: { piano: PianoKey | null; aziendeExtra?: number | null; accessiExtra?: number | null },
  riserva: Limiti,
): Limiti {
  if (!abbonamento.piano || !(abbonamento.piano in PIANI)) return riserva;

  // `aziendeExtra` conta AZIENDE, non blocchi. Il blocco da cinque è un'unità di vendita:
  // comprarne due scrive 10 qui. Tenere i blocchi in questa colonna renderebbe
  // inesprimibile un accordo Enterprise da 75 aziende, che multiplo di cinque non è per
  // obbligo, e costringerebbe ogni lettore a ricordarsi il fattore di conversione.
  const base = capacitaDelPiano(abbonamento.piano);
  const aziende = base.aziende + extraValido(abbonamento.aziendeExtra);
  const accessi = base.accessi + extraValido(abbonamento.accessiExtra);

  return { maxActiveCompanies: aziende, warnAtCompanies: sogliaAvviso(aziende), maxMembers: accessi };
}

/** Centesimi → importo leggibile in italiano. Niente decimali quando non servono.
 *  `useGrouping` esplicito: lasciato in automatico, l'italiano non separa le migliaia sui
 *  numeri di quattro cifre, e «2900 €» accanto a «5.400 €» si legge come una svista. */
export function euro(centesimi: number): string {
  const v = centesimi / 100;
  return `${v.toLocaleString("it-IT", {
    useGrouping: true,
    maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
  })} €`;
}
