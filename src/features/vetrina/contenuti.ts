import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";
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

// ⚠️ `Record` e non `Partial` (7 novembre 2026): tutte e sedici le pagine esistono, e un
// modulo nuovo senza la sua pagina non compila. È la stessa garanzia di `RACCONTO`.
export const CONTENUTI: Record<ModuloAzienda, ContenutoPercorso> = {
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

  /* ─────────────────────────────── BILANCIO DI SOSTENIBILITÀ ─────────────────────────────── */
  bilancio: {
    slug: "bilancio-sostenibilita",
    modulo: "bilancio",
    titolo: "Bilancio di sostenibilità: quello che clienti e banche chiedono, con lo standard pensato per le PMI",
    descrizione:
      "Redigi il bilancio di sostenibilità secondo lo standard europeo VSME e i GRI: doppia materialità guidata, " +
      "indicatori su due esercizi, politiche e documento impaginato da consegnare a clienti e banche.",
    promessa:
      `I ${NUMERI.temi} temi di materialità con una guida per ciascuno, ${NUMERI.indicatori} indicatori su due ` +
      "esercizi con i derivati calcolati, le emissioni lette dall'inventario GHG e il documento impaginato. Quando " +
      "arriva il questionario di un cliente, la risposta è già scritta.",
    dolori: [
      {
        titolo: "La domanda arriva dai clienti, prima che dalla legge.",
        testo:
          "Dopo la riforma europea del 2026 l'obbligo di legge riguarda solo i grandi gruppi, ma sono proprio loro a chiedere i dati ai fornitori. Per le PMI l'Unione ha indicato uno standard volontario, il VSME, e ha invitato grandi imprese e banche a basare le proprie richieste su quello.",
        fonte: "Direttiva (UE) 2026/470 (Omnibus I); Raccomandazione (UE) 2025/1710 sul VSME",
      },
      {
        titolo: "La banca valuta anche questo.",
        testo:
          "Gli orientamenti europei sull'erogazione del credito chiedono alle banche di considerare i fattori ambientali, sociali e di governance dei clienti. Un bilancio di sostenibilità ordinato è un documento in più sul tavolo dell'istruttoria.",
        fonte: "Orientamenti EBA in materia di concessione e monitoraggio dei prestiti (EBA/GL/2020/06)",
      },
      {
        titolo: "Un bilancio senza materialità è un elenco di buone intenzioni.",
        testo:
          "Gli standard chiedono di partire dai temi rilevanti, valutati per l'impatto che l'azienda ha e per quello che subisce. Saltare questo passo produce un documento lungo che non risponde alla domanda di nessuno.",
        fonte: "GRI 3: Temi materiali 2021; ESRS 1, §3, adottato con il Regolamento delegato (UE) 2023/2772",
      },
    ],
    perChi: [
      "Per la PMI a cui un cliente, la capogruppo o la banca chiede un bilancio di sostenibilità o le risposte a un questionario ESG.",
      "Per chi vuole un documento costruito su uno standard riconosciuto, il VSME o i GRI, invece di un testo scritto da zero.",
      "Per chi ha già l'inventario GHG: le emissioni entrano nel bilancio senza essere ricopiate.",
    ],
    cosaFa: [
      ["Doppia materialità guidata", "Ogni tema con la sua guida e una proposta dal codice ATECO, che si conferma o si corregge: mai applicata in automatico."],
      ["Indicatori su due esercizi", "Quelli derivati, come tassi e intensità, si calcolano da soli e non si scrivono a mano."],
      ["Le emissioni dall'inventario", "La sezione emissioni legge l'inventario GHG della stessa azienda: un dato solo, mai due versioni."],
      ["Verifica delle lacune", "Prima di pubblicare il percorso elenca ciò che manca, e ti porta al punto da completare."],
      ["Documento impaginato", "Copertina, matrice di materialità, indicatori, capitoli e indice dei contenuti GRI ed ESRS."],
    ],
    primaDopo: [
      ["Un questionario a cui si risponde ogni volta da capo.", "Un bilancio da cui si prendono le risposte già pronte."],
      ["Temi scelti perché li hanno scelti gli altri.", "Temi valutati per impatto e rilevanza finanziaria, con la motivazione."],
      ["Indicatori calcolati a mano, ogni anno in modo diverso.", "Indicatori derivati calcolati dal sistema, confrontabili fra un esercizio e l'altro."],
    ],
    domande: [
      [
        "Il bilancio di sostenibilità è obbligatorio per la mia azienda?",
        "Per una PMI, di solito no per legge: dopo la riforma europea del 2026 l'obbligo riguarda i grandi gruppi. Ma sono loro, e le banche, a chiederlo ai fornitori, e lo standard volontario VSME è stato pensato proprio per rispondere a queste richieste.",
      ],
      [
        "Che differenza c'è fra VSME e GRI?",
        "Il VSME è lo standard europeo volontario per le PMI non quotate, più snello. I GRI sono lo standard internazionale più diffuso. Il percorso li segue entrambi, e l'indice dei contenuti nel documento dice dove si trova ciascuna informazione.",
      ],
      [
        "Posso partire dall'inventario delle emissioni?",
        "Sì: se l'azienda ha l'inventario GHG, la sezione emissioni lo legge direttamente. Se non lo ha, il bilancio te lo segnala fra le lacune.",
      ],
    ],
  },

  /* ─────────────────────────────── SISTEMA DI GESTIONE ESG ─────────────────────────────── */
  sgesg: {
    slug: "sistema-gestione-esg",
    modulo: "sgesg",
    titolo: "Sistema di gestione ESG: il progetto completo, dalla diagnosi al primo bilancio",
    descrizione:
      "Porta l'azienda da zero a un sistema di gestione ESG funzionante: squadra e perimetro, materialità, diagnosi " +
      "delle lacune, raccolta dei dati, strategia, bilancio e chiusura, con un metodo a fasi e le schede di lavoro.",
    promessa:
      `Un metodo in ${NUMERI.fasiSgesg} fasi con ${NUMERI.schedeSgesg} schede di lavoro: dall'avvio con la squadra ` +
      "e il perimetro alla diagnosi, dalla strategia al bilancio pubblicato. Ogni fase dice che cosa fare e che cosa " +
      "produrre, e i pezzi già coperti da altri percorsi ci portano dentro.",
    dolori: [
      {
        titolo: "Un progetto ESG senza metodo finisce in un documento che nessuno usa.",
        testo:
          "Gli standard chiedono di spiegare come si gestiscono i temi rilevanti: politiche, azioni, obiettivi misurabili e il modo in cui se ne segue l'efficacia. Senza un percorso, ognuno di questi pezzi vive in un file diverso e nessuno li tiene insieme.",
        fonte: "GRI 3: Temi materiali 2021, informativa 3-3; ESRS 2, Regolamento delegato (UE) 2023/2772",
      },
      {
        titolo: "La doppia rilevanza decide che cosa entra, e non si improvvisa.",
        testo:
          "Ogni tema va valutato due volte: per l'impatto che l'azienda ha su persone e ambiente, e per i rischi e le opportunità che porta all'azienda. È il passaggio da cui dipendono obiettivi, indicatori e capitoli del bilancio.",
        fonte: "ESRS 1, §3, Regolamento delegato (UE) 2023/2772",
      },
    ],
    perChi: [
      "Per l'azienda che deve costruire un sistema ESG da zero e vuole un piano di lavoro, non un modello vuoto.",
      "Per il responsabile che coordina più uffici e deve sapere chi consegna che cosa, e quando.",
      "Per il consulente che porta lo stesso progetto in più aziende e vuole lo stesso metodo ogni volta.",
    ],
    cosaFa: [
      ["Un metodo a fasi", "Dall'avvio alla chiusura: si lavora avanti e indietro, e lo stato di ogni fase lo dichiara chi la conduce, non il sistema."],
      ["Schede di lavoro pronte", "Verbali, perimetro, piano di raccolta dei dati, obiettivi: campi da compilare invece di pagine bianche."],
      ["Collegato ai percorsi che fanno già il lavoro", "Materialità, emissioni e capitoli del bilancio si lavorano nei loro percorsi: la fase mostra lo stato e ci porta dentro, senza copiare i dati."],
      ["Documenti di progetto", "Offerta, verbale di avvio, rapporto di diagnosi e dossier di chiusura, ciascuno con il codice di verifica."],
    ],
    primaDopo: [
      ["Un cronoprogramma in un foglio di calcolo.", "Fasi con stato, schede e documenti, in un posto solo."],
      ["Gli stessi dati copiati in tre documenti.", "Un dato solo, letto dal percorso dove nasce."],
    ],
    domande: [
      [
        "Serve se faccio già il bilancio di sostenibilità?",
        "Il bilancio è il documento; questo percorso è il progetto che porta a farlo bene e a mantenerlo: squadra, perimetro, diagnosi, raccolta dei dati e obiettivi. Le fasi che riguardano il bilancio portano dentro il suo percorso.",
      ],
      [
        "Quanto dura?",
        "Il metodo è pensato per un ciclo annuale: un esercizio dalla diagnosi al documento pubblicato. Ogni fase si può riaprire quando serve.",
      ],
    ],
  },

  /* ─────────────────────────────── AUTOVALUTAZIONE ESG ─────────────────────────────── */
  fornitore: {
    slug: "autovalutazione-esg-fornitori",
    modulo: "fornitore",
    titolo: "Autovalutazione ESG: rispondi ai questionari dei clienti con un indice e le evidenze",
    descrizione:
      "Misura quanto la tua azienda è pronta alle richieste ESG dei clienti: domande pesate per area, indice di " +
      "prontezza con soglia, piano di adeguamento e attestato con codice di verifica.",
    promessa:
      `${NUMERI.domandeFornitore} domande su ${NUMERI.areeFornitore} aree pesate, un indice di prontezza con la soglia ` +
      "del committente, il piano per colmare le lacune in ordine di convenienza e un attestato con codice di " +
      "verifica. Il questionario del prossimo cliente non ti trova impreparato.",
    dolori: [
      {
        titolo: "I questionari ESG arrivano dai clienti, uno diverso dall'altro.",
        testo:
          "I grandi gruppi devono rendere conto della propria catena del valore e girano le domande ai fornitori: politiche, emissioni, condizioni di lavoro, etica. Per le richieste alle PMI l'Unione ha indicato come riferimento lo standard volontario VSME.",
        fonte: "Direttiva (UE) 2022/2464 (CSRD), come modificata dalla Direttiva (UE) 2026/470; Raccomandazione (UE) 2025/1710",
      },
      {
        titolo: "Una risposta senza evidenza vale come nessuna risposta.",
        testo:
          "Chi valuta i fornitori chiede la prova: la politica firmata, il certificato, il registro. Dichiarare una pratica senza poterla documentare è il modo più rapido di perdere punti in una verifica.",
        fonte: "UNI ISO 20400:2017, approvvigionamento sostenibile",
      },
    ],
    perChi: [
      "Per l'azienda fornitrice che riceve questionari ESG dai clienti o dalla capogruppo.",
      "Per chi si qualifica in albi fornitori dove sostenibilità e governance pesano nella valutazione.",
      "Per chi vuole sapere quanto manca prima che lo dica un cliente.",
    ],
    cosaFa: [
      ["Domande pesate per area", "Governo della sostenibilità, ambiente, lavoro e diritti umani, etica e conformità, catena di fornitura: ogni area con il suo peso."],
      ["Un indice che non boccia ciò che non hai ancora compilato", "Si calcola sulle sole aree valutate: chi ne ha compilata una non risulta bocciato sulle altre."],
      ["Piano ordinato per convenienza", "Le lacune in ordine di punti recuperati per giorno di lavoro, con responsabile e scadenza."],
      ["Attestato verificabile", "Esito, punteggi e risposte, con un codice che chiunque può controllare online."],
    ],
    primaDopo: [
      ["Ogni questionario compilato da capo.", "Risposte ed evidenze in un posto, pronte per il prossimo."],
      ["Non sapere quanto si vale finché non arriva il punteggio del cliente.", "Un indice tuo, con la soglia e il piano per raggiungerla."],
    ],
    domande: [
      [
        "Sostituisce le piattaforme di valutazione dei clienti?",
        "No: ti prepara a rispondere. Le domande coprono le aree che quei questionari chiedono, e le evidenze raccolte qui sono le stesse che ti verranno chieste là.",
      ],
      [
        "L'attestato ha valore di certificazione?",
        "No, e il documento lo dice in chiaro: è un'autovalutazione. Il codice di verifica dimostra che il documento è autentico e non è stato modificato, non che un ente terzo l'abbia controllato.",
      ],
    ],
  },

  /* ─────────────────────────────── MODELLO 231 ─────────────────────────────── */
  mog231: {
    slug: "modello-231",
    modulo: "mog231",
    titolo: "Modello 231: la mappa dei rischi di reato e i presidi che proteggono l'azienda",
    descrizione:
      "Costruisci e mantieni il Modello di organizzazione, gestione e controllo del D.Lgs. 231/2001: processi " +
      "sensibili, reati presupposto, rischio inerente e residuo, presidi, procedure e relazione dell'Organismo di Vigilanza.",
    promessa:
      `I ${NUMERI.reati231} reati presupposto incrociati con i processi dell'azienda, ${NUMERI.presidi231} presidi, ` +
      `${NUMERI.documenti231} procedure e ${NUMERI.moduli231} moduli da adattare, la matrice reati-processi e la ` +
      "relazione dell'Organismo di Vigilanza. Il rischio che resta si calcola, non si dichiara.",
    dolori: [
      {
        titolo: "Il reato di un dipendente può diventare un problema dell'azienda.",
        testo:
          "Se è commesso nel suo interesse o a suo vantaggio, l'azienda risponde con sanzioni pecuniarie calcolate per quote e, nei casi più gravi, con sanzioni interdittive: sospensione delle autorizzazioni, divieto di contrattare con la pubblica amministrazione, esclusione da agevolazioni e finanziamenti.",
        fonte: "D.Lgs. 231/2001, art. 5, art. 9 e art. 10",
      },
      {
        titolo: "Il Modello esonera solo se è adottato prima, e attuato davvero.",
        testo:
          "Deve mappare le attività a rischio, prevedere protocolli e un sistema disciplinare, e avere un Organismo di Vigilanza che lo controlla. Un Modello copiato da un'altra azienda non descrive i tuoi rischi, ed è la prima cosa che si contesta.",
        fonte: "D.Lgs. 231/2001, art. 6 c. 1 e c. 2",
      },
      {
        titolo: "Chi ha un Modello deve avere anche il canale per le segnalazioni.",
        testo:
          "Il Modello deve prevedere i canali di segnalazione interna della legge sul whistleblowing, a prescindere dal numero di dipendenti.",
        fonte: "D.Lgs. 231/2001, art. 6 c. 2-bis; D.Lgs. 24/2023, art. 4",
      },
    ],
    perChi: [
      "Per l'azienda che vuole tutelarsi dalla responsabilità per i reati commessi nel suo interesse: il Modello non è obbligatorio per legge, ma è ciò che può esonerarla.",
      "Per chi lavora con la pubblica amministrazione o ha clienti che chiedono il Modello nei contratti e nei bandi.",
      "Per l'Organismo di Vigilanza, che deve controllare il Modello e riferire all'organo amministrativo.",
    ],
    cosaFa: [
      ["Rischio inerente e residuo", "Probabilità per impatto, poi l'adeguatezza dei presidi: il rischio che resta è un calcolo, non un'impressione."],
      ["Uno scenario non valutato non è accettabile", "In materia 231 l'onere è dell'ente: un incrocio fra reato e processo lasciato vuoto conta come scoperto, non come innocuo."],
      ["Procedure e moduli da adattare", "Parte generale e parte speciale, pronte da adattare invece di scritte da zero."],
      ["Matrice e relazione dell'OdV", "La matrice reati-processi e la relazione periodica dell'Organismo di Vigilanza, impaginate."],
    ],
    primaDopo: [
      ["Un Modello scritto anni fa e mai aggiornato.", "Una mappa dei rischi che si aggiorna quando cambiano processi o reati."],
      ["Rischi valutati a sensazione.", "Rischio inerente e residuo calcolati, con i presidi che li riducono."],
      ["Nessuna traccia del lavoro dell'Organismo.", "Una relazione periodica con lo stato dei presidi."],
    ],
    domande: [
      [
        "Il Modello 231 è obbligatorio?",
        "Per la legge no, salvo i casi in cui lo chiedono bandi, accreditamenti o contratti. È però il modo con cui l'azienda dimostra di aver fatto ciò che serviva per prevenire i reati, ed essere esonerata.",
      ],
      [
        "Sostituisce l'avvocato o il consulente 231?",
        "No. Organizza il lavoro e lo tiene aggiornato: mappa, valutazioni, presidi, procedure, relazione. Le scelte restano di chi adotta il Modello e di chi lo vigila.",
      ],
      [
        "Che cosa c'entra con il whistleblowing?",
        "Chi ha adottato un Modello deve avere un canale di segnalazione conforme, qualunque sia il numero di dipendenti. Il percorso delle segnalazioni è compreso nello stesso abbonamento.",
      ],
    ],
  },

  /* ─────────────────────────────── ANTICORRUZIONE ─────────────────────────────── */
  anticorruzione: {
    slug: "anticorruzione-iso-37001",
    modulo: "anticorruzione",
    titolo: "Prevenzione della corruzione: il sistema di gestione secondo la UNI ISO 37001",
    descrizione:
      "Valuta il rischio di corruzione dei soci in affari, attiva i controlli che ne discendono e costruisci il sistema " +
      "di gestione anticorruzione secondo la UNI ISO 37001, fino alla relazione all'organo di governo.",
    promessa:
      `Il rischio su ${NUMERI.dimensioni37001} dimensioni, gli obblighi che ne discendono, ${NUMERI.requisiti37001} ` +
      `requisiti della norma, ${NUMERI.procedure37001} procedure e ${NUMERI.moduli37001} moduli. Il sistema che un ` +
      "ente di certificazione si aspetta di trovare, con le evidenze al loro posto.",
    dolori: [
      {
        titolo: "La corruzione, anche fra privati, è un reato di cui risponde l'azienda.",
        testo:
          "Corruzione di pubblici ufficiali e corruzione tra privati sono reati presupposto della responsabilità dell'ente: se commessi nel suo interesse, l'azienda ne risponde con sanzioni pecuniarie e interdittive.",
        fonte: "D.Lgs. 231/2001, art. 25 e art. 25-ter; art. 2635 c.c.",
      },
      {
        titolo: "Un controllo che dipende dalla memoria non è un controllo.",
        testo:
          "La norma chiede verifiche sul personale e sui soci in affari, controlli finanziari e non finanziari, una funzione di conformità e il riesame dell'alta direzione. Senza un sistema che li tenga insieme, il primo audit trova i buchi.",
        fonte: "UNI ISO 37001, requisiti sulle attività operative e sulla valutazione delle prestazioni",
      },
    ],
    perChi: [
      "Per l'azienda che lavora con la pubblica amministrazione, partecipa a gare o ha soci in affari all'estero.",
      "Per chi vuole la certificazione UNI ISO 37001, o deve dimostrare a un cliente di avere controlli anticorruzione.",
      "Per chi ha già un Modello 231 e vuole un sistema strutturato e certificabile sulla corruzione.",
    ],
    cosaFa: [
      ["Rischio su più dimensioni", "Paese, interazione con pubblici ufficiali, natura e valore dell'incarico: un precedente per corruzione porta sempre a rischio critico."],
      ["Obblighi che si accendono da soli", "Dal livello di rischio discendono le verifiche dovute: non sono caselle da spuntare a mano."],
      ["Requisiti valutati con le evidenze", "Ogni requisito della norma con lo stato e la prova; quelli non valutati pesano zero."],
      ["Relazione all'organo di governo", "Il documento che la norma chiede di presentare al vertice, con lo stato del sistema."],
    ],
    primaDopo: [
      ["Un codice etico e nessuna verifica.", "Controlli dovuti, assegnati e documentati."],
      ["Verifiche sui soci in affari fatte quando capita.", "Verifiche proporzionate al rischio, con la frequenza scritta."],
    ],
    domande: [
      [
        "Serve se ho già il Modello 231?",
        "Sono complementari: il Modello 231 copre tutti i reati presupposto, la UNI ISO 37001 costruisce un sistema certificabile sulla sola corruzione, compresa quella fra privati e all'estero. Molte aziende li tengono insieme.",
      ],
      [
        "Il percorso porta alla certificazione?",
        "Ti porta ad avere il sistema e le evidenze che un ente di certificazione si aspetta. La certificazione la rilascia l'ente, dopo il proprio audit.",
      ],
    ],
  },

  /* ─────────────────────────────── DUE DILIGENCE DI FILIERA ─────────────────────────────── */
  filiera: {
    slug: "due-diligence-filiera",
    modulo: "filiera",
    titolo: "Due diligence di filiera: sapere chi sono i tuoi fornitori, e che rischi ti portano",
    descrizione:
      "Mappa i partner della catena di fornitura, valuta rischio e maturità di ciascuno, pianifica le verifiche e " +
      "redigi la dichiarazione annuale secondo le Linee guida OCSE e la direttiva europea sul dovere di diligenza.",
    promessa:
      "La mappa dei partner con il loro peso sulla spesa, il rischio su quattro assi, la maturità su " +
      `${NUMERI.areeFiliera} aree, il piano delle verifiche e la dichiarazione annuale, con ` +
      `${NUMERI.procedureFiliera} procedure e ${NUMERI.moduliFiliera} moduli pronti da adattare.`,
    dolori: [
      {
        titolo: "I grandi gruppi devono guardare la propria catena, e chiedono a te.",
        testo:
          "La direttiva europea sul dovere di diligenza obbliga i grandissimi gruppi a individuare e prevenire gli impatti su diritti umani e ambiente lungo la catena di attività. Il lavoro arriva ai fornitori, sotto forma di questionari, clausole contrattuali e verifiche.",
        fonte: "Direttiva (UE) 2024/1760 (CSDDD), come modificata dalla Direttiva (UE) 2026/470",
      },
      {
        titolo: "I prodotti fatti con lavoro forzato non si potranno vendere.",
        testo:
          "Dal 14 dicembre 2027 un prodotto realizzato con lavoro forzato, in qualunque punto della catena, non potrà essere immesso o messo a disposizione sul mercato dell'Unione, né esportato. Chi non conosce i propri fornitori non può dimostrare il contrario.",
        fonte: "Regolamento (UE) 2024/3015 sul divieto dei prodotti ottenuti con il lavoro forzato",
      },
      {
        titolo: "Il riferimento che tutti usano è lo schema OCSE.",
        testo:
          "Il dovere di diligenza si fa per passi: politica, individuazione dei rischi, misure, monitoraggio, comunicazione. È lo schema su cui sono costruite le norme europee, ed è quello che i clienti si aspettano di vedere.",
        fonte: "Linee guida OCSE sulla condotta d'impresa responsabile (2023); Guida OCSE sul dovere di diligenza (2018)",
      },
    ],
    perChi: [
      "Per l'azienda fornitrice di grandi gruppi, a cui arrivano clausole e questionari sulla catena di fornitura.",
      "Per chi acquista da paesi o settori a rischio e vuole sapere dove guardare per primo.",
      "Per chi deve presentare a clienti o investitori una dichiarazione sul proprio dovere di diligenza.",
    ],
    cosaFa: [
      ["Copertura misurata sulla spesa", "Dieci partner marginali valutati non compensano il grosso non guardato: la copertura si conta su quanto compri, non su quanti fornitori hai."],
      ["Rischio inerente e maturità", "Paese, settore, prodotto e modello di approvvigionamento; e il silenzio sulle aree critiche limita la maturità invece di premiarla."],
      ["Frequenza di verifica dal rischio", "Il piano dice chi verificare e ogni quanto, in base a rischio e maturità."],
      ["Dichiarazione annuale", "Il documento che riassume politica, rischi, misure e risultati del processo."],
    ],
    primaDopo: [
      ["Un elenco fornitori senza priorità.", "I partner ordinati per rischio e peso sulla spesa."],
      ["Questionari mandati a tutti e letti da nessuno.", "Verifiche proporzionate, con la frequenza scritta."],
    ],
    domande: [
      [
        "La mia azienda è obbligata dalla direttiva europea?",
        "Direttamente, solo se rientra fra i grandissimi gruppi a cui si applica. Più spesso l'obbligo arriva per via indiretta, dai clienti che la direttiva obbliga: è a loro che dovrai dimostrare di conoscere la tua catena.",
      ],
      [
        "Si collega all'autovalutazione ESG?",
        "Sì: le risposte sulla catena di fornitura dell'autovalutazione si propongono dai dati di filiera, con il motivo accanto, solo dove la domanda è ancora vuota.",
      ],
    ],
  },

  /* ─────────────────────────────── SISTEMA DI GESTIONE NIS2 ─────────────────────────────── */
  sgnis2: {
    slug: "sistema-gestione-nis2",
    modulo: "sgnis2",
    titolo: "Sistema di gestione NIS2: attuare le misure di sicurezza, e poterlo dimostrare",
    descrizione:
      "Attua gli obblighi del D.Lgs. 138/2024 con un sistema di gestione: roadmap, controlli con la loro frequenza, " +
      "scadenze, indicatori, verifica di conformità e relazione all'organo di amministrazione.",
    promessa:
      `Una roadmap in ${NUMERI.fasiNis2} fasi, ${NUMERI.controlliNis2} controlli ciascuno con la propria frequenza, ` +
      `${NUMERI.indicatoriNis2} indicatori, ${NUMERI.procedureNis2} procedure e ${NUMERI.moduliNis2} moduli. Un ` +
      "controllo dichiarato attuato e mai verificato torna «da verificare» da solo.",
    dolori: [
      {
        titolo: "L'organo di amministrazione risponde delle misure.",
        testo:
          "Gli organi di amministrazione dei soggetti NIS2 approvano le misure di gestione dei rischi, ne sovrintendono l'attuazione e ne sono responsabili. Sono anche tenuti a seguire una formazione in materia.",
        fonte: "D.Lgs. 138/2024, art. 23",
      },
      {
        titolo: "Le misure non sono un elenco da leggere: sono da attuare.",
        testo:
          "Il decreto chiede misure tecniche, operative e organizzative adeguate e proporzionate: gestione degli incidenti, continuità operativa, sicurezza della catena di approvvigionamento, controllo degli accessi, crittografia. L'Agenzia per la cybersicurezza nazionale ha fissato gli obblighi di base e i tempi per attuarli.",
        fonte: "D.Lgs. 138/2024, art. 24; determinazioni ACN sugli obblighi di base",
      },
      {
        titolo: "Un'ispezione chiede l'ultima evidenza, non la politica.",
        testo:
          "L'Agenzia può svolgere ispezioni e verifiche e chiedere le prove dell'attuazione. Un controllo scritto e mai eseguito si scopre in dieci minuti.",
        fonte: "D.Lgs. 138/2024, poteri di vigilanza dell'Agenzia per la cybersicurezza nazionale",
      },
    ],
    perChi: [
      "Per i soggetti essenziali e importanti che hanno ricevuto la comunicazione di inclusione dall'Agenzia.",
      "Per chi ha fatto l'autovalutazione e ora deve chiudere gli scostamenti.",
      "Per i fornitori di soggetti NIS2 che devono dimostrare misure di sicurezza strutturate.",
    ],
    cosaFa: [
      ["Controlli con la loro frequenza", "Ogni controllo ha una cadenza: uno attuato e non riverificato alla scadenza torna da verificare."],
      ["Scadenzario degli adempimenti", "Registrazioni, aggiornamenti e verifiche periodiche con le date, prima che scadano."],
      ["Indicatori di attuazione ed efficacia", "Misurano se il sistema funziona, non solo se esiste."],
      ["Relazione all'organo di amministrazione", "Il documento per chi approva le misure e ne risponde."],
    ],
    primaDopo: [
      ["Una politica di sicurezza approvata e dimenticata.", "Controlli con frequenza, responsabile ed evidenza."],
      ["L'evidenza cercata il giorno dell'ispezione.", "L'ultima verifica di ogni controllo, con la data."],
    ],
    domande: [
      [
        "Che differenza c'è con l'autovalutazione NIS2?",
        "L'autovalutazione dice se rientri e quanto sei lontano. Questo percorso serve ad attuare le misure e a tenerle in piedi nel tempo. Sono compresi entrambi nello stesso abbonamento.",
      ],
      [
        "Sostituisce una certificazione ISO/IEC 27001?",
        "No, e non è una certificazione. Se l'azienda ha già un sistema ISO/IEC 27001 molti controlli coincidono, e il percorso della Dichiarazione di applicabilità è compreso nell'abbonamento.",
      ],
    ],
  },

  /* ─────────────────────────────── GDPR ─────────────────────────────── */
  gdpr: {
    slug: "protezione-dati-gdpr",
    modulo: "gdpr",
    titolo: "Protezione dei dati: registro dei trattamenti, richieste, violazioni e valutazioni d'impatto",
    descrizione:
      "Organizza la conformità al GDPR: titolare e DPO, registro dei trattamenti, rischi, richieste degli interessati, " +
      "violazioni con le 72 ore calcolate, valutazioni d'impatto e relazione annuale.",
    promessa:
      `${NUMERI.requisitiGdpr} requisiti in ${NUMERI.gruppiGdpr} gruppi, ${NUMERI.trattamentiTipoGdpr} trattamenti ` +
      "tipici già impostati, i registri con i termini di legge calcolati e i documenti da esibire. Quando il Garante " +
      "chiede il registro, lo hai.",
    dolori: [
      {
        titolo: "Un dato personale perso va notificato entro 72 ore.",
        testo:
          "Al Garante, da quando ne vieni a conoscenza, con la natura della violazione, le conseguenze probabili e le misure adottate. Un ritardo va motivato.",
        fonte: "Regolamento (UE) 2016/679, art. 33",
      },
      {
        titolo: "Il registro dei trattamenti si tiene prima, non quando lo chiedono.",
        testo:
          "Quasi ogni azienda deve tenerlo: l'esenzione sotto i 250 dipendenti non vale per i trattamenti non occasionali, e quasi tutti lo sono, a cominciare dalle buste paga.",
        fonte: "Regolamento (UE) 2016/679, art. 30 par. 5",
      },
      {
        titolo: "Le richieste degli interessati hanno un mese.",
        testo:
          "Accesso, rettifica, cancellazione: la risposta va data senza ingiustificato ritardo e comunque entro un mese, prorogabile solo motivando. Le sanzioni arrivano a 20 milioni di euro o al 4% del fatturato mondiale.",
        fonte: "Regolamento (UE) 2016/679, art. 12 par. 3 e art. 83",
      },
    ],
    perChi: [
      "Per ogni azienda che tratta dati di dipendenti, clienti o fornitori: cioè quasi tutte.",
      "Per chi deve stabilire se è obbligato a nominare un responsabile della protezione dei dati, e per il DPO che deve riferire.",
      "Per chi gestisce richieste degli interessati e incidenti e vuole i termini sotto controllo.",
    ],
    cosaFa: [
      ["Trattamenti tipici già impostati", "Quelli che quasi ogni azienda ha, da confermare e adattare invece di scrivere da zero."],
      ["Le scadenze calcolate in ora italiana", "Il mese per rispondere a un interessato e le 72 ore per una violazione si calcolano da soli, anche quando la gravità non è ancora stabilita."],
      ["Rischi e valutazioni d'impatto", "Rischio per trattamento, e la valutazione d'impatto dove i criteri la rendono necessaria."],
      ["Un requisito non valutato pesa zero", "Saltare i requisiti difficili non fa salire l'indice."],
      ["Documenti senza dati personali", "Registro, politica, relazione annuale e gli altri documenti: dai registri di richieste e violazioni entrano solo i conteggi."],
    ],
    primaDopo: [
      ["Un registro in un foglio di calcolo di tre anni fa.", "Un registro aggiornato, con rischi e basi giuridiche."],
      ["Termini contati sul calendario a mano.", "Scadenze calcolate e segnalate prima che passino."],
      ["Nessuna prova del lavoro fatto.", "Una relazione annuale con lo stato dei requisiti."],
    ],
    domande: [
      [
        "Devo nominare un DPO?",
        "Dipende da che cosa tratti e su che scala, non dal numero di dipendenti. Il primo passo del percorso lo stabilisce, con il motivo scritto.",
      ],
      [
        "Il percorso conserva le richieste e le violazioni?",
        "Conserva un riferimento interno, le date e lo stato, non il nome della persona. E nei documenti che produce entrano solo i conteggi.",
      ],
    ],
  },

  /* ─────────────────────────────── SISTEMA INTEGRATO QAS ─────────────────────────────── */
  sgiqas: {
    slug: "sistema-integrato-qualita-ambiente-sicurezza",
    modulo: "sgiqas",
    titolo: "Sistema di gestione integrato: qualità, ambiente e sicurezza in un solo sistema",
    descrizione:
      "Gestisci insieme ISO 9001, ISO 14001 e ISO 45001: requisiti condivisi, aspetti ambientali, rischi per la salute " +
      "e sicurezza, indicatori, registri operativi e riesame di direzione.",
    promessa:
      `${NUMERI.requisitiQas} requisiti delle tre norme, con quelli comuni valutati una volta sola, ` +
      `${NUMERI.indicatoriQas} indicatori con target e soglia, ${NUMERI.registriQas} registri operativi, ` +
      `${NUMERI.procedureQas} procedure e ${NUMERI.moduliQas} moduli. Chi è certificato su una norma sola vede solo i suoi requisiti.`,
    dolori: [
      {
        titolo: "Audit interni e riesame di direzione non sono facoltativi.",
        testo:
          "Tutte e tre le norme li chiedono a intervalli pianificati, con l'evidenza dei risultati. Sono il primo posto in cui guarda chi viene a verificare il sistema.",
        fonte: "ISO 9001:2015, ISO 14001:2015 e ISO 45001:2018, punti 9.2 e 9.3",
      },
      {
        titolo: "Un sistema per la sicurezza ben fatto protegge anche dalla 231.",
        testo:
          "Per i reati di omicidio e lesioni colpose sul lavoro, un modello organizzativo conforme alle linee guida UNI-INAIL o allo standard britannico da cui è nata la ISO 45001 si presume conforme ai requisiti della legge, per le parti corrispondenti.",
        fonte: "D.Lgs. 81/2008, art. 30 c. 5; D.Lgs. 231/2001, art. 25-septies",
      },
      {
        titolo: "Tre sistemi separati sono tre volte lo stesso lavoro.",
        testo:
          "Le norme ISO di sistema condividono la stessa struttura: contesto, leadership, pianificazione, supporto, attività operative, valutazione, miglioramento. Gestirle separate vuol dire documentare tre volte gli stessi processi.",
        fonte: "Struttura armonizzata delle norme ISO di sistema (ISO/IEC Directives, Part 1, Annex SL)",
      },
    ],
    perChi: [
      "Per l'azienda certificata su una o più delle tre norme, che vuole arrivare all'audit con le evidenze in ordine.",
      "Per chi vuole aggiungere una seconda o una terza certificazione senza ricominciare da capo.",
      "Per il responsabile del sistema che tiene registri, indicatori e riesame.",
    ],
    cosaFa: [
      ["Il perimetro decide che cosa conta", "Scegli le norme del tuo certificato: i requisiti delle altre non compaiono e non pesano."],
      ["Requisiti comuni valutati una volta", "I punti condivisi dalle tre norme si valutano una volta e valgono per tutte."],
      ["Indicatori con target e soglia", "Un indicatore senza target non risulta «a target»: risulta non rilevato, com'è giusto."],
      ["Aspetti ambientali e rischi per la sicurezza", "Significatività degli aspetti e livello dei rischi calcolati, non dichiarati."],
      ["Registri e riesame", "I registri operativi e il verbale di riesame di direzione, impaginato."],
    ],
    primaDopo: [
      ["Tre manuali, tre serie di registri.", "Un sistema solo, con i requisiti comuni valutati una volta."],
      ["Indicatori raccolti la settimana prima dell'audit.", "Indicatori con target, soglia e andamento nel tempo."],
    ],
    domande: [
      [
        "Sono certificato solo ISO 9001: mi serve?",
        "Sì: imposti il perimetro sulla sola ISO 9001 e vedi solo i suoi requisiti. Il giorno in cui aggiungi la ISO 14001 o la ISO 45001, allarghi il perimetro senza rifare niente.",
      ],
      [
        "Sostituisce l'ente di certificazione?",
        "No: ti prepara all'audit. Il certificato lo rilascia l'ente, dopo la propria verifica.",
      ],
    ],
  },

  /* ─────────────────────────────── SA8000 ─────────────────────────────── */
  sa8000: {
    slug: "certificazione-sa8000",
    modulo: "sa8000",
    titolo: "SA8000: il sistema di gestione della responsabilità sociale, criterio per criterio",
    descrizione:
      "Prepara e mantieni il sistema SA8000:2026: criteri sui diritti dei lavoratori, procedure e moduli, registri e " +
      "manuale del sistema, pronti per l'audit di certificazione.",
    promessa:
      `${NUMERI.criteriSa8000} criteri, ${NUMERI.procedureSa8000} procedure da adottare, ${NUMERI.moduliSa8000} moduli ` +
      `e ${NUMERI.registriSa8000} registri, e il manuale del sistema impaginato. Un criterio attuato a metà pesa zero: ` +
      "un diritto applicato a metà non protegge a metà un lavoratore.",
    dolori: [
      {
        titolo: "La nuova edizione dello standard ha già un calendario.",
        testo:
          "La SA8000:2026 sostituisce l'edizione del 2014: dal primo gennaio 2027 nuove certificazioni e rinnovi si fanno sulla versione nuova, e le aziende già certificate devono completare l'autovalutazione entro il 31 dicembre 2026.",
        fonte: "SA8000:2026, calendario di transizione di Social Accountability International",
      },
      {
        titolo: "I clienti chiedono come lavorano le persone nella tua azienda.",
        testo:
          "Grandi marchi e capofila chiedono ai fornitori garanzie su lavoro minorile e forzato, orari, retribuzioni, salute e sicurezza, libertà di associazione. Sono i diritti che la direttiva europea sul dovere di diligenza mette al centro della catena di fornitura.",
        fonte: "Direttiva (UE) 2024/1760 (CSDDD), allegato sui diritti umani",
      },
    ],
    perChi: [
      "Per l'azienda fornitrice di marchi e capofila che chiedono la certificazione SA8000 o un audit sociale.",
      "Per chi è già certificato e deve passare all'edizione 2026 e mantenere il sistema fra un audit e l'altro.",
      "Per chi vuole un riferimento riconosciuto per dimostrare le proprie condizioni di lavoro.",
    ],
    cosaFa: [
      ["Criteri raggruppati come nello standard", "I fondazionali insieme, poi gli altri, ciascuno con la sua evidenza."],
      ["Parziale pesa zero", "Un criterio attuato a metà non conta come mezzo: il punteggio non suggerisce una tutela che non c'è."],
      ["Procedure e moduli da adottare", "Pronti da adattare all'azienda, invece di scritti da zero."],
      ["Manuale del sistema", "Il documento che descrive il sistema, impaginato e con codice di verifica."],
    ],
    primaDopo: [
      ["Un faldone preparato prima di ogni audit.", "Criteri, procedure e registri sempre aggiornati."],
      ["Uno stato dei criteri che nessuno sa dire.", "Un punteggio che conta solo ciò che è attuato davvero."],
    ],
    domande: [
      [
        "Il percorso rilascia la certificazione?",
        "No: la certificazione la rilascia un organismo accreditato dopo l'audit. Il percorso ti porta all'audit con il sistema in piedi e le evidenze pronte.",
      ],
      [
        "Che differenza c'è con il sistema di gestione sociale PAS 24000?",
        "Il tema è lo stesso, lo schema è diverso: SA8000 è lo standard più noto per gli audit sociali, la PAS 24000 segue la struttura delle norme ISO di sistema. Sono compresi entrambi nello stesso abbonamento.",
      ],
    ],
  },

  /* ─────────────────────────────── PAS 24000 ─────────────────────────────── */
  pas24000: {
    slug: "sistema-gestione-sociale-pas-24000",
    modulo: "pas24000",
    titolo: "Sistema di gestione sociale PAS 24000: le condizioni di lavoro con la struttura delle norme ISO",
    descrizione:
      "Costruisci il sistema di gestione sociale secondo la PAS 24000:2022: contesto e parti interessate, requisiti di " +
      "sistema e dell'Allegato A, rischi, indicatori sul personale, registri, politica e riesame.",
    promessa:
      `${NUMERI.requisitiPas} requisiti, ${NUMERI.requisitiSistemaPas} di sistema e ${NUMERI.requisitiAllegatoPas} ` +
      `sulle condizioni di lavoro, ${NUMERI.indicatoriPas} indicatori sul personale con ${NUMERI.derivatiPas} derivati ` +
      "calcolati e i registri dai reclami al riesame. Un indicatore senza i suoi dati resta vuoto: un divario " +
      "retributivo non esce al 100% perché manca una retribuzione.",
    dolori: [
      {
        titolo: "Il divario retributivo di genere va comunicato.",
        testo:
          "La direttiva europea sulla trasparenza retributiva obbliga le aziende dai 100 dipendenti a comunicare il divario retributivo di genere, con una cadenza che dipende dalla dimensione. Se supera il 5% senza una giustificazione, scatta una valutazione congiunta con i rappresentanti dei lavoratori.",
        fonte: "Direttiva (UE) 2023/970, art. 9 e art. 10",
      },
      {
        titolo: "Sopra i 50 dipendenti c'è già un rapporto sul personale da consegnare.",
        testo:
          "Ogni due anni, il rapporto sulla situazione del personale maschile e femminile: assunzioni, formazione, promozioni, retribuzioni. Sono dati che un sistema di gestione sociale tiene già in ordine.",
        fonte: "D.Lgs. 198/2006, art. 46",
      },
      {
        titolo: "Un sistema sociale vale quanto le sue evidenze.",
        testo:
          "La specifica chiede un sistema con la struttura delle norme ISO, dal contesto al riesame, più i requisiti sulle condizioni di lavoro dell'Allegato A, che non ammettono esclusioni.",
        fonte: "PAS 24000:2022, requisiti di sistema e Allegato A",
      },
    ],
    perChi: [
      "Per l'azienda che vuole un sistema sulle condizioni di lavoro integrabile con qualità, ambiente e sicurezza.",
      "Per chi deve rispondere a clienti e investitori su retribuzioni, orari, salute e sicurezza e dialogo con i lavoratori.",
      "Per chi prepara il rapporto sul personale o la comunicazione sul divario retributivo e vuole i dati in un posto solo.",
    ],
    cosaFa: [
      ["La struttura delle norme ISO", "Si integra con i sistemi di qualità, ambiente e sicurezza già certificati."],
      ["Indicatori che non inventano", "Un derivato esiste solo se ci sono tutti i suoi dati: un campo vuoto non produce un divario o un margine falso."],
      ["Rischi e fornitori", "Rischi sociali con le misure, e verifiche sui fornitori."],
      ["Registri, politica e riesame", "I registri del sistema e i documenti: manuale, politica, rapporto di conformità e verbale di riesame."],
    ],
    primaDopo: [
      ["Dati sul personale sparsi fra paghe e risorse umane.", "Indicatori sul personale in un posto, con i derivati calcolati."],
      ["Una politica sociale scritta e mai verificata.", "Requisiti valutati con le evidenze, e un riesame documentato."],
    ],
    domande: [
      [
        "Che cos'è la PAS 24000?",
        "È una specifica pubblicata dal BSI, l'ente di normazione britannico, per i sistemi di gestione sociale: copre condizioni di lavoro e diritti dei lavoratori con la stessa struttura delle norme ISO di sistema.",
      ],
      [
        "Che differenza c'è con SA8000?",
        "Il tema è lo stesso, lo schema è diverso: SA8000 è lo standard più noto per gli audit sociali, la PAS 24000 si integra con i sistemi ISO. Sono compresi entrambi nello stesso abbonamento.",
      ],
    ],
  },

  /* ─────────────────────────────── SOA ISO/IEC 27001 ─────────────────────────────── */
  soa: {
    slug: "statement-of-applicability-iso-27001",
    modulo: "soa",
    titolo: "Dichiarazione di applicabilità ISO/IEC 27001: ogni controllo, con la sua motivazione",
    descrizione:
      "Redigi lo Statement of Applicability richiesto dalla ISO/IEC 27001:2022: controlli in ambito, applicabilità con " +
      "le motivazioni, stato di attuazione, verifiche di coerenza e piano di attuazione.",
    promessa:
      "I controlli dell'Allegato A della ISO/IEC 27001 e quelli delle norme collegate per i servizi cloud e i dati " +
      `personali, ${NUMERI.controlliSoa} in tutto: per ciascuno applicabilità, motivazioni, stato e riferimento ` +
      "documentale, con le verifiche di coerenza e il piano. Un controllo applicabile senza stato pesa zero.",
    dolori: [
      {
        titolo: "È il documento che l'auditor apre per primo.",
        testo:
          "La norma chiede una Dichiarazione di applicabilità con i controlli necessari, la giustificazione di quelli inclusi e di quelli esclusi, e lo stato di attuazione. Senza, il sistema non è conforme.",
        fonte: "ISO/IEC 27001:2022, §6.1.3 d)",
      },
      {
        titolo: "Un controllo escluso senza motivo è un rilievo.",
        testo:
          "Ogni esclusione va giustificata, e il filo fra rischi, controlli scelti e dichiarazione deve reggere. È il punto su cui un auditor chiede spiegazioni.",
        fonte: "ISO/IEC 27001:2022, §6.1.3 b), c) e d)",
      },
      {
        titolo: "I clienti NIS2 chiedono la sicurezza dei fornitori.",
        testo:
          "I soggetti NIS2 devono gestire la sicurezza della propria catena di approvvigionamento, e la chiedono ai fornitori. Una Dichiarazione di applicabilità aggiornata è il modo più diretto di mostrare quali controlli applichi.",
        fonte: "D.Lgs. 138/2024, art. 24",
      },
    ],
    perChi: [
      "Per l'azienda che si certifica ISO/IEC 27001, o deve mantenere la certificazione.",
      "Per i fornitori di servizi digitali e cloud a cui i clienti chiedono quali controlli di sicurezza applicano.",
      "Per chi è soggetto NIS2 e vuole partire da un quadro di controlli riconosciuto.",
    ],
    cosaFa: [
      ["Motivazioni come scelte chiuse", "Valutazione del rischio, obbligo legale, obbligo contrattuale, requisito di business, buona prassi: ogni controllo dice perché è dentro o fuori."],
      ["Verifiche di coerenza", "Il sistema segnala ciò che non torna fra il contesto dichiarato e i controlli scelti, per esempio sui servizi cloud."],
      ["Uno stato che conta davvero", "Un controllo applicabile senza stato pesa zero: saltare i controlli difficili non alza l'indice."],
      ["La dichiarazione impaginata", "Tabella per sezione con riferimento, applicabilità, motivazioni, stato e documento, più piano e firme."],
    ],
    primaDopo: [
      ["Un foglio di calcolo con l'Allegato A copiato.", "Ogni controllo con motivazione, stato ed evidenza."],
      ["Esclusioni senza giustificazione.", "Esclusioni motivate, con le verifiche di coerenza."],
    ],
    domande: [
      [
        "Il percorso copre tutto il sistema ISO/IEC 27001?",
        "Copre la Dichiarazione di applicabilità e il piano di attuazione dei controlli, cioè il documento centrale dell'audit. La valutazione dei rischi e le altre parti del sistema restano da gestire secondo la norma.",
      ],
      [
        "Vale per i servizi cloud e la privacy?",
        "Sì: oltre ai controlli dell'Allegato A ci sono quelli delle norme collegate per i servizi cloud e per la gestione dei dati personali. Si includono solo se servono.",
      ],
    ],
  },
};

/** I contenuti in fila, con l'ordine del registro: lo stesso dei gruppi sulla home. */
export function contenutiPubblicati(): ContenutoPercorso[] {
  return MODULI_PER_AREA.flatMap((g) => g.moduli).map((m) => CONTENUTI[m.href]);
}
