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
  /** Centesimi. Prezzo di lancio: quello che si paga davvero finché la promozione dura.
   *  Il campo `primoAnno` resta il LISTINO, ed è il numero che si mostra barrato. */
  primoAnnoLancio?: number;
  rinnovoLancio?: number;
  /** Chiavi Stripe. I prezzi si risolvono per queste, mai per id in variabile d'ambiente. */
  lookupAnno1?: string;
  lookupRinnovo?: string;
  lookupAnno1Lancio?: string;
  lookupRinnovoLancio?: string;
};

export const PIANI: Record<PianoKey, Piano> = {
  professional: {
    key: "professional",
    nome: "Fino a 5 aziende",
    descrizione: "Per chi parte: i primi mandati, tutto gia' incluso.",
    aziende: 5,
    accessi: 15,
    primoAnno: 59000,
    rinnovo: 47200,
    lookupAnno1: "evalisdeck_professional_anno1_v2",
    lookupRinnovo: "evalisdeck_professional_rinnovo_v2",
  },
  studio: {
    key: "studio",
    nome: "Fino a 15 aziende",
    descrizione: "Per lo studio avviato che segue un portafoglio.",
    aziende: 15,
    accessi: 30,
    primoAnno: 129000,
    rinnovo: 103200,
    lookupAnno1: "evalisdeck_studio_anno1_v2",
    lookupRinnovo: "evalisdeck_studio_rinnovo_v2",
  },
  studio_plus: {
    key: "studio_plus",
    nome: "Fino a 30 aziende",
    descrizione: "Per lo studio strutturato, con piu' collaboratori al lavoro.",
    aziende: 30,
    accessi: 60,
    primoAnno: 219000,
    rinnovo: 175200,
    lookupAnno1: "evalisdeck_studio_plus_anno1_v2",
    lookupRinnovo: "evalisdeck_studio_plus_rinnovo_v2",
  },
  enterprise: {
    key: "enterprise",
    nome: "Oltre 30 aziende",
    descrizione: "Reti di studi e mandati di filiera: capacita' e condizioni concordate.",
    // La base è quella del piano più capiente, e il negoziato si scrive nelle estensioni.
    // Così non servono capacità «nulle» da gestire ovunque, e l'accordo resta leggibile.
    aziende: 30,
    accessi: 60,
    primoAnno: 0,
    rinnovo: 0,
    trattativa: true,
  },
};

/* ⚠️ LE CHIAVI DEI PIANI NON CAMBIANO MAI.
 *
 * `org_entitlement.piano` contiene `professional | studio | studio_plus | enterprise` per
 * chi ha gia' pagato: rinominarle sarebbe una migrazione su dati vivi per guadagnare
 * un'etichetta. Cambia `nome`, che e' testo mostrato, e cambiano le capienze — che
 * SALGONO, quindi nessun abbonato in corso ci perde: il limite si legge da
 * `PIANI[piano].aziende`, e chi aveva dieci aziende ne trova quindici.
 *
 * ⚠️ E LE `lookup` SONO NUOVE (`_v2`). Su Stripe i prezzi sono immutabili: un importo
 * diverso e' un prezzo diverso. Le `_v1` restano su Stripe, archiviate ma vive, perche'
 * gli abbonamenti in corso ci puntano e `vociDelRinnovo` se le porta dietro nella fase 2
 * dello Schedule. Toglierle spezzerebbe il rinnovo di chi ha gia' pagato.
 */

export const ESTENSIONI = {
  /** Unità di VENDITA: un blocco vale cinque aziende. In `aziendeExtra` finiscono le
   *  aziende (cinque per blocco), non i blocchi.
   *
   *  ⚠️ Resta in vendita, ed e' importante: il CAMBIO FASCIA non esiste, quindi questo e'
   *  l'unico modo di crescere oltre la capienza senza disdire. Prezzato in modo che non
   *  convenga mai piu' della fascia superiore — chi cresce deve salire, non accumulare
   *  blocchi. */
  bloccoAziende: { aziende: 5, prezzo: 35000, lookup: "evalisdeck_blocco_aziende_v2" },
  /** Formazione e configurazione iniziale: una tantum, importo concordato entro la forbice. */
  avvioAssistito: { min: 50000, max: 80000, lookup: "evalisdeck_avvio_assistito_v1" },
} as const;

