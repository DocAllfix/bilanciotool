// I percorsi della vetrina, DERIVATI dal registro dei moduli.
//
// ⚠️ Qui dentro non si scrive un nome di percorso, e non si scrive quanti sono.
//
// Prima li si ricopiava, e sono successe due cose in silenzio. Il dodicesimo percorso —
// «Implementazione del sistema di gestione ESG», aggiunto il 25 agosto — non è mai
// arrivato sulla vetrina: il prodotto ne aveva dodici e la pagina pubblica ne mostrava
// undici. E l'autovalutazione si chiamava «Autovalutazione ESG del fornitore» qui e
// «Autovalutazione ESG» nell'app: due nomi per la stessa cosa, che è il difetto per cui
// il 26 agosto è stato tolto il campo `etichetta` dal registro. Era sopravvissuto
// proprio sulla superficie che vede il pubblico.
//
// Nessun collaudo poteva accorgersene: `visual-check-landing.mjs` contava i percorsi
// LEGGENDO QUESTO FILE, cioè verificava la pagina contro se stessa.
//
// Ora il legame è strutturale: `RACCONTO` è un `Record<ModuloAzienda, …>`, quindi
// **il compilatore pretende tutte e dodici le chiavi**. Aggiungere un modulo al registro
// senza dargli un testo qui non compila — che è meglio di un test, perché non ci si può
// dimenticare di lanciarlo.

import { MODULI_PER_AREA, type AreaModuli, type ModuloAzienda } from "@/features/companies/moduli";

export type PercorsoVetrina = {
  titolo: string;
  norma: string;
  passi: string[];
  punto: string;
};

export type AreaVetrina = {
  nome: string;
  /**
   * Classe scritta per esteso, presa dal registro.
   *
   * ⚠️ Mai costruita con un template literal: Tailwind genera le utility scandendo il
   * TESTO dei sorgenti, quindi `bg-area-${x}` non esiste da nessuna parte e il tratto
   * resterebbe invisibile. Provato: delle cinque aree di allora una sola aveva il
   * colore, e ce l'aveva per caso perché quella classe compariva in un esempio dentro
   * `DESIGN.md`, che lo scanner legge.
   */
  tratto: string;
  /** Perche' questi percorsi stanno insieme. Un'intestazione che non lo dice e' un
   *  raggruppamento che il lettore deve indovinare. */
  perche: string;
  percorsi: PercorsoVetrina[];
};

/**
 * Perche' i percorsi di un gruppo stanno insieme.
 *
 * Non sta nel registro dell'app perche' e' testo di vetrina: dentro il prodotto il nome
 * del gruppo basta, qui invece il raggruppamento va giustificato o sembra arbitrario.
 * `Record<AreaModuli, …>`: un gruppo nuovo senza la sua ragione non compila.
 */
const PERCHE_INSIEME: Record<AreaModuli, string> = {
  ecosostenibilita:
    "La catena di un lavoro solo: che cosa consumi, che cosa emetti, come lo racconti, come ti valuti davanti al mercato.",
  compliance:
    "Obblighi che gravano sull'ente. Non si scelgono: si adempiono, e il documento serve a dimostrare che sono stati adempiuti.",
  sistemi:
    "Certificabili da un ente terzo, con audit periodici e non conformità da chiudere. Qui il documento lo legge un valutatore.",
};

/**
 * Il racconto pubblico di ciascun percorso: i passi e il punto che lo distingue.
 *
 * ⚠️ Il `titolo` NON sta qui: è l'identità del percorso e vive nel registro, uno solo.
 *
 * ⚠️ La `norma` invece sta qui, ed è una citazione più precisa di quella del registro:
 * in pagina serve l'anno e, dove esiste, il punto della norma — «ISO/IEC 27001:2022
 * §6.1.3 d)» dice a un responsabile sicurezza esattamente di che si parla, mentre nel
 * fascicolo dell'app basta «ISO/IEC 27001». Non sono due nomi diversi per la stessa
 * cosa: uno è l'abbreviazione dell'altro. Perché non possano divergere davvero,
 * `vetrina-percorsi-pure.test.ts` pretende che ogni pezzo della norma del registro
 * compaia nella citazione pubblica.
 */
const RACCONTO: Record<ModuloAzienda, Omit<PercorsoVetrina, "titolo">> = {
  ghg: {
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
  energetico: {
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
  bilancio: {
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
  sgesg: {
    norma: "GRI 2021 · ESRS",
    passi: [
      "Acquisizione e offerta",
      "Avvio, squadra e perimetro",
      "Materialità e stakeholder",
      "Diagnosi e lacune",
      "Raccolta dei dati",
      "Strategia e obiettivi",
      "Redazione e pubblicazione",
      "Chiusura e follow-up",
    ],
    punto:
      "Le fasi che chiedono materialità, emissioni e capitoli non li ricopiano: portano dentro i percorsi che già li fanno, così il dato resta dove nasce e non ne esistono due versioni.",
  },
  fornitore: {
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
  mog231: {
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
  anticorruzione: {
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
  segnalazioni: {
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
  filiera: {
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
  sgiqas: {
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
  sa8000: {
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
  soa: {
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
};

/**
 * I gruppi con dentro i loro percorsi, nell'ordine del registro.
 *
 * Un modulo nuovo compare da solo nel proprio gruppo, col nome e il gruppo che il
 * registro gli assegna: qui non c'è niente da ricordarsi di aggiornare tranne il suo
 * racconto, che il compilatore pretende.
 */
export const AREE_VETRINA: AreaVetrina[] = MODULI_PER_AREA.map((gruppo) => ({
  nome: gruppo.nome,
  tratto: gruppo.colore.tratto,
  perche: PERCHE_INSIEME[gruppo.area],
  percorsi: gruppo.moduli.map((m) => ({ titolo: m.nome, ...RACCONTO[m.href] })),
}));

/** Quanti percorsi in tutto. Si conta, non si scrive: è già stato scritto «undici». */
export const QUANTI_PERCORSI = AREE_VETRINA.reduce((n, a) => n + a.percorsi.length, 0);
