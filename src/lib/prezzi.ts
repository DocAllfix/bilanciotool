// Il listino, in un posto solo.
//
// Lo leggono l'entitlement (per sapere quanta capacità concedere), il checkout (per sapere
// cosa vendere), lo script di avvio di Stripe (per creare i prezzi), le pagine pubbliche e
// la pagina Abbonamento (per mostrarli). Una sola verità: un listino ricopiato in più posti
// diverge al primo aggiornamento, e il posto che diverge è sempre quello che decide se una
// richiesta passa.
//
// ⚠️ **Gli importi sono in CENTESIMI.** Stripe ragiona in centesimi, e un importo in euro
// diventa un addebito cento volte più piccolo senza che nessuno se ne accorga fino al primo
// pagamento vero.
//
// ⚠️ **Il listino del 6 novembre 2026.** Tre piani in vendita, ciascuno ANNUALE o MENSILE,
// sempre allo stesso prezzo: niente primo anno diverso dal rinnovo, niente Schedule a due
// fasi, niente prezzi di lancio. Tutto il resto — le fasce da un'azienda e da cinque, il
// Programma Fondatori, i blocchi di aziende — è ritirato DALLA VENDITA ma non dal
// RICONOSCIMENTO: chi l'ha pagato continua a leggerlo nelle righe del proprio abbonamento,
// e quelle righe devono continuare a dire che cosa ha comprato.

export type PianoKey = "singola" | "azienda" | "professional" | "studio" | "studio_plus" | "enterprise";

/** Prima i piani in vendita, nell'ordine in cui compaiono; poi i ritirati, che restano
 *  riconosciuti. ⚠️ Le chiavi NON cambiano mai: `org_entitlement.piano` le contiene. */
export const CHIAVI_PIANO: readonly PianoKey[] = ["azienda", "studio", "studio_plus", "enterprise", "singola", "professional"];

/** Come si paga: un anno anticipato o un mese per volta. */
export type Periodo = "anno" | "mese";
export const PERIODI: readonly Periodo[] = ["anno", "mese"];

export type Prezzo = {
  /** Centesimi, IVA esclusa. */
  importo: number;
  /** La chiave Stripe che corrisponde a QUELL'importo e a quel periodo. */
  lookup: string;
};

export type Piano = {
  key: PianoKey;
  nome: string;
  descrizione: string;
  /** A chi si rivolge: decide in che parte della pagina compare. */
  pubblico: "azienda" | "consulenti";
  /** Aziende attive incluse nel piano. Le archiviate e la demo non contano mai. */
  aziende: number;
  /** Persone che possono accedere, titolare compreso. */
  accessi: number;
  /** Vero solo per Enterprise: non si vende online, si tratta. */
  trattativa?: boolean;
  /** Vero per la fascia «Azienda»: l'organizzazione è un'azienda che lavora in casa, non uno
   *  studio. Accende l'assegnazione dei percorsi alle persone (`requirePercorso`): un
   *  collaboratore vede e scrive solo i percorsi che l'amministratore gli ha assegnato. */
  usoInterno?: boolean;
  /**
   * I prezzi in vendita oggi, annuale e mensile. ASSENTE = il piano non si compra online:
   * ritirato, oppure a trattativa. È l'unico interruttore della vendita: `fasceVendibili`
   * lo legge, il checkout lo pretende, e un piano senza `vendita` non ha un prezzo da
   * addebitare nemmeno se qualcuno forza la richiesta.
   */
  vendita?: Record<Periodo, Prezzo>;
};

