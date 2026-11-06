// Le domande frequenti, con le risposte vere.
//
// Stanno in un modulo SENZA "use client" perche' le legge anche la pagina, che e' un
// componente server: importare dati da un file client non restituisce l'elenco ma un
// riferimento al componente, e il build si ferma con «DOMANDE.map is not a function».
// Le stesse risposte servono due volte — in pagina e nei dati strutturati — e ricopiarle
// significherebbe correggerne una sola, prima o poi.

export const DOMANDE: [string, string][] = [
  [
    "Come funziona la demo guidata?",
    "Ti registri in un minuto e trovi un'azienda d'esempio già compilata: puoi percorrere tutti i moduli, modificare i dati, vedere i calcoli cambiare. Un tour ti accompagna nelle schermate principali. Quando decidi di lavorare sulla tua azienda, o su quelle che segui, sblocchi l'abbonamento: fino ad allora nessuna carta è richiesta.",
  ],
  [
    "Come si acquista? E quanto costa?",
    "Con un abbonamento annuale o mensile, sempre allo stesso prezzo, che non si paga per documento né per utente: comprende tutti i percorsi, i documenti che pubblichi senza limite di numero, gli accessi per i colleghi, i documenti col tuo marchio e gli aggiornamenti dei fattori. C'è un piano per l'azienda che fa da sé e due per i consulenti, che si scelgono per quante aziende seguono. Si attiva con carta, oppure ti mandiamo un preventivo da pagare a bonifico se ti serve l'ordine d'acquisto. Piani e importi stanno nella pagina Prezzi.",
  ],
  [
    "Serve essere consulenti per usarlo?",
    "No. È pensato per chi in azienda si occupa di conformità, qualità, ambiente o sicurezza e deve produrre i documenti senza un consulente per ogni norma: le guide di valutazione, passo per passo, spiegano cosa guardare e dove trovare i dati in azienda. I consulenti lo usano per seguire più aziende clienti con lo stesso metodo.",
  ],
  [
    "Devo comprarli tutti?",
    "L'abbonamento è uno solo e comprende tutto: non ci sono moduli a pagamento separato né costi per documento prodotto. La tua azienda ha il suo fascicolo, e dentro apri soltanto i percorsi che ti servono. Si parte di solito da ciò che qualcuno sta chiedendo adesso, l'inventario delle emissioni per il cliente o il canale delle segnalazioni per la legge, e si aggiunge il resto quando serve. I percorsi non aperti non danno fastidio e non sporcano l'interfaccia.",
  ],
  [
    "Devo inserire tutto a mano?",
    "No. I dati dell'azienda si scrivono una volta e passano da soli in ogni percorso che avvii. Dal codice ATECO arrivano le voci tipiche del settore: le fonti di emissione dell'inventario GHG, gli usi finali dell'energia, i reati 231 da valutare, i trattamenti del registro GDPR, gli aspetti ambientali e i pericoli del sistema integrato. Entrano marcate come proposta e col motivo accanto; i consumi passano fra inventario, bilancio energetico e indicatori come valori da confermare. Tutto resta modificabile, e nei documenti conta solo ciò che hai confermato.",
  ],
  [
    "A quali norme sono conformi i documenti?",
    "Il rapporto GHG segue i contenuti minimi del §9.3.1 della UNI EN ISO 14064-1:2018, con doppia rendicontazione Scope 2 e CO₂ biogenica separata. Il bilancio è redatto con riferimento ai GRI Standards 2021 e alla struttura ESRS/VSME, con analisi di doppia rilevanza e indice dei contenuti. Il bilancio energetico è una diagnosi energetica secondo la UNI CEI EN 16247 e la struttura richiesta dall'articolo 8 del D.Lgs. 102/2014. Lo Statement of Applicability (la Dichiarazione di Applicabilità richiesta dalla norma) copre i 174 controlli di ISO/IEC 27001:2022 e dei quadri 27017, 27018 e 27701, con la nota di conformità al punto 6.1.3 lettera d). L'autovalutazione del fornitore si appoggia a ESRS, GRI e ISO 20400, e la due diligence di filiera alle linee guida OCSE e alla direttiva (UE) 2024/1760. Il sistema integrato copre ISO 9001, 14001 e 45001; il sistema di responsabilità sociale lo Standard SA8000:2026; il Modello 231 il D.Lgs. 231/2001 con i 25 reati presupposto, la prevenzione della corruzione la UNI ISO 37001 e la gestione delle segnalazioni il D.Lgs. 24/2023. I due percorsi NIS2 seguono il D.Lgs. 138/2024 e le determinazioni dell'ACN, la protezione dei dati il Regolamento (UE) 2016/679 e il D.Lgs. 196/2003, il sistema di gestione sociale la PAS 24000:2022.",
  ],
  [
    "I fattori di emissione sono aggiornati?",
    "La libreria di partenza usa fonti pubbliche (ISPRA, DEFRA, IPCC) versionate per edizione: gli aggiornamenti annuali arrivano con l'abbonamento e non riscrivono mai gli inventari già pubblicati. Ogni fattore si può personalizzare, con fonte documentata.",
  ],
  [
    "Dove stanno i dati? E se non rinnovo?",
    "Su database europei (Francoforte), isolati per account a livello di database. Se non rinnovi, l'account passa in sola lettura: i dati restano tuoi, consultabili ed esportabili. Non cancelliamo il lavoro di nessuno.",
  ],
  [
    "Chi c'è dietro EvalisDeck?",
    "Il prodotto è sviluppato per Evalis Srl, studio di consulenza e certificazione con sede ad Aversa. Nel giugno 2026 Evalis ha ottenuto da EcoVadis la medaglia Platinum con 89/100 e 99° percentile: il primo 1% delle aziende valutate. EcoVadis è una piattaforma internazionale che valuta le organizzazioni su ambiente, pratiche lavorative e diritti umani, etica e acquisti sostenibili. Una precisazione doverosa: quella valutazione riguarda Evalis come azienda, non certifica EvalisDeck né i documenti che il software produce. La conformità dei tuoi documenti dipende dai dati che inserisci e dalle norme che segui, non dal nostro punteggio.",
  ],
  [
    "Cosa succede quando pubblico un documento?",
    "La pubblicazione congela dati e calcoli in una versione numerata e immutabile: un vincolo a livello di database, non una promessa. Puoi sempre ripubblicare una nuova versione; quelle consegnate restano identiche per sempre. È la garanzia che porti in verifica.",
  ],
];
