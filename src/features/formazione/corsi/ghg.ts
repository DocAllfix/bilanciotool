import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Le sezioni proprie dell'Inventario GHG.
 *
 * Metodo dal corso del committente (ISO 14064-1), riscritto sul prodotto vero: qui non
 * esiste l'esportazione JSON come backup, non esiste l'export HTML del rapporto, e il PDF
 * non lo fa la stampa del browser — lo genera il server dentro uno snapshot immutabile.
 */
export const GHG: Sezione[] = [
  {
    id: "passo-1-confini",
    titolo: "Passo 1 · Confini e perimetro",
    minuti: 6,
    sommario: "Che cosa entra nell'inventario, con quale criterio, e con quale set di GWP.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "La norma chiede di dichiarare quali unità entrano nell'inventario **prima** di contare una sola tonnellata. Tutto ciò che si scrive qui finisce nel rapporto, e in verifica viene chiesto.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Blocco", "Che cosa si dichiara"],
        righe: [
          [
            "Confini organizzativi (§5.1)",
            "Approccio di consolidamento: controllo operativo, controllo finanziario o quota di partecipazione. Va applicato in modo uniforme a tutte le unità e mantenuto negli anni.",
          ],
          [
            "Unità nel perimetro",
            "Società, stabilimenti e filiali incluse ed escluse, ciascuna con la motivazione. Un'esclusione taciuta è il rilievo più frequente.",
          ],
          [
            "Confini di rendicontazione (§5.2)",
            "Quali categorie di emissioni indirette sono incluse, e perché.",
          ],
          [
            "Criteri di significatività (§5.2.4)",
            "Come sono state scelte le indirette significative: soglia quantitativa, influenza dell'organizzazione, rilevanza per gli stakeholder, rischio.",
          ],
          [
            "Periodo e metodo",
            "Periodo di rendicontazione, metodologia di quantificazione (dati di attività per fattori come regola; bilancio di massa e misura diretta come eccezioni dichiarate), stato della verifica.",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il set di GWP è uno solo, per tutto l'inventario",
        testo: `Si sceglie fra i ${NUMERI.gwpSet} set disponibili e si dichiara nel rapporto. Deve essere coerente con l'edizione dei fattori adottata: i fattori delle fonti recenti sono già espressi in una revisione precisa, e mescolarli con un set diverso produce numeri che non tornano con nessuna fonte.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I dati del periodo non sono un allegato",
        testo:
          "Ricavi netti, organico medio e produzione con la sua unità servono a calcolare le intensità che il passo 5 mostra e il rapporto riporta. Finché mancano, le intensità restano vuote. Vanno compilati per ogni periodo, anno base compreso.",
      },
      {
        tipo: "prosa",
        testo:
          "⚠️ Il confine di questo inventario è **congelato alla creazione**: la revisione dei contenuti metodologici con cui è nato resta la sua per sempre. È ciò che permette di riaprire un inventario di due anni fa e ritrovarlo identico a com'era.",
      },
    ],
  },

  {
    id: "passo-2-registro",
    titolo: "Passo 2 · Registro delle sorgenti",
    minuti: 6,
    sommario: `Le ${NUMERI.sorgentiGhg} sorgenti delle ${NUMERI.categorieGhg} categorie, ciascuna con uno stato dichiarato.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il punto 5.2 chiede di esaminare tutte e ${NUMERI.categorieGhg} le categorie e di dichiarare, per ciascuna delle **${NUMERI.sorgentiGhg} sorgenti**, se è inclusa o esclusa. Un'esclusione senza motivazione è il rilievo più frequente in verifica.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Stato", "Che cosa significa"],
        righe: [
          ["Inclusa", "La sorgente esiste nel perimetro e viene quantificata al passo 3."],
          [
            "Esclusa",
            "La sorgente esiste ma non è quantificata: la motivazione è OBBLIGATORIA, e la pretende il prodotto. «Non significativa» regge solo se il criterio è stato dichiarato al passo 1.",
          ],
          [
            "Non applicabile",
            "La sorgente non esiste nell'attività, per esempio il franchising per un'impresa manifatturiera. Anche qui serve una riga di motivazione.",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Una sorgente inclusa senza voci è un'incoerenza, non un vuoto",
        testo:
          "Il passo 3 conta come complete solo le sorgenti incluse che hanno almeno una voce. Una sorgente dichiarata inclusa e mai quantificata la vede subito la verifica, e la vede il verificatore. Si include ciò che si quantifica.",
      },
      {
        tipo: "prosa",
        testo:
          "Le esclusioni motivate finiscono nel capitolo dei confini di rendicontazione del rapporto: sono scritte una volta e non si ricopiano.",
      },
    ],
  },

  {
    id: "passo-3-dati",
    titolo: "Passo 3 · Dati di attività",
    minuti: 8,
    sommario: "Una voce per sorgente e per sito, col calcolo fatto dal prodotto e l'evidenza accanto.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Campo", "Nota"],
        righe: [
          [
            "Categoria, sorgente, sito",
            "La sorgente si filtra sulla categoria; il sito distingue le righe dello stesso vettore su stabilimenti diversi",
          ],
          [
            "Descrizione",
            "«Gas naturale, caldaia del reparto produzione»: è ciò che comparirà nel rapporto e nella classifica delle voci più pesanti",
          ],
          [
            "Fattore di emissione",
            "Dalla libreria della categoria, oppure un fattore personalizzato: scegliendolo si compilano unità e valore",
          ],
          ["Quantità e unità", "Nell'unità del fattore: Smc, litri, chili, kWh, chilometri, tonnellate-chilometro"],
          [
            "Solo categoria 2",
            "Fattore market-based e quota coperta da garanzie d'origine o contratti, nella stessa unità della quantità",
          ],
          ["Biomasse", "Fattore di CO₂ biogenica: si rendiconta a parte e resta fuori dai totali"],
          [
            "Qualità del dato",
            "Propone l'incertezza corrispondente, che resta modificabile",
          ],
          [
            "Evidenza documentale",
            "«Fatture 2025, cartella /GHG/2025/energia»: è il rinvio che il verificatore seguirà, e il requisito §6.3 sta qui",
          ],
        ],
      },
      {
        tipo: "formula",
        testo:
          "tCO₂e = quantità × FE ÷ 1000\nmarket-based (cat. 2) = max(0, quantità − quota coperta) × FE market ÷ 1000\nCO₂ biogenica = quantità × FE biogenico ÷ 1000",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "L'anteprima nel dialogo esce dalle stesse funzioni del server",
        testo:
          "Il numero che si vede prima di salvare non è un secondo calcolo scritto per il browser: è lo stesso motore che scriverà la riga. Non possono divergere, ed è voluto — due aritmetiche separate divergono sempre, e ci si accorge del disallineamento sul documento.",
      },
      {
        tipo: "prosa",
        testo: `La qualità del dato ha **${NUMERI.livelliQualitaGhg} livelli**, dal misurato allo stimato, ciascuno con la propria incertezza predefinita: dal contatore tarato alle medie di settore. È il campo che guida i miglioramenti, e va compilato onestamente — dichiarare documentale una stima abbassa l'incertezza complessiva e nasconde proprio il punto su cui converrebbe investire.`,
      },
      {
        tipo: "prosa",
        testo:
          "**Copia dal periodo precedente** duplica le voci dell'anno prima con le quantità azzerate: struttura, fattori ed evidenze restano, e si riempiono solo i numeri. È il modo più rapido di aprire un esercizio nuovo senza ricostruire il registro.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Unità e doppi conteggi",
        testo:
          "Il gasolio da riscaldamento e quello per autotrazione sono fattori distinti e non si sommano. L'energia immessa in rete dal fotovoltaico non è consumo. E la quota coperta da garanzie d'origine va espressa nella stessa unità della quantità: in un'altra unità, il market-based esce falsato senza che niente protesti.",
      },
    ],
  },

  {
    id: "passo-4-fattori",
    titolo: "Passo 4 · Fattori e sovrascritture",
    minuti: 5,
    sommario: `I ${NUMERI.fattoriGhg} fattori di piattaforma, e come si sovrascrivono senza perdere la storia.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `La libreria porta **${NUMERI.fattoriGhg} fattori** precaricati. Non si copiano nell'organizzazione: restano di piattaforma, versionati, e ciò che lo studio cambia vive **sopra** come sovrascrittura. È una differenza che si sente in due momenti — quando la piattaforma aggiorna un fattore che non hai toccato, e quando vuoi tornare al valore di origine.`,
      },
      {
        tipo: "elenco",
        voci: [
          "Ogni fattore porta valore, unità, fonte e anno. La fonte non è decorativa: è il campo che rende difendibile il numero in verifica, ed è quello che fa salire il completamento del passo.",
          "Per la categoria 2 c'è anche il valore market-based.",
          "Le biomasse hanno un fattore fossile e uno biogenico separati: il primo entra nei totali, il secondo si rendiconta a parte.",
          "Un fattore personalizzato in uso non si può eliminare: il riferimento resterebbe orfano. Una sovrascrittura invece si ripristina sempre, perché sotto c'è ancora la chiave di piattaforma.",
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Le voci già inserite non cambiano quando cambi un fattore",
        testo:
          "Il fattore applicato è congelato sulla riga al momento del salvataggio. Aggiornare la libreria non riscrive il passato: è ciò che permette di correggere un fattore senza far cambiare da solo un inventario già chiuso. Se vuoi che il ricalcolo avvenga, le voci vanno rimesse a mano — ed è una decisione, non un automatismo.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "I valori precaricati sono indicativi",
        testo:
          "Prima di emettere un inventario destinato alla verifica: aggiornali all'edizione dichiarata nel rapporto, compila fonte e anno su ognuno di quelli che userai, e usa la stessa edizione per l'anno base. Un cambio di edizione va dichiarato, e può imporre il ricalcolo previsto al passo 6.",
      },
    ],
  },

  {
    id: "passo-5-risultati",
    titolo: "Passo 5 · Risultati",
    minuti: 6,
    sommario: "Totali per categoria, doppia lettura dell'energia importata, intensità, incertezza.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Totale location-based e totale market-based, con la differenza attribuibile ai contratti di fornitura.",
          "Composizione per scope e per categoria, calcolate dai dati e mai incollate da fuori.",
          "Riepilogo per categoria: voci, tonnellate, peso, incertezza, qualità.",
          "Intensità per ricavi, per addetto equivalente e per unità di prodotto, dai dati del periodo del passo 1.",
          "Le voci più pesanti, in ordine.",
          "CO₂ biogenica, indicata a parte e fuori dai totali.",
        ],
      },
      {
        tipo: "formula",
        testo:
          "incertezza combinata % = √Σ(tᵢ × incᵢ)² ÷ totale × 100\nqualità ponderata = Σ(punteggioᵢ × tᵢ) ÷ Σ tᵢ",
      },
      {
        tipo: "prosa",
        testo:
          "L'incertezza è una somma in quadratura dei contributi assoluti: una voce piccola stimata male pesa poco, una voce dominante stimata anche solo discretamente domina il risultato. La qualità è ponderata sulle emissioni, e serve a rispondere a una domanda sola: dove conviene migliorare il dato.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Si leggono insieme peso e qualità",
        testo:
          "La categoria che pesa di più con la qualità più bassa è il primo posto in cui investire prima della verifica: un contatore dedicato, o le fatture al posto delle stime. Guardare solo il peso porta a rifinire numeri già buoni.",
      },
    ],
  },

  {
    id: "passo-6-anno-base",
    titolo: "Passo 6 · Anno base e obiettivi",
    minuti: 5,
    sommario: "Il metro con cui si misura tutto il resto, e le regole per rifarlo.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "L'anno base va scelto, **giustificato** e corredato in anticipo dalle regole di ricalcolo (§7.2 e §7.3). Le regole si scrivono prima perché servono nel momento in cui conviene di meno: quando una variazione strutturale rende il confronto lusinghiero.",
      },
      {
        tipo: "elenco",
        voci: [
          "Periodo di riferimento: uno dei periodi con dati, col suo totale.",
          "Motivazione della scelta: per esempio «primo periodo con dati completi e verificabili su tutti i siti».",
          "Regola di ricalcolo: quali variazioni obbligano a rifare l'anno base. I casi tipici sono acquisizioni e cessioni, cambio di metodo, correzione di errori significativi, variazione dei confini.",
        ],
      },
      {
        tipo: "formula",
        testo: "traguardo = base × (1 − riduzione%)\npercorso compiuto = (base − attuale) ÷ (base − traguardo)",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un obiettivo basta a completare il passo, non a renderlo credibile",
        testo:
          "Il prodotto calcola il traguardo e il percorso compiuto; non verifica che la riduzione dichiarata sia raggiungibile con le azioni scritte accanto. Quel giudizio è del consulente, e in verifica lo chiedono a lui.",
      },
    ],
  },

  {
    id: "verifica-e-rapporto",
    titolo: "Passi 7 e 8 · Verifica e Rapporto",
    minuti: 5,
    sommario: `I ${NUMERI.checklistGhg} requisiti che un verificatore guarda per primi, e come esce il rapporto.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `La checklist porta **${NUMERI.checklistGhg} requisiti**, ciascuno riferito al punto della norma: dai confini organizzativi alla doppia rendicontazione della categoria 2, dalla separazione della CO₂ biogenica alla preparazione alla verifica di parte terza. Per ognuno si dichiara lo stato e si annota l'evidenza o l'azione: sono le voci che diventano i riferimenti del fascicolo di audit.`,
      },
      {
        tipo: "prosa",
        testo:
          "Il Rapporto GHG è costruito sui contenuti minimi del punto 9.3.1, e i testi mancanti compaiono come segnaposto invece di sparire: il vuoto dichiarato è informazione, il vuoto silenzioso è un documento che promette più di quanto porta.",
      },
      {
        tipo: "interfaccia",
        titolo: "Come si legge la verifica",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Confini organizzativi definiti", esito: "ok" },
            { testo: "Criteri di significatività dichiarati", esito: "ok" },
            { testo: "Due sorgenti escluse senza motivazione", esito: "manca" },
            { testo: "Anno base fissato e giustificato", esito: "manca" },
          ],
        },
        nota: "Non è un voto: è un elenco di posti dove andare. Ogni lacuna porta al punto da sistemare.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Verde non vuol dire corretto",
        testo:
          "La verifica controlla la completezza formale. La coerenza fra le quantità e le fatture, la plausibilità dei fattori, l'onestà della qualità dichiarata: quello resta lavoro dell'analista, e non c'è controllo automatico che possa farlo al posto suo.",
      },
    ],
  },

  {
    id: "errori-ghg",
    titolo: "La sequenza di lavoro, e gli errori più frequenti",
    minuti: 5,
    sommario: "In che ordine conviene procedere, e le trappole che tornano in verifica.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Confini completi e dati del periodo: consolidamento, perimetro, significatività, set di GWP, metodologia.",
          "Registro delle sorgenti: tutte con uno stato, ogni esclusione motivata.",
          "Fattori: aggiornamento all'edizione dichiarata, con fonte e anno su ognuno di quelli che userai.",
          "Voci per ogni sorgente inclusa e per ogni sito, con evidenza e qualità del dato; categoria 2 con market-based e quota coperta.",
          "Risultati letti per peso e qualità, poi anno base e obiettivi, poi verifica con le evidenze annotate, poi pubblicazione.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Azienda o esercizio sbagliato",
            "Voci in un anno o in un inventario che non è quello",
            "Controllare l'intestazione della pagina prima di inserire",
          ],
          ["Esclusioni senza motivazione", "Rilievo di verifica sul §5.2", "Una riga per ogni esclusa e per ogni non applicabile"],
          ["Sorgente inclusa senza voci", "Passo 3 incompleto, incoerenza visibile", "Si include ciò che si quantifica"],
          [
            "Fattori precaricati usati così come sono",
            "Emissioni non difendibili, fonte mancante",
            "Aggiornarli e compilare fonte e anno",
          ],
          [
            "Quota coperta in un'unità diversa dalla quantità",
            "Market-based falsato in silenzio",
            "Stessa unità per la quantità e per la quota",
          ],
          [
            "Biomassa col fattore biogenico dentro il totale",
            "Violazione del §6.5",
            "Fattore fossile nel totale, biogenico a parte",
          ],
          [
            "Tutto dichiarato documentale anche quando è stima",
            "Incertezza sottostimata, e nessuna indicazione su dove migliorare",
            "Qualità del dato onesta: è quella che guida gli investimenti",
          ],
          ["Evidenza documentale vuota", "Requisito §6.3 non soddisfatto", "Un rinvio al documento su ogni voce"],
          [
            "Cambio di fattori o di confini senza ricalcolo",
            "Il confronto con l'anno base non significa più niente",
            "Applicare la regola di ricalcolo scritta al passo 6",
          ],
        ],
      },
    ],
  },
];
