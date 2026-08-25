// Gli undici percorsi della vetrina, raggruppati nei tre gruppi del committente.
//
// ⚠️ Sta in un file PROPRIO e non dentro la pagina: i dati non si importano da un modulo
// `"use client"` — il build restituisce un riferimento al componente invece dell'array e
// si ferma con «.map is not a function». È già successo con le domande frequenti.
//
// ⚠️ E le classi Tailwind sono scritte PER ESTESO. Tailwind genera le utility scandendo
// il testo del sorgente: `bg-area-${chiave}` non esiste da nessuna parte, e il tratto
// dell'area resterebbe invisibile. Delle cinque aree, una volta, solo una aveva il
// colore — e ce l'aveva per caso, perché quella classe compariva in un esempio dentro
// DESIGN.md.

export type PercorsoVetrina = {
  titolo: string;
  norma: string;
  passi: string[];
  punto: string;
};

export type AreaVetrina = {
  nome: string;
  /** Scritto per esteso: vedi la nota in testa al file. */
  tratto: string;
  percorsi: PercorsoVetrina[];
};

export const LETTERE = "ABCDEFGHILMNOPQ".split("");

export const AREE_VETRINA: AreaVetrina[] = [
  {
    nome: "Ecosostenibilità",
    tratto: "bg-area-ecosostenibilita",
    percorsi: [
      {
        titolo: "Inventario GHG",
        norma: "ISO 14064-1:2018",
        passi: [
          "Confini e perimetro",
          "Registro delle 25 sorgenti",
          "Dati di attività",
          "Fattori e fonti",
          "Risultati e incertezza",
          "Anno base e obiettivi",
          "Verifica",
          "Rapporto §9.3.1",
        ],
        punto:
          "Doppia rendicontazione Scope 2, CO₂ biogenica separata, incertezza in quadratura: ciò che l'ente di verifica chiede, già al posto giusto.",
      },
      {
        titolo: "Bilancio energetico",
        norma: "UNI CEI EN 16247 · ISO 50001",
        passi: [
          "Sito e perimetro",
          "12 vettori energetici",
          "Ripartizione sui 20 usi finali",
          "Indicatori di prestazione",
          "Interventi e ritorno",
          "Racconto",
          "Verifica",
          "Bilancio impaginato",
        ],
        punto:
          "La ripartizione si quadra da sola: le celle restano nell'unità del vettore, quindi correggere un potere calorifico non invalida un esercizio già chiuso.",
      },
      {
        titolo: "Bilancio di sostenibilità e conformità ESG",
        norma: "GRI 2021 · ESRS VSME",
        passi: [
          "Organizzazione",
          "Doppia materialità guidata",
          "49 indicatori su due anni",
          "Politiche e obiettivi",
          "Racconto e fotografie",
          "Verifica delle lacune",
          "Documento impaginato",
        ],
        punto:
          "La sezione emissioni legge direttamente dall'inventario GHG della stessa azienda: una modifica lì, aggiornata qui.",
      },
      {
        titolo: "Autovalutazione ESG del fornitore",
        norma: "ESRS · GRI · ISO 20400",
        passi: [
          "Anagrafica e committente",
          "37 domande su 5 aree pesate",
          "Indice di prontezza con soglia",
          "Piano di adeguamento ordinato",
          "Evidenze documentali",
          "Attestato con codice di verifica",
        ],
        punto:
          "L'indice si rinormalizza sulle sole aree valutate: chi ha compilato una sola area non risulta bocciato sulle altre quattro.",
      },
    ],
  },
  {
    nome: "Compliance",
    tratto: "bg-area-compliance",
    percorsi: [
      {
        titolo: "Modello 231",
        norma: "D.Lgs. 231/2001",
        passi: [
          "Processi sensibili",
          "25 reati presupposto",
          "Rischio inerente e residuo",
          "81 presidi su dieci pilastri",
          "18 procedure e 54 moduli",
          "Matrice reati-processi",
          "Relazione dell'Organismo di Vigilanza",
        ],
        punto:
          "Uno scenario non valutato conta come non accettabile: in materia 231 l'onere è dell'ente, e presidi non dichiarati sono presidi assenti.",
      },
      {
        titolo: "Prevenzione della corruzione",
        norma: "UNI ISO 37001",
        passi: [
          "Contesto e soci in affari",
          "Rischio su quattro dimensioni",
          "Otto obblighi che ne discendono",
          "91 requisiti su sette capitoli",
          "12 procedure e 47 moduli",
          "Relazione all'organo di governo",
        ],
        punto:
          "Un precedente per corruzione porta sempre a rischio Critico, e da lì gli obblighi si accendono da soli: non è una casella da spuntare a mano.",
      },
      {
        titolo: "Gestione delle segnalazioni",
        norma: "D.Lgs. 24/2023",
        passi: [
          "Titolo dell'obbligo",
          "Canale e tre modalità",
          "Fascicoli con i termini di legge",
          "Rischio di ritorsione",
          "82 requisiti articolo per articolo",
          "Relazione periodica",
        ],
        punto:
          "I sette giorni e i tre mesi non sono un promemoria: il sistema li calcola, e il riscontro decorre dall'avviso effettivamente reso, come dice la norma.",
      },
      {
        titolo: "Due diligence di filiera",
        norma: "Linee guida OCSE · CSDDD",
        passi: [
          "Politica e perimetro",
          "Mappatura dei partner",
          "Rischio inerente su quattro assi",
          "Maturità su sette aree",
          "Piano e frequenza di verifica",
          "Riesame del processo",
          "Dichiarazione annuale",
        ],
        punto:
          "La copertura si misura sulla spesa, non sul numero di fornitori: dieci partner marginali valutati non compensano il grosso non guardato.",
      },
    ],
  },
  {
    nome: "Sistemi di gestione",
    tratto: "bg-area-sistemi",
    percorsi: [
      {
        titolo: "Sistema di gestione integrato QAS",
        norma: "ISO 9001 · 14001 · 45001",
        passi: [
          "Perimetro delle tre norme",
          "107 requisiti, 33 condivisi",
          "Aspetti ambientali e rischi SSL",
          "Indicatori con target e soglia",
          "16 registri operativi",
          "Riesame di direzione",
        ],
        punto:
          "Chi è certificato su una norma sola ne vede solo i suoi requisiti. E un indicatore senza target non è «a target»: risulta non rilevato, com'è giusto.",
      },
      {
        titolo: "Sistema di gestione SA8000/2026",
        norma: "SA8000:2026",
        passi: [
          "Anagrafica del sistema",
          "112 criteri in tre sezioni",
          "22 procedure da adottare",
          "104 moduli e 10 registri",
          "Manuale del sistema",
        ],
        punto:
          "Un criterio attuato parzialmente pesa zero, non metà: un criterio sociale applicato a metà non protegge a metà un lavoratore, e il punteggio non deve suggerire il contrario.",
      },
      {
        titolo: "Statement of Applicability (SoA)",
        norma: "ISO/IEC 27001:2022 §6.1.3 d)",
        passi: [
          "Contesto e ambito",
          "174 controlli su 5 quadri",
          "Applicabilità e motivazioni",
          "Verifiche di coerenza",
          "Piano di attuazione",
          "Statement firmato",
        ],
        punto:
          "Un controllo applicabile senza stato pesa zero e non viene ignorato: saltare i controlli difficili non fa salire l'indice.",
      },
    ],
  },
];