export const PIANI: Record<PianoKey, Piano> = {
  /* ⚠️ L'AZIENDA CHE FA DA SÉ: il cliente primario dal 6 novembre 2026.
   *
   * Non uno studio con un portafoglio, ma un'azienda che porta avanti i propri percorsi in
   * casa: un responsabile si abbona, invita i colleghi e assegna a ciascuno i percorsi di cui
   * si occupa. Un'azienda sola (la propria), dieci accessi. */
  azienda: {
    key: "azienda",
    nome: "Azienda",
    descrizione: "Per l'azienda che fa da sé: un responsabile, i colleghi, a ciascuno i suoi percorsi.",
    pubblico: "azienda",
    aziende: 1,
    accessi: 10,
    usoInterno: true,
    vendita: {
      anno: { importo: 49900, lookup: "evalisdeck_azienda_anno_v2" },
      mese: { importo: 5900, lookup: "evalisdeck_azienda_mese_v1" },
    },
  },
  /* ⚠️ LE CHIAVI `studio` E `studio_plus` RESTANO, con le stesse capienze: chi le ha già
   * pagate a mano o su Stripe trova lo stesso limite, e il CHECK sul piano non si tocca.
   * Cambiano il nome mostrato e i prezzi, cioè le chiavi Stripe. */
  studio: {
    key: "studio",
    nome: "Consulenti fino a 15 aziende",
    descrizione: "Per il consulente che segue più aziende clienti, con i collaboratori dello studio.",
    pubblico: "consulenti",
    aziende: 15,
    accessi: 30,
    vendita: {
      anno: { importo: 129900, lookup: "evalisdeck_studio_anno_v3" },
      mese: { importo: 14900, lookup: "evalisdeck_studio_mese_v1" },
    },
  },
  studio_plus: {
    key: "studio_plus",
    nome: "Consulenti fino a 30 aziende",
    descrizione: "Per lo studio strutturato, con un portafoglio ampio e più collaboratori al lavoro.",
    pubblico: "consulenti",
    aziende: 30,
    accessi: 60,
    vendita: {
      anno: { importo: 199000, lookup: "evalisdeck_studio_plus_anno_v3" },
      mese: { importo: 22900, lookup: "evalisdeck_studio_plus_mese_v1" },
    },
  },
  enterprise: {
    key: "enterprise",
    nome: "Enterprise",
    descrizione: "Oltre 30 aziende, gruppi e reti: capacità e condizioni concordate.",
    pubblico: "consulenti",
    // La base è quella del piano più capiente, e il negoziato si scrive nelle estensioni.
    // Così non servono capacità «nulle» da gestire ovunque, e l'accordo resta leggibile.
    aziende: 30,
    accessi: 60,
    trattativa: true,
  },
  /* ⚠️ RITIRATI DALLA VENDITA il 6 novembre 2026. Restano perché `org_entitlement.piano`
   * può contenerli: un piano che sparisce da qui riporta chi l'ha pagato ai limiti di
   * riserva, in silenzio. */
  singola: {
    key: "singola",
    nome: "Un'azienda",
    descrizione: "Fascia ritirata: un'azienda, per chi seguiva un solo cliente.",
    pubblico: "consulenti",
    aziende: 1,
    accessi: 3,
  },
  professional: {
    key: "professional",
    nome: "Fino a 5 aziende",
    descrizione: "Fascia ritirata: i primi mandati in portafoglio.",
    pubblico: "consulenti",
    aziende: 5,
    accessi: 15,
  },
};

/** Il prezzo in vendita per un piano e un periodo, o `null` se il piano non si compra. */
export function prezzoDiVendita(piano: Piano, periodo: Periodo): Prezzo | null {
  if (piano.trattativa) return null;
  return piano.vendita?.[periodo] ?? null;
}

/** Le fasce che si comprano online, in ordine di vendita. Enterprise si concorda. */
export function fasceVendibili(): PianoKey[] {
  return CHIAVI_PIANO.filter((k) => prezzoDiVendita(PIANI[k], "anno") !== null);
}

/** Le fasce per chi segue aziende clienti: quelle che si scelgono per capienza. */
export function fasceConsulenti(): PianoKey[] {
  return fasceVendibili().filter((k) => PIANI[k].pubblico === "consulenti");
}

/** Vero se il piano si può comprare online adesso. Lo chiede il server prima della cassa. */
export function inVendita(piano: PianoKey): boolean {
  return fasceVendibili().includes(piano);
}

/* ────────────────────────────── mensile contro annuale ──────────────────────────────
 *
 * ⚠️ IL BARRATO È VERO PER COSTRUZIONE. Il numero mostrato barrato accanto all'annuale è
 * quanto costano dodici mesi pagati col mensile: un'offerta che esiste, che il cliente può
 * scegliere nella stessa pagina e che Stripe addebita davvero. Non è un «listino» inventato
 * per far sembrare grande lo sconto — quello sarebbe pubblicità ingannevole, vietata anche
 * fra professionisti (D.Lgs. 145/2007), e su un prodotto che vende conformità anche il
 * peggior biglietto da visita.
 *
 * ⚠️ E GLI ARROTONDAMENTI NON SONO MAI A NOSTRO FAVORE. Il risparmio e lo sconto si
 * arrotondano per DIFETTO, il costo mensile equivalente per ECCESSO: a un centesimo di
 * distanza dal vero, il numero mostrato è sempre quello meno conveniente per chi vende.
 */