/* ⚠️ NON PIU' IN VENDITA, MA ANCORA RICONOSCIUTE.
 *
 * Gli accessi ora sono inclusi (15/30/60, tetti che nessuno studio vero raggiunge) e il
 * marchio dello studio e' compreso in ogni fascia: entrambe le estensioni spariscono dal
 * dialogo d'acquisto e dal checkout.
 *
 * Ma NON si cancellano da qui. `ricostruisciCapacita` in `provisioning.ts` ricava la
 * capacita' di un abbonamento LEGGENDO LE LOOKUP delle sue righe: una lookup che non
 * riconosce piu' non produce un errore, produce una capacita' piu' piccola — in silenzio,
 * al prossimo evento Stripe, a un cliente che quelle righe le ha pagate.
 *
 * Un pericolo si evita, non si filtra: restano qui, e chi le ha continua ad averle.
 */
export const ESTENSIONI_RITIRATE = {
  accesso: { prezzo: 15000, prezzoLancio: 7500, lookup: "evalisdeck_accesso_v1", lookupLancio: "evalisdeck_accesso_lancio_v1" },
  whiteLabel: { prezzo: 60000, prezzoLancio: 30000, lookup: "evalisdeck_white_label_v1", lookupLancio: "evalisdeck_white_label_lancio_v1" },
  bloccoAziendeV1: { aziende: 5, prezzo: 90000, prezzoLancio: 45000, lookup: "evalisdeck_blocco_aziende_v1", lookupLancio: "evalisdeck_blocco_aziende_lancio_v1" },
} as const;

/**
 * Il piano a cui appartiene una chiave del listino, o `null` se non è un piano.
 *
 * Le quattro varianti — listino/lancio × primo anno/rinnovo — sono lo stesso piano a
 * prezzi diversi. Sta qui perché la stessa domanda serve a chi legge le capacità da un
 * abbonamento e a chi costruisce le fasi del rinnovo: due copie divergerebbero al
 * primo listino nuovo, e la copia che diverge decide quanto paga qualcuno.
 */
/**
 * Le chiavi Stripe dei listini PRECEDENTI, per piano.
 *
 * ⚠️ SENZA QUESTE, CHI HA GIA' PAGATO PERDE L'ABBONAMENTO. Su Stripe i prezzi sono
 * immutabili: cambiare un importo significa creare una chiave nuova, e gli abbonamenti in
 * corso continuano a puntare alla vecchia per sempre. `chiavePiano` traduce una chiave nel
 * piano che rappresenta, ed e' la traduzione da cui dipendono due cose che non possono
 * sbagliare:
 *
 *   · `ricostruisciCapacita` ricava il piano dalle righe dell'abbonamento. Chiave non
 *     riconosciuta = nessun piano = capacita' azzerata, al prossimo evento Stripe, a un
 *     cliente che paga regolarmente;
 *   · `vociDelRinnovo` SOSTITUISCE la riga del piano col prezzo di rinnovo e porta avanti
 *     tutto il resto. Una riga di piano non riconosciuta verrebbe trattata come
 *     un'estensione e portata avanti INSIEME al rinnovo nuovo: due piani sulla stessa
 *     fattura.
 *
 * Quindi una chiave entra qui e non esce mai piu'. Cambiare listino significa aggiungere
 * le nuove a `PIANI` e spostare le vecchie qui, non sostituirle.
 */
export const LOOKUP_STORICHE: Record<PianoKey, readonly string[]> = {
  professional: [
    "evalisdeck_professional_anno1_v1",
    "evalisdeck_professional_rinnovo_v1",
    "evalisdeck_professional_anno1_lancio_v1",
    "evalisdeck_professional_rinnovo_lancio_v1",
  ],
  studio: [
    "evalisdeck_studio_anno1_v1",
    "evalisdeck_studio_rinnovo_v1",
    "evalisdeck_studio_anno1_lancio_v1",
    "evalisdeck_studio_rinnovo_lancio_v1",
  ],
  studio_plus: [
    "evalisdeck_studio_plus_anno1_v1",
    "evalisdeck_studio_plus_rinnovo_v1",
    "evalisdeck_studio_plus_anno1_lancio_v1",
    "evalisdeck_studio_plus_rinnovo_lancio_v1",
  ],
  enterprise: [],
};

export function chiavePiano(lookup: string | null | undefined): PianoKey | null {
  if (!lookup) return null;
  return (
    CHIAVI_PIANO.find((k) => {
      const p = PIANI[k];
      return (
        lookup === p.lookupAnno1 ||
        lookup === p.lookupRinnovo ||
        lookup === p.lookupAnno1Lancio ||
        lookup === p.lookupRinnovoLancio ||
        // ⚠️ Anche i listini precedenti: chi ha pagato l'anno scorso punta ancora a quelli.
        LOOKUP_STORICHE[k].includes(lookup)
      );
    }) ?? null
  );
}

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

