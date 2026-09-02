import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Le sezioni proprie del Bilancio di sostenibilità e conformità ESG.
 *
 * Stesse regole del corso energetico: il METODO viene dal corso del committente (le due
 * scale della doppia rilevanza, la soglia, le fonti documentali per sezione, gli errori
 * tipici) e regge; il PRODOTTO è riscritto, perché quello descritto lì è il prototipo.
 *
 * ⚠️ Due scarti già trovati e corretti, entrambi del tipo che nessuno verifica perché la
 * frase suona plausibile:
 *  - «un capitolo è completo oltre gli 80 caratteri» era vero nel prototipo; qui la soglia
 *    è in PAROLE, e il numero lo dice `NUMERI`.
 *  - «Impostazioni → Fattori e archivio» non esiste: i fattori del ponte GHG vivono
 *    nell'inventario, che è la fonte unica delle emissioni.
 */
export const BILANCIO: Sezione[] = [
  {
    id: "passo-1-organizzazione",
    titolo: "Passo 1 · Organizzazione",
    minuti: 4,
    sommario: "Chi rendiconta, con quale perimetro, secondo quale standard.",
    blocchi: [
      {
        tipo: "interfaccia",
        titolo: "Dove ti trovi",
        vista: {
          genere: "passi",
          passi: [
            { nome: "Organizzazione", stato: "corso" },
            { nome: "Materialità", stato: "vuoto" },
            { nome: "Indicatori", stato: "vuoto" },
            { nome: "Politiche", stato: "vuoto" },
            { nome: "Racconto", stato: "vuoto" },
            { nome: "Verifica", stato: "vuoto" },
            { nome: "Bilancio", stato: "vuoto" },
          ],
        },
        nota: "Il passo 4 mostra le schede solo per i temi risultati materiali al passo 2, e i diagrammi del passo 5 si costruiscono sui dati del passo 3: saltare i passi produce sezioni vuote più avanti.",
      },
      {
        tipo: "prosa",
        testo:
          "È la carta d'identità che finisce in copertina e in nota metodologica: forma giuridica, sede, settore, codice ATECO, siti operativi, mercati serviti, referente per il bilancio.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il perimetro non è una formalità: è un vincolo di coerenza",
        testo:
          "I siti operativi dichiarati qui definiscono il confine di tutti i dati del passo 3. Se un capannone è nel perimetro, le sue bollette devono entrare nei consumi; se non c'è, va detto in nota metodologica. Un perimetro dichiarato largo e compilato stretto è il difetto che un revisore trova per primo, perché basta un confronto con la visura.",
      },
      {
        tipo: "prosa",
        testo:
          "Il logo e l'immagine di copertina si caricano qui e vengono ridimensionati dal browser prima di partire: non serve prepararli.",
      },
    ],
  },

  {
    id: "passo-2-materialita",
    titolo: "Passo 2 · Doppia materialità",
    minuti: 9,
    sommario: `Le due scale su ${NUMERI.temi} temi, la soglia, e perché la valutazione va motivata.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il cuore metodologico del percorso: la doppia rilevanza su **${NUMERI.temi} temi** predefiniti, distribuiti sui pilastri ambientale, sociale e di governance, ciascuno col proprio riferimento ESRS e GRI.`,
      },
      {
        tipo: "prosa",
        testo:
          "**Rilevanza d'impatto**, dall'interno verso l'esterno: quanto l'attività dell'azienda incide su persone e ambiente, per gravità e probabilità.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Livello", "Impatto"],
        righe: [
          ["1", "Trascurabile: nessuna incidenza apprezzabile"],
          ["2", "Lieve: effetti limitati, reversibili, circoscritti"],
          ["3", "Moderato: effetti apprezzabili, gestibili con misure ordinarie"],
          ["4", "Rilevante: effetti estesi o difficilmente reversibili"],
          ["5", "Molto rilevante: effetti gravi, diffusi o irreversibili"],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "**Rilevanza finanziaria**, dall'esterno verso l'interno: quanto il tema incide sui conti, su ricavi, costi, investimenti, accesso a mercati o al credito.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Livello", "Effetto economico"],
        righe: [
          ["1", "Nessun effetto apprezzabile"],
          ["2", "Marginale: incide in misura contenuta"],
          ["3", "Apprezzabile: costi, investimenti o accesso a mercati"],
          ["4", "Rilevante: incide sulla marginalità o sui requisiti dei clienti"],
          ["5", "Critico: mette in discussione la continuità o mercati chiave"],
        ],
      },
      {
        tipo: "prosa",
        testo: `Un tema è materiale quando raggiunge o supera la soglia su **almeno una** delle due dimensioni. Non su entrambe: un tema che non costa niente e fa un danno grave resta materiale, ed è esattamente il caso che la doppia materialità esiste per cogliere. La soglia predefinita è **${NUMERI.sogliaMaterialitaPredefinita}** e si regola per progetto.`,
      },
      {
        tipo: "elenco",
        voci: [
          `Con soglia ${NUMERI.sogliaMaterialitaPredefinita}, otto o dieci temi materiali sono un equilibrio ragionevole per una PMI.`,
          `Se risultano materiali quasi tutti i ${NUMERI.temi} temi, le valutazioni sono gonfiate: il passo 4 diventa ingestibile e il documento perde il senso di aver scelto.`,
          "Se non ne risulta nessuno, la soglia è troppo alta o le valutazioni troppo prudenti.",
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un tema si dice valutato solo se ha almeno un punteggio",
        testo:
          "Un tema mai toccato non è «non materiale»: è non valutato, e conta come tale nell'avanzamento. La differenza serve a distinguere una scelta da una dimenticanza, e in verifica è la prima domanda che arriva.",
      },
      {
        tipo: "prosa",
        testo:
          "Ogni tema ha una guida con i criteri specifici, e c'è una proposta ricavata dal codice ATECO. La proposta non si applica mai da sola: compare con il motivo accanto, e la si accetta o si scarta. Una valutazione comparsa da sola in un documento che qualcuno firma è una valutazione che nessuno ha dato.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Le evidenze sono ciò che rende l'analisi difendibile",
        testo:
          "Il campo evidenze non entra in nessun calcolo, e per questo si salta. È però l'unica cosa che, sei mesi dopo, distingue una valutazione motivata da un'impressione: senza, in sede di verifica non c'è modo di spiegare perché quel tema vale 4.",
      },
    ],
  },

  {
    id: "passo-3-indicatori",
    titolo: "Passo 3 · Dati e indicatori",
    minuti: 9,
    sommario: `${NUMERI.indicatori} indicatori in ${NUMERI.sezioniKpi} sezioni, e dove si prendono i dati.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `**${NUMERI.indicatori} indicatori** organizzati in **${NUMERI.sezioniKpi} sezioni**. Si inseriscono i dati grezzi: i valori derivati li calcola il prodotto e non sono modificabili.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Sezione", "Riferimenti", "Dove si prendono i dati"],
        righe: [
          [
            "Energia",
            "ESRS E1-5 · GRI 302-1",
            "Bollette luce e gas, schede carburante della flotta, contatore dell'inverter; le garanzie d'origine sono in contratto o in bolletta",
          ],
          [
            "Acqua",
            "ESRS E3-4 · GRI 303-3",
            "Fatture dell'acquedotto, letture del contatore di pozzo, registro di autocontrollo degli scarichi",
          ],
          [
            "Rifiuti e materiali",
            "ESRS E5-4/5 · GRI 306-3",
            "Registro di carico e scarico, formulari, MUD; la quota a recupero si legge dai codici R e D dei formulari",
          ],
          [
            "Persone",
            "ESRS S1-6/9 · GRI 2-7, 405-1",
            "Libro unico del lavoro, organico al 31 dicembre, UniEmens, prospetto disabili",
          ],
          ["Salute e sicurezza", "ESRS S1-14 · GRI 403-9", "Registro infortuni, denunce INAIL, ore lavorate dal LUL"],
          [
            "Formazione e retribuzioni",
            "ESRS S1-13/16 · GRI 404-1, 405-2",
            "Registri di formazione e attestati; cedolini e CU per il divario retributivo",
          ],
          [
            "Valore economico e fornitori",
            "ESRS G1-6 · GRI 201-1, 204-1",
            "Bilancio d'esercizio, partitari fornitori, questionari ESG di filiera",
          ],
          [
            "Governance ed etica",
            "ESRS G1-3/4 · GRI 205-3",
            "Visura per la composizione dell'organo, modello 231, registro delle segnalazioni",
          ],
        ],
      },
      {
        tipo: "elenco",
        voci: [
          "I dati sono riferiti all'anno solare dell'esercizio su cui stai lavorando.",
          "Zero non è vuoto: se il dato è zero, scrivi 0. Il campo vuoto conta come non rilevato nella verifica.",
          "Le unità sono quelle indicate accanto al campo: kWh, Smc, litri, chili, metri cubi. Nessuna conversione a mano.",
          "Compilare anche l'anno precedente sblocca i confronti e i delta nel documento.",
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Le emissioni NON si inseriscono qui: si leggono dall'inventario GHG",
        testo:
          "È il ponte fra i due percorsi, ed è la differenza più grossa rispetto al prototipo. Lo Scope 1 e lo Scope 2 dell'azienda vengono dall'inventario GHG della stessa azienda e dello stesso esercizio, non da una copia. Se l'inventario manca o è vuoto, questa pagina lo dice e mostra un avviso di coerenza: il rimedio è aprire l'inventario, non riscrivere il numero qui. Un dato in due posti è un dato in nessun posto, e il giorno in cui i due divergono nessuno sa quale sia quello buono.",
      },
      {
        tipo: "prosa",
        testo:
          "I derivati che il prodotto calcola comprendono l'energia totale e la quota rinnovabile, l'intensità di emissione per milione di euro di ricavi e i kWh per ora lavorata. Se un derivato sembra sbagliato non si corregge a mano, perché non si può: si verificano i dati grezzi, cioè le unità e i doppi conteggi fra flotta e riscaldamento, e poi i fattori nell'inventario.",
      },
    ],
  },

  {
    id: "passo-4-politiche",
    titolo: "Passo 4 · Politiche e obiettivi",
    minuti: 4,
    sommario: "Per ogni tema materiale: che cosa fate, dove volete arrivare.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Qui il bilancio smette di essere una raccolta di numeri. Le schede compaiono **solo per i temi risultati materiali** al passo 2: se questa pagina è vuota, nessun tema ha ancora superato la soglia.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Elemento", "A quale domanda risponde", "Esempio"],
        righe: [
          [
            "Politica",
            "Quale impegno formale avete adottato?",
            "Politica energetica approvata dall'organo amministrativo nel 2024, integrata nel sistema ISO 50001",
          ],
          [
            "Azioni",
            "Che cosa avete fatto concretamente nell'anno?",
            "Rifacimento dell'illuminazione del reparto stampaggio; diagnosi energetica ai sensi del D.Lgs. 102/2014",
          ],
          [
            "Obiettivo",
            "Dove volete arrivare, entro quando?",
            "Meno 15% di kWh per ora lavorata entro il 2027 rispetto al 2024",
          ],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Il passo si considera completo quando ogni tema materiale ha almeno la politica e le azioni.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un obiettivo senza misura e senza scadenza non è un obiettivo",
        testo:
          "«Ridurre i consumi» passa la verifica, perché il campo è pieno. Non passa un cliente che lo legge l'anno dopo e chiede quanto. La verifica controlla che ci sia del testo, non che dica qualcosa.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un campo per volta, e va bene così",
        testo:
          "Scrivendo la politica e passando subito alle azioni non si perde niente: ogni campo si salva per conto suo. È stato un difetto vero, per quattro volte in punti diversi del prodotto, e il rimedio è strutturale: il browser non rimanda mai la riga intera.",
      },
    ],
  },

  {
    id: "passo-5-racconto",
    titolo: "Passo 5 · Racconto",
    minuti: 6,
    sommario: `I ${NUMERI.capitoliReport} capitoli discorsivi, le immagini, i diagrammi.`,
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Lettera agli stakeholder: perché pubblichiamo, che cosa è successo, quale impegno prendiamo",
          "Identità e storia: chi siete, da quando, dove, che cosa producete",
          "Modello di business: come si genera valore, fra input, attività e clienti",
          "Catena del valore: fornitori a monte, clienti e fine vita a valle",
          "Coinvolgimento degli stakeholder: chi sono, come sono stati ascoltati, che cosa è emerso",
          "Nota metodologica: perimetro, periodo, standard, criteri di calcolo",
          "Impegni per il futuro: prospettive e programmi",
        ],
      },
      {
        tipo: "prosa",
        testo:
          "L'editor accetta una lista ristretta di formattazioni, e quella lista la fa rispettare il server: ciò che non rientra viene scartato conservando il testo. Non è una limitazione dell'editor, è la ragione per cui un capitolo incollato da un altro documento non può portarsi dietro nulla di eseguibile.",
      },
      {
        tipo: "prosa",
        testo:
          "Le bozze si generano dai dati già inseriti e sono un punto di partenza, non un testo da pubblicare così. I diagrammi si calcolano dal passo 3 e dalla matrice del passo 2, e si aggiornano da soli.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Quando un capitolo si considera scritto",
        testo: `Oltre le **${NUMERI.paroleMinimeCapitolo} parole**. È una soglia tecnica dell'avanzamento, non un giudizio editoriale: distingue un capitolo scritto da un campo toccato, e un capitolo credibile è molto più lungo.`,
      },
    ],
  },

  {
    id: "verifica-bilancio",
    titolo: "Passi 6 e 7 · Verifica e documento",
    minuti: 4,
    sommario: "Che cosa controlla la verifica, e che cosa resta al consulente.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Controllo", "Che cosa segnala"],
        righe: [
          ["Profilo", "Campi del passo 1 non compilati"],
          ["Indicatori dell'esercizio", "Indicatori senza valore per l'anno corrente"],
          ["Anno precedente", "Indicatori presenti quest'anno e privi del dato comparativo"],
          ["Gestione", "Temi materiali senza politica o senza azioni"],
          ["Capitoli", "Capitoli del racconto sotto la soglia di testo"],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Ogni lacuna porta al punto da sistemare: la verifica non è un voto, è un elenco di destinazioni.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Verde non vuol dire pronto da pubblicare",
        testo:
          "La verifica controlla la completezza, non la correttezza: un dato sbagliato ma presente risulta a posto. La quadratura con il bilancio d'esercizio e con il MUD, e la coerenza dei delta da un anno all'altro, restano lavoro del consulente.",
      },
    ],
  },

  {
    id: "errori-bilancio",
    titolo: "Gli errori più frequenti",
    minuti: 3,
    sommario: "Sei cose che vanno storte, e come si evitano.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Azienda o esercizio sbagliato",
            "Dati mescolati fra aziende o anni",
            "Controllare l'intestazione della pagina prima di inserire",
          ],
          [
            "Campi lasciati vuoti al posto dello zero",
            "Verifica piena di falsi mancanti",
            "Zero esplicito quando il dato è nullo",
          ],
          [
            "Unità sbagliate: litri contro chili, Smc contro kWh",
            "Energia totale e derivati falsati",
            "Leggere l'unità accanto al campo",
          ],
          [
            "Emissioni riscritte a mano invece che nell'inventario",
            "Non è possibile: i derivati sono in sola lettura, ma si perde tempo a cercarli",
            "Le emissioni si correggono nell'inventario GHG della stessa azienda e dello stesso anno",
          ],
          [
            "Fattori di emissione mai verificati",
            "Emissioni non difendibili in verifica",
            "Aggiornamento annuale nell'inventario, con la fonte citata in nota metodologica",
          ],
          [
            "Materialità tutta a 4 e a 5",
            "Troppi temi materiali, passo 4 ingestibile, documento che non ha scelto niente",
            "Usare le guide per tema e motivare nelle evidenze",
          ],
        ],
      },
    ],
  },
];