/** Dodici mesi pagati col mensile, in centesimi: il barrato accanto all'annuale. */
export function costoAnnuoMensile(piano: Piano): number | null {
  const mese = prezzoDiVendita(piano, "mese");
  return mese ? mese.importo * 12 : null;
}

/** Quanto si risparmia in un anno scegliendo l'annuale, in centesimi. */
export function risparmioAnnuo(piano: Piano): number | null {
  const anno = prezzoDiVendita(piano, "anno");
  const barrato = costoAnnuoMensile(piano);
  if (!anno || barrato === null) return null;
  return Math.max(0, barrato - anno.importo);
}

/** Il risparmio annuo diviso per dodici, arrotondato per DIFETTO al centesimo. */
export function risparmioMensile(piano: Piano): number | null {
  const r = risparmioAnnuo(piano);
  return r === null ? null : Math.floor(r / 12);
}

/** Quanto «costa al mese» l'annuale, arrotondato per ECCESSO al centesimo. */
export function equivalenteMensile(piano: Piano): number | null {
  const anno = prezzoDiVendita(piano, "anno");
  return anno ? Math.ceil(anno.importo / 12) : null;
}

/** Lo sconto dell'annuale sul mensile, in punti percentuali interi per DIFETTO. */
export function scontoPercentuale(piano: Piano): number | null {
  const anno = prezzoDiVendita(piano, "anno");
  const barrato = costoAnnuoMensile(piano);
  if (!anno || !barrato) return null;
  return Math.floor(((barrato - anno.importo) * 100) / barrato);
}

/** Il mensile più basso fra le fasce in vendita: il «da … al mese» delle pagine pubbliche. */
export function prezzoMinimoMensile(): number {
  return Math.min(...fasceVendibili().map((k) => prezzoDiVendita(PIANI[k], "mese")!.importo));
}

/**
 * «Tre», per i titoli che contano le fasce.
 *
 * ⚠️ Era scritto a mano «Tre fasce» sulla pagina prezzi e sull'immagine di condivisione:
 * aggiungendo una fascia sarebbero rimasti bugiardi in silenzio. Un numero fuori elenco
 * SOLLEVA al build invece di stampare una cifra in mezzo a un titolo.
 */
export function quanteFasceInLettere(): string {
  const n = fasceVendibili().length;
  const parole: Record<number, string> = { 1: "Una", 2: "Due", 3: "Tre", 4: "Quattro", 5: "Cinque", 6: "Sei" };
  const p = parole[n];
  if (!p) throw new Error(`Numero di fasce senza parola: ${n}. Aggiungila in quanteFasceInLettere.`);
  return p;
}

/* ────────────────────────────── estensioni ────────────────────────────── */

export const ESTENSIONI = {
  /** Formazione e configurazione iniziale: una tantum, importo concordato entro la forbice.
   *  Non si vende alla cassa: la si concorda, e lo staff la addebita. */
  avvioAssistito: { min: 50000, max: 80000, lookup: "evalisdeck_avvio_assistito_v1" },
} as const;

/* ⚠️ NON PIU' IN VENDITA, MA ANCORA RICONOSCIUTE.
 *
 * Gli accessi sono inclusi, il marchio dello studio è compreso, e dal 6 novembre 2026 nemmeno
 * i blocchi di aziende si vendono più: chi cresce passa al piano più capiente, oltre c'è
 * Enterprise. (Stripe, fra l'altro, non mescola righe mensili e annuali nello stesso
 * abbonamento: un blocco annuale accanto a un piano mensile non si potrebbe nemmeno vendere.)
 *
 * Ma NON si cancellano da qui. `capacitaDaAbbonamento` in `provisioning.ts` ricava la
 * capacità di un abbonamento LEGGENDO LE LOOKUP delle sue righe: una lookup che non
 * riconosce più non produce un errore, produce una capacità più piccola — in silenzio,
 * al prossimo evento Stripe, a un cliente che quelle righe le ha pagate.
 */
