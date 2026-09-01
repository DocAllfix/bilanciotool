import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Le sezioni proprie del Bilancio energetico.
 *
 * Il contenuto di METODO viene dal corso scritto dal committente (diagnosi UNI CEI EN
 * 16247, riesame ISO 50001) e regge: le fonti documentali per vettore, la quadratura, i
 * tre metodi di determinazione, il fattore di carico, gli errori tipici.
 *
 * ⚠️ Il contenuto di PRODOTTO è stato riscritto per intero, perché quello del corso
 * descriveva il PROTOTIPO e non EvalisDeck. Preso com'era, avrebbe insegnato il falso a un
 * cliente pagante: «tutto resta sul dispositivo, nessun server, nessun account», «il backup
 * è l'esportazione JSON dal Portafoglio», «pulizia della cronologia = dati persi», «stampa
 * dal browser, Salva come PDF». Qui non esiste nessuno di quei comandi, e i dati stanno su
 * Postgres con isolamento per studio a livello di database.
 *
 * ⚠️ Ogni numero citato viene da `NUMERI`, mai scritto a mano: la ragione sta in
 * `numeri.ts`, ed è costata un dato falso finito in un documento commerciale altrui.
 */
export const ENERGETICO: Sezione[] = [
  {
    id: "passo-1-sito",
    titolo: "Passo 1 · Sito e perimetro",
    minuti: 4,
    sommario: "Chi rendiconta, quale stabilimento, con quale confine e quale unità di produzione.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il passo 1 identifica il soggetto e lo stabilimento oggetto del bilancio. Non è un modulo anagrafico: tre delle scelte fatte qui condizionano tutti i numeri che verranno dopo.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Scelta", "Perché pesa"],
        righe: [
          [
            "Standard di riferimento",
            "Il documento nasce come diagnosi energetica UNI CEI EN 16247-1; adattalo se serve al riesame energetico ISO 50001.",
          ],
          [
            "Perimetro",
            "Ciò che escludi va dichiarato qui, non taciuto. In verifica la domanda non è «avete misurato tutto», è «che cosa avete escluso e perché».",
          ],
          [
            "Unità di produzione",
            "È il denominatore di tutti gli indicatori: t, pezzi, m², litri. Sceglila e non cambiarla fra un esercizio e l'altro, o il confronto con l'anno base non significa più niente.",
          ],
        ],
      },
      {
        tipo: "prosa",
        testo: `Il passo si considera completo con i **${NUMERI.profiloAttesiEnergia} campi** del profilo valorizzati. I turni di lavoro non sono un dettaglio burocratico: servono a leggere l'andamento mensile e il carico di base al passo 4.`,
      },
    ],
  },

  {
    id: "passo-2-vettori",
    titolo: "Passo 2 · Vettori energetici",
    minuti: 7,
    sommario: `L'inventario dell'energia che entra: ${NUMERI.vettori} vettori, con quantità, costo e andamento mensile.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il catalogo porta **${NUMERI.vettori} vettori** fra elettrico, termico e trazione. Per ciascuno si inserisce la quantità dell'esercizio, quella dell'anno precedente, il costo annuo e i dodici mesi.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Vettore", "Unità", "Dove si prende il dato"],
        righe: [
          [
            "Energia elettrica prelevata",
            "kWh",
            "Fatture per fascia, anno solare completo; ricostruzione per competenza se le fatture sono a cavallo",
          ],
          ["di cui coperta da garanzie d'origine", "kWh", "Fattura o contratto di fornitura"],
          [
            "Autoproduzione fotovoltaica autoconsumata",
            "kWh",
            "Contatori dell'inverter: produzione meno immissione in rete",
          ],
          [
            "Gas naturale",
            "Smc",
            "Fatture; se il contatore serve processo e riscaldamento insieme, la separazione si legge dall'andamento mensile",
          ],
          [
            "Gasolio, GPL, olio combustibile",
            "l / kg",
            "DDT e fatture, registro UTF: giacenza iniziale più acquisti meno giacenza finale",
          ],
          ["Biomassa legnosa", "t", "Bolle di consegna"],
          ["Teleriscaldamento, vapore acquistato", "kWh / t", "Fatture del fornitore di calore"],
          ["Gasolio e benzina per trazione", "l", "Schede carburante e fuel card della flotta"],
        ],
      },
      {
        tipo: "formula",
        testo: "kWh = quantità × PCI    ·    tep = quantità × f_tep    ·    tCO₂e = quantità × FE ÷ 1000",
      },
      {
        tipo: "prosa",
        testo:
          "Dal costo annuo il prodotto ricava il prezzo medio in euro per kWh, che userà al passo 5 per valorizzare i risparmi degli interventi. Non è un dato accessorio: senza costo, il ritorno di un intervento non si calcola.",
      },
      {
        tipo: "elenco",
        voci: [
          "Zero non è vuoto. Vettore non presente: lascia vuoto. Vettore presente con consumo nullo: scrivi 0.",
          "L'andamento mensile va compilato almeno per l'elettrico e per il gas: alimenta il grafico stagionale e la stima del carico di base.",
          "Metà del passo si colora solo quando i vettori valorizzati hanno anche il costo annuo.",
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Doppi conteggi",
        testo:
          "Il gasolio da riscaldamento e quello per autotrazione sono due righe distinte: non vanno sommati. E l'energia immessa in rete dal fotovoltaico non è consumo del sito: conta solo l'autoconsumo.",
      },
    ],
  },

  {
    id: "passo-3-usi",
    titolo: "Passo 3 · Usi finali e quadratura",
    minuti: 9,
    sommario: `Dove va a finire l'energia entrata: ${NUMERI.usiFinali} usi in ${NUMERI.areeEnergia} aree, e il residuo che deve chiudersi.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `È il cuore tecnico del bilancio. Il catalogo porta **${NUMERI.usiFinali} usi finali** distribuiti su **${NUMERI.areeEnergia} aree funzionali**: si attivano soltanto quelli pertinenti al sito.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Area", "Che cosa contiene", "Esempi"],
        righe: [
          [
            "Attività principali",
            "Le lavorazioni che realizzano il prodotto",
            "Forni fusori e di trattamento, formatura, finitura, essiccazione",
          ],
          [
            "Servizi ausiliari",
            "Impianti che servono il processo senza trasformare il prodotto",
            "Aria compressa, freddo di processo, pompaggi, ventilazione, vapore",
          ],
          [
            "Servizi generali",
            "Utenze dell'edificio e delle funzioni non produttive",
            "Riscaldamento e raffrescamento ambienti, illuminazione, uffici",
          ],
          ["Trasporti", "Movimentazione interna e flotta", "Carrelli e mezzi di piazzale, flotta su strada"],
        ],
      },
      { tipo: "formula", testo: "residuo = energia entrata − Σ energia attribuita agli usi" },
      {
        tipo: "prosa",
        testo: `La quadratura si considera chiusa quando il residuo resta entro il **±${NUMERI.tolleranzaQuadraturaPct}%** dell'energia entrata, per ciascun vettore. Un residuo positivo grande dice che manca un'utenza o che una quota è sottostimata; un residuo negativo dice che hai attribuito più energia di quella entrata, cioè che qualche stima è gonfiata.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "La tolleranza è un parametro, non una legge",
        testo: `Il ${NUMERI.tolleranzaQuadraturaPct}% è il valore di partenza del prodotto, non una soglia normativa. Se la porti altrove, dichiaralo nel capitolo metodologico insieme al perché.`,
      },
      {
        tipo: "prosa",
        testo:
          "L'avanzamento di questo passo pesa la **quadratura al 65%** e i **metodi dichiarati al 35%**: il passo non si chiude inserendo numeri, si chiude quando i numeri tornano e si sa da dove vengono.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Metodo", "Che cosa significa"],
        righe: [
          ["Misurato", "Contatore dedicato o campagna di misura"],
          ["Calcolato", "Da grandezze misurate e bilanci di impianto"],
          ["Stimato", "Da potenza installata e ore di funzionamento"],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Il metodo dichiarato finisce nel capitolo metodologico del documento. È la differenza fra una diagnosi difendibile e un foglio di stime.",
      },
      {
        tipo: "prosa",
        testo:
          "Ogni uso finale ha una guida con la definizione, come determinarlo e un calcolatore di stima di prima approssimazione, il cui risultato si riversa nella cella con un comando.",
      },
      {
        tipo: "formula",
        testo: "kWh stimati = potenza media assorbita (kW) × ore di funzionamento (h) × fattore di carico",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il fattore di carico non è mai 1",
        testo:
          "Nella pratica è quasi sempre sotto l'unità: per i forni a induzione, tipicamente fra 0,55 e 0,75. Lasciarlo a 1 gonfia gli usi finali e manda la quadratura in negativo, e il rimedio istintivo, abbassare un'altra voce, sposta l'errore invece di toglierlo.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Dove spendere una misura vera",
        testo:
          "Sull'utenza dominante, che nella maggior parte degli stabilimenti è il processo termico primario. Lì un errore del dieci per cento sposta il bilancio più di qualunque raffinamento altrove: conviene il contatore dedicato, non la stima.",
      },
    ],
  },

  {
    id: "passo-4-indicatori",
    titolo: "Passo 4 · Variabili di riferimento e indicatori",
    minuti: 6,
    sommario: `Gli ${NUMERI.driverAttesi} driver e i ${NUMERI.indicatoriEnergia} indicatori di prestazione, confrontati con l'anno base.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Le variabili di riferimento sono **${NUMERI.driverAttesi}**, e sono il denominatore di tutto: produzione nell'unità dichiarata al passo 1, superficie climatizzata, superficie coperta totale, volume riscaldato, addetti equivalenti, ore di funzionamento, gradi giorno, fatturato.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Gradi giorno reali, non quelli di zona",
        testo:
          "I gradi giorno convenzionali della zona climatica sono una costante amministrativa: usati qui, normalizzano il riscaldamento su un inverno che non è stato quello dell'anno. Servono i gradi giorno effettivi dell'esercizio.",
      },
      {
        tipo: "prosa",
        testo: `Il prodotto calcola **${NUMERI.indicatoriEnergia} indicatori**, fra cui il consumo specifico di processo in kWh per unità, l'intensità primaria in tep per unità (quella usata nei confronti di settore), il consumo elettrico specifico, i kWh per metro quadro coperto e il termico normalizzato in kWh per metro cubo e grado giorno, che depura il riscaldamento dalla severità dell'inverno.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Senza i driver dell'anno base il confronto resta vuoto",
        testo:
          "Ogni indicatore si legge contro l'anno base, ed è il delta a dire se la prestazione è migliorata al netto dei volumi. Se i driver della baseline non sono compilati, il documento riporta gli indicatori dell'anno e non dimostra niente.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un indicatore senza denominatore non vale zero",
        testo:
          "Resta vuoto. È una scelta deliberata e diversa dal prototipo, che restituiva zero: uno zero in colonna si legge come un risultato eccellente, e su un documento firmato sarebbe la peggiore lettura possibile di un dato mancante.",
      },
    ],
  },

  {
    id: "passo-5-interventi",
    titolo: "Passo 5 · Interventi",
    minuti: 6,
    sommario: "Il programma di miglioramento: risparmio, investimento netto, tempo di ritorno.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Campo", "Nota"],
        righe: [
          ["Descrizione", "Che cosa si fa, su quale utenza"],
          ["Stato", "Proposto, valutato, approvato, in corso, realizzato, oppure scartato"],
          ["Vettore risparmiato", "Determina i fattori di conversione e il prezzo medio usati nei calcoli"],
          ["Quantità risparmiata all'anno", "Nell'unità del vettore: kWh, Smc, litri"],
          ["Investimento e incentivi", "Il tempo di ritorno usa l'investimento netto, cioè al netto degli incentivi"],
        ],
      },
      {
        tipo: "formula",
        testo:
          "risparmio € = quantità risparmiata × prezzo medio del vettore\ntempo di ritorno = (investimento − incentivi) ÷ risparmio annuo",
      },
      {
        tipo: "prosa",
        testo: `Per ogni intervento il prodotto calcola kWh, tep e tCO₂e evitati, la quota sul consumo del sito, il risparmio economico e il tempo di ritorno; in testa, i totali del programma. Il passo si considera completo con **${NUMERI.interventiAttesi} interventi** descritti e quantificati.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un ritorno senza risparmio non è zero: non c'è",
        testo:
          "Se al passo 2 manca il costo del vettore, il risparmio economico non si può calcolare e il tempo di ritorno resta vuoto invece di comparire come zero. È voluto: uno zero si legge come «rientra subito», che è l'opposto del vero. Prima i costi, poi gli interventi.",
      },
    ],
  },

  {
    id: "passo-6-racconto",
    titolo: "Passo 6 · Racconto",
    minuti: 4,
    sommario: `I ${NUMERI.capitoliEnergia} capitoli discorsivi, con le immagini e i diagrammi calcolati dai dati.`,
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Sintesi per la direzione: quanto consuma, dove va, quanto costa, le tre cose da fare",
          "Il sito e le attività: dove, cosa produce, come è organizzato l'anno",
          "Impianti e utenze energetiche: potenze, età, manutenzione, regolazione",
          "Metodo di raccolta e ripartizione: misurato contro stimato, criteri usati",
          "Lettura del bilancio e criticità: sprechi, anomalie stagionali, utenze fuori scala",
          "Programma di miglioramento: logica di scelta e priorità",
          "Piano di monitoraggio: che cosa si misura d'ora in poi, con quali strumenti e con quale frequenza",
        ],
      },
      {
        tipo: "prosa",
        testo:
          "I diagrammi si calcolano dai dati e si aggiornano da soli: il Sankey dai vettori alle aree funzionali, il Pareto degli usi finali con la cumulata, l'andamento mensile, il confronto degli indicatori con l'anno base, le barre divergenti degli interventi. Non vanno mai incollati grafici fatti altrove: al primo dato corretto direbbero un'altra cosa rispetto alle tabelle accanto.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Quando un capitolo si considera scritto",
        testo: `Oltre le **${NUMERI.paroleMinimeCapitolo} parole**. È una soglia tecnica dell'avanzamento, non un giudizio editoriale: serve a distinguere un capitolo scritto da un campo toccato. Un capitolo credibile è molto più lungo.`,
      },
    ],
  },

  {
    id: "verifica-e-documento",
    titolo: "Passi 7 e 8 · Verifica e documento",
    minuti: 5,
    sommario: "Che cosa controlla la verifica, e che cosa non può controllare.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Controllo", "Che cosa segnala"],
        righe: [
          ["Sito e perimetro", "Campi del profilo non compilati"],
          ["Consumi e spesa energetica", "Vettori valorizzati senza costo annuo"],
          ["Quadratura della ripartizione", `Vettori con residuo oltre il ±${NUMERI.tolleranzaQuadraturaPct}%`],
          ["Metodo di determinazione", "Usi con energia attribuita ma metodo non dichiarato"],
          ["Variabili di riferimento", "Driver mancanti per l'esercizio o per l'anno base"],
          ["Programma di miglioramento", "Interventi senza descrizione, quantità o investimento"],
          ["Lettura dei dati", "Capitoli sotto la soglia di testo"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Verde non vuol dire corretto",
        testo:
          "La verifica controlla la completezza e la quadratura formale, non la bontà delle stime. La coerenza con le fatture e la plausibilità dei fattori di carico restano lavoro dell'analista, e non c'è controllo automatico che possa farlo al posto suo.",
      },
      {
        tipo: "prosa",
        testo:
          "Che cosa succede al passo 8 lo spiega la sezione «Pubblicare» di questo corso: qui basta ricordare che il documento si costruisce sull'esercizio su cui stai lavorando, e che una volta pubblicato quella versione non cambia più.",
      },
    ],
  },

  {
    id: "fattori-energia",
    titolo: "I fattori, e gli errori più frequenti",
    minuti: 5,
    sommario: "Tre fattori per vettore, e le sette cose che vanno storte più spesso.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Fattore", "Che cosa rappresenta", "Fonti"],
        righe: [
          ["kWh per unità", "Energia finale al potere calorifico inferiore", "Dati di fornitura, tabelle ENEA"],
          [
            "tep per unità",
            "Energia primaria, convenzione della circolare per le diagnosi",
            "Circolare diagnosi, ENEA",
          ],
          [
            "kgCO₂e per unità",
            "Fattore di emissione; per l'elettricità anche il residual mix",
            "ISPRA, DEFRA, AIB, dati di fornitura",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "I fattori si sovrascrivono per azienda, non per studio",
        testo:
          "Il potere calorifico del cippato che arriva a quello stabilimento è una proprietà di quell'impianto, non una preferenza dello studio: la sovrascrittura vive sull'azienda. I valori precaricati sono indicativi, vanno verificati ogni anno, e fonte e anno vanno citati nel capitolo metodologico. Se cambi un fattore fra l'esercizio e l'anno base, dichiaralo: altrimenti il delta misura il cambio di fattore, non il risparmio.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Azienda o esercizio sbagliato",
            "Dati mescolati fra stabilimenti o anni",
            "Controllare l'intestazione della pagina prima di inserire",
          ],
          [
            "Unità sbagliate: Smc contro kWh, litri contro chili",
            "kWh, tep e CO₂e falsati alla radice",
            "Leggere l'unità accanto al campo: è quella del vettore, sempre",
          ],
          [
            "Fattore di carico lasciato a 1",
            "Usi finali gonfiati, quadratura in negativo",
            "Usare i valori reali suggeriti dalla guida dell'uso",
          ],
          [
            "Ripartizione a spanne senza metodo dichiarato",
            "Diagnosi indifendibile in verifica",
            "Un metodo per ogni uso attivo; misura vera sull'utenza dominante",
          ],
          [
            "Driver dell'anno base non inseriti",
            "Indicatori senza confronto: il documento non dimostra niente",
            "Compilare produzione e gradi giorno anche per la baseline",
          ],
          [
            "Costi dei vettori omessi",
            "Risparmi e tempi di ritorno che non si calcolano",
            "Costo annuo per ogni vettore valorizzato",
          ],
          [
            "Gasolio riscaldamento e trazione sommati",
            "Ripartizione ed emissioni falsate insieme",
            "Sono due righe: restano due righe",
          ],
        ],
      },
    ],
  },
];
