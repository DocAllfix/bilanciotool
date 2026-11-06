import type { ModuloAzienda } from "@/features/companies/moduli";
import type { Problema } from "@/components/landing/problemi";
import { NUMERI } from "@/features/formazione/numeri";

// LE PAGINE PUBBLICHE DEI PERCORSI, COME DATO (6 novembre 2026).
//
// Una pagina per percorso, un modello solo (`/percorsi/[slug]`): ciò che cambia da un
// percorso all'altro sta qui, ciò che si ricava dal registro dei moduli — nome, norma,
// colore, passi, documenti prodotti — il modello lo legge da sé. È la stessa scelta del
// corpus e delle schede del metodo: sedici pagine scritte a mano divergerebbero dal
// prodotto alla prima modifica, e quella che diverge è la pagina che legge chi sta per
// comprare.
//
// ⚠️ SPIETATE MA VERE, come la home. Ogni obbligo, soglia o sanzione porta la sua fonte
// (`problemi-fonti-pure.test.ts` lo pretende anche qui), e si dice CHI è obbligato: un
// «obbligatorio per tutti» dove la legge pone soglie è un'affermazione falsa su una pagina
// indicizzata, in un prodotto che vende conformità.
//
// ⚠️ NESSUN CONTEGGIO SCRITTO A MANO: i numeri vengono da `NUMERI`, che li legge dal seme.
// È già successo che una pagina pubblica dicesse 126 requisiti dove erano 124.
//
// ⚠️ NESSUN TRATTINO LUNGO nel testo pubblico: è uno dei divieti della skill `impeccable`
// applicata alla landing. Si usano virgole e due punti.
//
// ⚠️ Lo slug, una volta pubblicato, non si cambia: finisce dentro articoli che non
// controlliamo noi.

export type ContenutoPercorso = {
  /** L'indirizzo pubblico: `/percorsi/<slug>`. */
  slug: string;
  modulo: ModuloAzienda;
  /** Il titolo della pagina: dice che cosa risolve, non come si chiama il modulo. */
  titolo: string;
  /** Per il `<title>`, la condivisione e il richiamo nel blog. */
  descrizione: string;
  /** Il paragrafo d'apertura: che cosa ottieni, detto in due righe. */
  promessa: string;
  /** Perché adesso: obblighi, sanzioni, richieste. Ognuno con la fonte. */
  dolori: Problema[];
  /** A chi serve, e quando è obbligatorio. */
  perChi: string[];
  /** Che cosa fa, in concreto: le funzioni che lo distinguono da un foglio di calcolo. */
  cosaFa: [string, string][];
  /** Senza e con: la differenza che si compra. */
  primaDopo: [string, string][];
  /** Le domande di chi valuta, con le risposte vere. Alimentano anche il `FAQPage`. */
  domande: [string, string][];
  /** Una prova interattiva nella pagina, se esiste. Oggi solo il bilancio energetico. */
  demo?: "energia";
  /** Con la prova: che cosa si tocca davvero, e che cosa resta nell'account. */
  provi?: string[];
  nonCiSono?: string[];
};