export const ESTENSIONI_RITIRATE = {
  accesso: { prezzo: 15000, prezzoLancio: 7500, lookup: "evalisdeck_accesso_v1", lookupLancio: "evalisdeck_accesso_lancio_v1" },
  whiteLabel: { prezzo: 60000, prezzoLancio: 30000, lookup: "evalisdeck_white_label_v1", lookupLancio: "evalisdeck_white_label_lancio_v1" },
  bloccoAziendeV1: { aziende: 5, prezzo: 90000, prezzoLancio: 45000, lookup: "evalisdeck_blocco_aziende_v1", lookupLancio: "evalisdeck_blocco_aziende_lancio_v1" },
  bloccoAziendeV2: { aziende: 5, prezzo: 35000, lookup: "evalisdeck_blocco_aziende_v2" },
} as const;

/** Le chiavi di tutti i blocchi da cinque aziende, comprati in qualunque listino. */
export const LOOKUP_BLOCCHI: readonly string[] = [
  ESTENSIONI_RITIRATE.bloccoAziendeV2.lookup,
  ESTENSIONI_RITIRATE.bloccoAziendeV1.lookup,
  ESTENSIONI_RITIRATE.bloccoAziendeV1.lookupLancio,
];
/** Quante aziende vale un blocco. */
export const AZIENDE_PER_BLOCCO = 5;

/**
 * IL PROGRAMMA FONDATORI — RITIRATO il 6 novembre 2026.
 *
 * Non si vende più e non compare più da nessuna parte. Resta per una ragione sola: le sue
 * chiavi Stripe concedono la fascia «studio», e un abbonamento Fondatore creato a mano
 * prima del ritiro deve continuare a essere riconosciuto. Togliere queste righe non
 * produrrebbe un errore: produrrebbe un Fondatore in sola lettura al primo evento Stripe.
 */
export const FONDATORI = {
  piano: "studio" as PianoKey,
  lookupAnno1: "evalisdeck_fondatori_anno1_v1",
  lookupRinnovo: "evalisdeck_fondatori_rinnovo_v1",
} as const;

/**
 * Le chiavi Stripe dei listini PRECEDENTI, per piano.
 *
 * ⚠️ SENZA QUESTE, CHI HA GIA' PAGATO PERDE L'ABBONAMENTO. Su Stripe i prezzi sono
 * immutabili: cambiare un importo significa creare una chiave nuova, e gli abbonamenti in
 * corso continuano a puntare alla vecchia per sempre. `chiavePiano` traduce una chiave nel
 * piano che rappresenta, e `capacitaDaAbbonamento` ne ricava il piano dalle righe
 * dell'abbonamento: chiave non riconosciuta = nessun piano = capacità azzerata, al prossimo
 * evento Stripe, a un cliente che paga regolarmente.
 *
 * Quindi una chiave entra qui e non esce mai più. Cambiare listino significa aggiungere le
 * nuove a `PIANI` e spostare le vecchie qui, non sostituirle.
 */
export const LOOKUP_STORICHE: Record<PianoKey, readonly string[]> = {
  azienda: [
    // Listino del 17 ottobre 2026: primo anno e rinnovo.
    "evalisdeck_azienda_anno1_v1",
    "evalisdeck_azienda_rinnovo_v1",
  ],
  studio: [
    "evalisdeck_studio_anno1_v1",
    "evalisdeck_studio_rinnovo_v1",
    "evalisdeck_studio_anno1_lancio_v1",
    "evalisdeck_studio_rinnovo_lancio_v1",
    "evalisdeck_studio_anno1_v2",
    "evalisdeck_studio_rinnovo_v2",
  ],
  studio_plus: [
    "evalisdeck_studio_plus_anno1_v1",
    "evalisdeck_studio_plus_rinnovo_v1",
    "evalisdeck_studio_plus_anno1_lancio_v1",
    "evalisdeck_studio_plus_rinnovo_lancio_v1",
    "evalisdeck_studio_plus_anno1_v2",
    "evalisdeck_studio_plus_rinnovo_v2",
  ],
  enterprise: [],
  singola: [
    // Listino del 22 settembre 2026: c'è un abbonamento vivo che punta qui.
    "evalisdeck_singola_anno1_v1",
    "evalisdeck_singola_rinnovo_v1",
  ],
  professional: [
    "evalisdeck_professional_anno1_v1",
    "evalisdeck_professional_rinnovo_v1",
    "evalisdeck_professional_anno1_lancio_v1",
    "evalisdeck_professional_rinnovo_lancio_v1",
    "evalisdeck_professional_anno1_v2",
    "evalisdeck_professional_rinnovo_v2",
  ],
};