/* ────────────────────────────── promozione di lancio ──────────────────────────────
 *
 * Un listino solo, più basso, col prezzo pieno mostrato barrato accanto. Non è un
 * doppio listino: il pieno esiste davvero su Stripe ed è quello che si praticherà
 * quando la promozione finisce — è la ragione per cui il barrato regge anche se
 * qualcuno lo contesta, perché la pubblicità ingannevole è vietata anche fra
 * professionisti.
 *
 * La promozione ha una SCADENZA, e alla scadenza il barrato sparisce da solo: nessuno
 * deve ricordarsi di togliere un numero, e il sistema non può diventare bugiardo per
 * inerzia. L'invariante è uno: si mostra ciò che si addebita. Mai il pieno addebitando
 * il ridotto, mai il ridotto addebitando il pieno.
 */

/** Un anno esatto dall'apertura commerciale, decisa dal committente il 2026-08-10. */
export const FINE_LANCIO = new Date("2027-08-10T23:59:59.000Z");

export function lancioAttivo(quando: Date = new Date()): boolean {
  return quando.getTime() <= FINE_LANCIO.getTime();
}

export type PrezzoDiVendita = {
  /** Centesimi effettivamente addebitati. */
  importo: number;
  /** La chiave Stripe che corrisponde a QUELL'importo. */
  lookup: string;
  /** Il listino da mostrare barrato. Assente quando non c'è promozione in corso. */
  listino?: number;
};

/**
 * Che cosa si vende, adesso, per un piano e una fase.
 *
 * Importo e chiave Stripe escono da qui INSIEME. Se il prezzo esposto lo calcolasse un
 * componente e la chiave la scegliesse il checkout, il giorno della scadenza uno dei
 * due cambierebbe prima dell'altro — e il cliente vedrebbe un numero pagandone un altro.
 */
export function prezzoDiVendita(
  piano: Piano,
  fase: "anno1" | "rinnovo",
  quando: Date = new Date(),
): PrezzoDiVendita | null {
  if (piano.trattativa) return null;
  const pieno = fase === "anno1" ? piano.primoAnno : piano.rinnovo;
  const lookupPieno = fase === "anno1" ? piano.lookupAnno1 : piano.lookupRinnovo;
  const scontato = fase === "anno1" ? piano.primoAnnoLancio : piano.rinnovoLancio;
  const lookupScontato = fase === "anno1" ? piano.lookupAnno1Lancio : piano.lookupRinnovoLancio;
  if (!lookupPieno) return null;

  if (lancioAttivo(quando) && scontato && lookupScontato) {
    return { importo: scontato, lookup: lookupScontato, listino: pieno };
  }
  return { importo: pieno, lookup: lookupPieno };
}

/** Come sopra, per le estensioni: stessa regola, stessa scadenza. */
export function prezzoEstensione(
  e: { prezzo: number; prezzoLancio?: number; lookup: string; lookupLancio?: string },
  quando: Date = new Date(),
): PrezzoDiVendita {
  // ⚠️ Il lancio e' FACOLTATIVO, come gia' per i piani: le estensioni in vendita oggi non
  // ne hanno, e senza promozione si vende il listino senza barrato. Il meccanismo resta
  // per una promozione futura invece di essere smontato e riscritto.
  return lancioAttivo(quando) && e.prezzoLancio !== undefined && e.lookupLancio !== undefined
    ? { importo: e.prezzoLancio, lookup: e.lookupLancio, listino: e.prezzo }
    : { importo: e.prezzo, lookup: e.lookup };
}

/**
 * Quante estensioni si possono comprare in un colpo solo.
 *
 * Stanno QUI e non nel dialogo d'acquisto perché il server deve applicare gli stessi
 * numeri: prima il client si fermava a 10 blocchi e 20 accessi mentre la server action
 * accettava 500 aziende e 200 accessi. Due verità sullo stesso limite, e quella che
 * decideva non era quella scritta nell'interfaccia.
 *
 * Non sono soglie di sicurezza — l'importo va solo verso l'alto, non è una perdita — ma
 * un tetto che il prodotto dichiara e non applica è un tetto che non esiste.
 */
export const MAX_BLOCCHI_AZIENDE = 10;
export const MAX_ACCESSI_EXTRA = 20;