export const CONTENUTI: Partial<Record<ModuloAzienda, ContenutoPercorso>> = {
  /* ─────────────────────────────── INVENTARIO GHG ─────────────────────────────── */
  ghg: {
    slug: "inventario-gas-serra",
    modulo: "ghg",
    titolo: "Inventario dei gas serra: le emissioni della tua azienda, calcolate come chiede la norma",
    descrizione:
      "Calcola le emissioni di gas serra della tua azienda secondo la UNI EN ISO 14064-1:2018: sorgenti, " +
      "fattori di emissione ufficiali, doppio Scope 2 e rapporto pronto da consegnare a clienti e banche.",
    promessa:
      `Le ${NUMERI.categorieGhg} categorie della norma e le ${NUMERI.sorgentiGhg} sorgenti tipiche, una libreria di ` +
      `${NUMERI.fattoriGhg} fattori di emissione da fonti pubbliche, i calcoli fatti dal sistema e il rapporto ` +
      "impaginato con i contenuti minimi richiesti. Quando il cliente chiede le emissioni, hai un numero difendibile.",
    dolori: [
      {
        titolo: "Il cliente chiede le emissioni, non un'intenzione.",
        testo:
          "Le grandi aziende devono rendicontare anche le emissioni della propria catena di fornitura, e le chiedono ai fornitori: un numero, con il metodo e i fattori usati. Chi non lo ha deve stimarlo in fretta, e un numero stimato in fretta non regge alla prima domanda.",
        fonte: "Direttiva (UE) 2022/2464 (CSRD); UNI EN ISO 14064-1:2018",
      },
      {
        titolo: "Un numero senza metodo non vale niente in verifica.",
        testo:
          "La norma chiede confini dichiarati, sorgenti escluse con motivazione, fattori documentati e incertezza stimata. Un foglio di calcolo con una somma non è un inventario: è una cifra che nessuno può controllare.",
        fonte: "UNI EN ISO 14064-1:2018, §5, §6 e §9.3.1",
      },
      {
        titolo: "La banca chiede i dati di sostenibilità per valutare il credito.",
        testo:
          "Le linee guida europee sull'erogazione del credito chiedono alle banche di considerare i fattori ambientali dei clienti. Le emissioni sono il primo dato che chiedono, ed è meglio averlo prima che la domanda arrivi.",
        fonte: "Orientamenti EBA in materia di concessione e monitoraggio dei prestiti (EBA/GL/2020/06)",
      },
    ],
    perChi: [
      "Per l'azienda a cui un cliente, la capogruppo o la banca chiede le emissioni: oggi, per una PMI, l'obbligo non è di legge, è commerciale.",
      "Per chi deve redigere il bilancio di sostenibilità: le emissioni dell'inventario entrano nel bilancio senza essere ricopiate.",
      "Per chi vuole fissare obiettivi di riduzione su un anno base dichiarato e misurare l'andamento.",
    ],
    cosaFa: [
      ["Le sorgenti tipiche del tuo settore, già proposte", "Dal codice ATECO arrivano le voci che un'azienda come la tua di solito ha: le confermi, le correggi o le togli."],
      ["Fattori ufficiali, versionati", "Librerie ISPRA, DEFRA e IPCC per edizione: un aggiornamento non riscrive mai gli inventari già pubblicati."],
      ["Scope 2 a doppia rendicontazione", "Location-based e market-based, con garanzie d'origine e residual mix, come chiede la norma."],
      ["Esclusioni sempre motivate", "Una sorgente esclusa senza la motivazione scritta non passa: è il rilievo più frequente in audit."],
      ["Obiettivi sull'anno base", "Riduzioni dichiarate e andamento misurato sugli esercizi successivi."],
    ],
    primaDopo: [
      ["Un foglio di calcolo con le bollette e fattori trovati in rete.", "Fattori ufficiali versionati, scelti per sorgente, con la fonte scritta."],
      ["Una somma che nessuno sa ricostruire.", "Ogni tonnellata riconducibile alla sua quantità e al suo fattore."],
      ["Il rapporto scritto da zero ogni anno.", "Il rapporto impaginato con i contenuti minimi del §9.3.1, e l'esercizio dopo che parte dal precedente."],
    ],
    domande: [
      [
        "È obbligatorio per la mia azienda?",
        "Per una PMI, di solito no per legge: lo è perché lo chiede chi compra da te, o la banca. La norma di riferimento, la UNI EN ISO 14064-1, è volontaria; il percorso la segue punto per punto, così il numero regge anche quando qualcuno lo verifica.",
      ],
      [
        "Servono competenze tecniche?",
        "Servono i dati che l'azienda ha già: bollette, consumi di carburante, acquisti di gas refrigeranti. Il percorso dice per ogni sorgente quale documento cercare, e i calcoli li fa il sistema.",
      ],
      [
        "Il rapporto si può far verificare?",
        "Sì: è redatto con i contenuti minimi del §9.3.1 della norma, con le esclusioni motivate e i fattori documentati. Ogni versione pubblicata è congelata, ed è quella che consegni al verificatore.",
      ],
    ],
  },

  /* ─────────────────────────────── BILANCIO ENERGETICO ─────────────────────────────── */
  energetico: {
    slug: "bilancio-energetico",
    modulo: "energetico",
    titolo: "Bilancio energetico: vettori, usi finali e diagnosi",
    descrizione:
      "Prova il percorso della diagnosi energetica senza registrarti: metti i consumi dei tuoi " +
      "vettori, ripartiscili sugli usi finali e guarda dove va l'energia, con i fattori di " +
      "conversione della norma.",
    promessa:
      "Quanta energia entra nel sito, convertita in un'unità sola, e dove va: è il lavoro che chiede la norma, ed è il modo in cui si capisce su quale utenza conviene intervenire. Qui sotto ne provi un pezzo vero, senza registrarti.",
    dolori: [
      {
        titolo: "La diagnosi energetica ha una scadenza, e una sanzione.",
        testo:
          "Grandi imprese e imprese a forte consumo di energia la devono ogni quattro anni, secondo la norma tecnica. Mancarla costa da 4.000 a 40.000 euro.",
        fonte: "D.Lgs. 102/2014, art. 8 e art. 16 c. 1",
      },
      {
        titolo: "La bolletta dice quanto paghi, non dove va l'energia.",
        testo:
          "Senza la ripartizione sugli usi finali non si sa se pesa di più il forno, l'aria compressa o il riscaldamento, e ogni intervento si sceglie a intuito. La diagnosi serve a investire dove rende.",
        fonte: "UNI CEI EN 16247-1 e 16247-3",
      },
    ],
    perChi: [
      "Per le grandi imprese e le imprese a forte consumo di energia, obbligate alla diagnosi ogni quattro anni.",
      "Per qualunque azienda che voglia sapere dove va la propria energia prima di investire in efficienza.",
    ],
    cosaFa: [
      ["Vettori convertiti in un'unità sola", "Elettricità, gas, gasolio, biomassa, calore: kWh, tep e tonnellate di CO₂e con i fattori della norma."],
      ["La quadratura", "La ripartizione sugli usi finali segnala subito ciò che non torna rispetto ai consumi dichiarati."],
      ["Interventi col ritorno dell'investimento", "Ogni intervento con il risparmio stimato e il tempo di ritorno."],
    ],
    primaDopo: [
      ["Bollette in una cartella.", "Consumi per vettore convertiti, con costi e emissioni."],
      ["Interventi scelti a intuito.", "Interventi ordinati per risparmio e tempo di ritorno."],
    ],
    domande: [
      [
        "La mia azienda è obbligata?",
        "Lo sono le grandi imprese e le imprese a forte consumo di energia iscritte nell'elenco dedicato, ogni quattro anni. Per tutte le altre è una scelta, e spesso la più utile prima di un investimento.",
      ],
      [
        "Devo registrarmi per provarlo?",
        "No: la prova qui sotto si usa senza account e i numeri restano nel tuo browser. Il salvataggio, gli altri passi e il documento impaginato stanno nell'account.",
      ],
    ],
    demo: "energia",
    provi: [
      "I consumi dell'anno per ciascun vettore, con costi e conversione in kWh, tep e tonnellate di CO₂e",
      "La ripartizione sugli usi finali, con la quadratura che segnala subito ciò che non torna",
      "Dove va l'energia: diagramma di flusso e graduatoria degli usi che pesano di più",
    ],
    nonCiSono: [
      "Il documento impaginato e il PDF da consegnare",
      "Il salvataggio: qui non si registra niente, i numeri restano nel tuo browser",
      "Indicatori su due anni, interventi con il ritorno dell'investimento, racconto e verifica",
    ],
  },

  /* ─────────────────────────────── SEGNALAZIONI ─────────────────────────────── */
  segnalazioni: {
    slug: "whistleblowing-segnalazioni",
    modulo: "segnalazioni",
    titolo: "Whistleblowing: il canale di segnalazione che la legge chiede, organizzato e dimostrabile",
    descrizione:
      "Organizza la gestione delle segnalazioni secondo il D.Lgs. 24/2023: canali, gestore, procedura, " +
      "termini di riscontro e relazione periodica. Per le aziende dai 50 dipendenti e per chi ha un Modello 231.",
    promessa:
      `I ${NUMERI.requisitiWb} requisiti del decreto in ${NUMERI.ambitiWb} ambiti, la procedura e i moduli da ` +
      "adattare, i termini di legge calcolati e la relazione periodica da presentare. Quando qualcuno chiede " +
      "se il canale funziona, puoi dimostrarlo.",
    dolori: [
      {
        titolo: "Il canale è obbligatorio dai 50 dipendenti, e con un Modello 231.",
        testo:
          "Lo devono avere le aziende private che nell'ultimo anno hanno avuto in media almeno 50 lavoratori, quelle di alcuni settori regolati a prescindere dal numero, e tutte quelle che hanno adottato un Modello 231.",
        fonte: "D.Lgs. 24/2023, art. 2 c. 1 lett. q) e art. 4",
      },
      {
        titolo: "Senza canale o con una procedura non conforme, la sanzione arriva fino a 50.000 euro.",
        testo:
          "ANAC sanziona da 10.000 a 50.000 euro chi non ha istituito i canali, non ha adottato le procedure o le ha adottate non conformi. E per le sue linee guida una casella di posta, anche certificata, non è un canale idoneo.",
        fonte: "D.Lgs. 24/2023, art. 21 c. 1 lett. b); Linee guida ANAC sui canali interni di segnalazione",
      },
      {
        titolo: "I termini corrono dal giorno in cui arriva la segnalazione.",
        testo:
          "Avviso di ricevimento entro sette giorni, riscontro entro tre mesi. Un termine mancato è una violazione, e si scopre quando qualcuno lo contesta.",
        fonte: "D.Lgs. 24/2023, art. 5 c. 1",
      },
    ],
    perChi: [
      "Per le aziende private con almeno 50 lavoratori in media nell'ultimo anno.",
      "Per tutte le aziende che hanno adottato un Modello 231, qualunque sia la dimensione.",
      "Per le aziende dei settori regolati elencati dal decreto, a prescindere dal numero di lavoratori.",
    ],
    cosaFa: [
      ["La verifica del canale, forma per forma", "Scritto, orale e incontro diretto: il decreto li chiede tutti, e il percorso distingue un canale non istituito da uno previsto e spento."],
      ["I termini calcolati", "Avviso di ricevimento e riscontro con le scadenze di legge, calcolate sul calendario e non a mano."],
      ["Procedura e moduli pronti da adattare", `${NUMERI.procedureWb} procedure e ${NUMERI.moduliWb} moduli, con l'informativa e i ruoli già impostati.`],
      ["La relazione periodica", "Il documento per l'organo amministrativo, con i conteggi e lo stato dei requisiti."],
      ["Nessun nominativo in piattaforma", "Il percorso organizza il sistema, non raccoglie le segnalazioni: il legame fra codice e persona resta al gestore, fuori dall'applicazione."],
    ],
    primaDopo: [
      ["Un indirizzo email comunicato ai dipendenti.", "I canali che il decreto chiede, verificati uno per uno."],
      ["Scadenze tenute a memoria.", "Termini calcolati e segnalati prima che scadano."],
      ["Nessuna prova di come funziona.", "Una procedura scritta e una relazione periodica da esibire."],
    ],
    domande: [
      [
        "Il percorso raccoglie le segnalazioni?",
        "No, di proposito. Ti aiuta a organizzare il sistema che la legge chiede e a dimostrare che funziona: canali, gestore, procedura, termini, relazione. Le segnalazioni passano dal canale che hai scelto, e i nominativi restano a chi le gestisce.",
      ],
      [
        "Una casella di posta basta come canale?",
        "Per le linee guida ANAC no, nemmeno se è certificata: non garantisce la riservatezza che il decreto pretende. Il percorso ti fa verificare ogni forma di canale prevista.",
      ],
      [
        "Ho meno di 50 dipendenti: devo farlo?",
        "Se hai adottato un Modello 231, sì. Se operi in uno dei settori regolati elencati dal decreto, sì. Negli altri casi no, ma un canale ben organizzato resta una tutela.",
      ],
    ],
  },

  /* ─────────────────────────────── NIS2 ─────────────────────────────── */
  nis2: {
    slug: "nis2-autovalutazione",
    modulo: "nis2",
    titolo: "NIS2: capire se la tua azienda è coinvolta, e quanto è lontana dalla conformità",
    descrizione:
      "Autovalutazione NIS2 secondo il D.Lgs. 138/2024: perimetro, settori, misure di sicurezza e notifica " +
      "degli incidenti, con la relazione sul livello di conformità.",
    promessa:
      `Il perimetro del decreto sui ${NUMERI.settoriNis2} settori degli allegati, i ` +
      `${NUMERI.requisitiNis2Autovalutazione} requisiti dell'autovalutazione e una relazione che dice dove sei ` +
      "e che cosa manca. Prima di spendere in consulenze e strumenti, sai che cosa ti serve davvero.",
    dolori: [
      {
        titolo: "NIS2 riguarda più aziende di quanto si pensi.",
        testo:
          "Si applica alle medie e grandi imprese di molti settori, dall'energia ai trasporti, dai rifiuti all'alimentare, fino a parte della manifattura e ai servizi digitali. Chi rientra deve registrarsi ogni anno sulla piattaforma dell'Agenzia per la cybersicurezza nazionale.",
        fonte: "D.Lgs. 138/2024, artt. 3 e 7, allegati I e II",
      },
      {
        titolo: "Le sanzioni si misurano sul fatturato mondiale.",
        testo:
          "Fino a 10 milioni di euro o al 2% del fatturato per i soggetti essenziali, fino a 7 milioni o all'1,4% per gli importanti. E gli organi di amministrazione rispondono dell'attuazione delle misure.",
        fonte: "D.Lgs. 138/2024, di recepimento della Direttiva (UE) 2022/2555",
      },
      {
        titolo: "Un incidente va notificato in 24 ore.",
        testo:
          "Preallarme entro 24 ore, notifica entro 72, relazione finale entro un mese. Senza una procedura pronta, quei termini si perdono mentre si cerca di capire che cosa è successo.",
        fonte: "D.Lgs. 138/2024, art. 25",
      },
    ],
    perChi: [
      "Per le medie e grandi imprese dei settori elencati negli allegati del decreto.",
      "Per le aziende che non sanno ancora se rientrano: il percorso parte proprio dal perimetro.",
      "Per i fornitori di soggetti NIS2, a cui i clienti chiedono di dimostrare le proprie misure di sicurezza.",
    ],
    cosaFa: [
      ["Il perimetro, prima di tutto", "Settore, dimensione e ruolo: il percorso dice se rientri, e come soggetto essenziale o importante."],
      ["I requisiti, uno per uno", "Ogni requisito con la sua guida, lo stato di attuazione e l'evidenza che lo dimostra."],
      ["La distanza dalla conformità", "Un indice che conta zero ciò che non è stato valutato: non sale saltando le domande difficili."],
      ["La relazione sul livello di conformità", "Il documento da portare all'organo di amministrazione, con ciò che manca e le priorità."],
    ],
    primaDopo: [
      ["Non sapere se si rientra.", "Il perimetro dichiarato, con il motivo."],
      ["Un elenco di misure trovato in rete.", "I requisiti del decreto, valutati con le evidenze."],
      ["Nessuna idea di quanto manca.", "Una relazione con lo stato e le priorità."],
    ],
    domande: [
      [
        "Come so se la mia azienda rientra in NIS2?",
        "Dipende dal settore, dalla dimensione e, in alcuni casi, dal ruolo che hai per altri soggetti. Il primo passo del percorso è proprio questo: si risponde a poche domande e si ottiene il perimetro, con il motivo scritto.",
      ],
      [
        "Questa autovalutazione basta per essere conformi?",
        "No: dice dove sei e che cosa manca. Per attuare le misure c'è il percorso del sistema di gestione NIS2, compreso nello stesso abbonamento.",
      ],
    ],
  },
};

/** I contenuti in fila, con l'ordine del registro. */
export function contenutiPubblicati(): ContenutoPercorso[] {
  return Object.values(CONTENUTI).filter((c): c is ContenutoPercorso => Boolean(c));
}