/**
 * Il piano a cui appartiene una chiave del listino — in vendita o storica — o `null` se
 * non è un piano.
 */
export function chiavePiano(lookup: string | null | undefined): PianoKey | null {
  if (!lookup) return null;
  return (
    CHIAVI_PIANO.find((k) => {
      const v = PIANI[k].vendita;
      return (
        lookup === v?.anno.lookup ||
        lookup === v?.mese.lookup ||
        // ⚠️ Anche i listini precedenti: chi ha pagato ieri punta ancora a quelli.
        LOOKUP_STORICHE[k].includes(lookup) ||
        // ⚠️ E le chiavi del Programma Fondatori, che concedono la loro fascia.
        (k === FONDATORI.piano && (lookup === FONDATORI.lookupAnno1 || lookup === FONDATORI.lookupRinnovo))
      );
    }) ?? null
  );
}

/** Il periodo di una chiave IN VENDITA, o `null` per le chiavi storiche e sconosciute. */
export function periodoDellaChiave(lookup: string | null | undefined): Periodo | null {
  if (!lookup) return null;
  for (const k of CHIAVI_PIANO) {
    const v = PIANI[k].vendita;
    if (v?.anno.lookup === lookup) return "anno";
    if (v?.mese.lookup === lookup) return "mese";
  }
  return null;
}

/* ────────────────────────────── limiti ────────────────────────────── */

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
 * I limiti che valgono davvero: capacità del piano **più** le estensioni.
 *
 * Senza piano si torna ai valori di riserva della piattaforma: è il caso di chi sta ancora in
 * demo, che non ha comprato niente e non deve per questo restare senza limiti.
 */
export function limitiEffettivi(
  abbonamento: { piano: PianoKey | null; aziendeExtra?: number | null; accessiExtra?: number | null },
  riserva: Limiti,
): Limiti {
  if (!abbonamento.piano || !(abbonamento.piano in PIANI)) return riserva;

  // `aziendeExtra` conta AZIENDE, non blocchi. Il blocco da cinque era un'unità di vendita:
  // comprarne due scriveva 10 qui. Tenere i blocchi in questa colonna renderebbe
  // inesprimibile un accordo Enterprise da 75 aziende, che multiplo di cinque non è per
  // obbligo, e costringerebbe ogni lettore a ricordarsi il fattore di conversione.
  const base = capacitaDelPiano(abbonamento.piano);
  const aziende = base.aziende + extraValido(abbonamento.aziendeExtra);
  const accessi = base.accessi + extraValido(abbonamento.accessiExtra);

  return { maxActiveCompanies: aziende, warnAtCompanies: sogliaAvviso(aziende), maxMembers: accessi };
}

/* ────────────────────────────── testo ────────────────────────────── */

/** Centesimi → importo leggibile in italiano. Niente decimali quando non servono. */
export function euro(centesimi: number): string {
  // ⚠️ NIENTE `toLocaleString`. Dipende dai dati ICU del runtime, e server e browser ne
  // hanno due diversi: lo stesso importo si stamperebbe in due modi nella stessa pagina,
  // React butterebbe via l'HTML del server con l'errore #418, e su una cifra di denaro non
  // è una questione estetica. `euro()` gira anche NEL BROWSER, dentro l'interruttore
  // mensile/annuale e il calcolatore della pagina prezzi.
  //
  // I centesimi si mostrano solo quando ci sono, e allora si mostrano ENTRAMBI: «41,59 €»
  // e non «41,6 €», perché un importo con un decimale solo non è una cifra di denaro.
  const segno = centesimi < 0 ? "-" : "";
  const n = Math.abs(Math.round(centesimi));
  const intero = String(Math.floor(n / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = n % 100;
  return `${segno}${intero}${cent ? "," + String(cent).padStart(2, "0") : ""} €`;
}

/** «1 azienda», «5 aziende». */
export function aziendeTesto(n: number): string {
  return `${n} ${n === 1 ? "azienda" : "aziende"}`;
}

/** «al mese» / «l'anno», per scrivere un prezzo accanto al suo periodo. */
export function perPeriodo(periodo: Periodo): string {
  return periodo === "anno" ? "l'anno" : "al mese";
}
