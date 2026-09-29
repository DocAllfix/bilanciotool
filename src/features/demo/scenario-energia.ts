// I numeri della diagnosi energetica dell'azienda dimostrativa.
//
// ⚠️ STANNO QUI, PURI, PERCHÉ LI LEGGONO IN DUE.
//
// Il seme li scrive nel database (`seed-demo-moduli.ts`); la vetrina pubblica del percorso
// li usa come scenario di partenza e li calcola nel browser. Lasciarli dentro il seme non si
// poteva: quel file importa lo schema del database, e tirarlo nel bundle del browser porta
// dietro `postgres` — è lo stesso muro contro cui ha sbattuto l'aritmetica dei compensi.
//
// E copiarli sarebbe peggio del muro: due elenchi di consumi che divergono producono una
// vetrina che mostra numeri diversi dalla dimostrativa che la stessa persona aprirà dopo
// essersi registrata. Un consulente che apre due volte lo stesso esempio e trova due risposte
// smette di fidarsi di entrambe.
//
// I 612.000 kWh e i 42.500 Smc sono gli stessi numeri dell'inventario GHG della dimostrativa:
// è la coerenza che un consulente controlla per prima.

/** [vettore, quantità nell'unità del vettore, costo €] */
export const VETTORI: [string, string, string | null][] = [
  ["ele", "612000", "128520"],
  ["ele_go", "180000", null],
  ["fv", "42000", "0"],
  ["gas", "42500", "38250"],
  ["gasolio_t", "8600", "14620"],
];

// I dodici mesi devono sommare al totale del vettore, altrimenti il grafico
// mensile racconta un anno diverso da quello del bilancio.
export const MENSILI: Record<string, string[]> = {
  ele: ["56000", "54000", "52000", "50000", "48000", "50000", "42000", "36000", "50000", "54000", "58000", "62000"],
  gas: ["6800", "6200", "5100", "3400", "1700", "850", "400", "400", "1200", "3200", "5450", "7800"],
};

// [uso, vettore, quantità]. Per ciascun vettore la somma fa il totale: è la
// quadratura, ed è il controllo che il passo 3 mostra per primo.
export const RIPARTIZIONE: [string, string, string][] = [
  ["U02", "ele", "68000"], ["U03", "ele", "214000"], ["U07", "ele", "118000"],
  ["U08", "ele", "46000"], ["U10", "ele", "38000"], ["U13", "ele", "12000"],
  ["U15", "ele", "54000"], ["U16", "ele", "32000"], ["U19", "ele", "30000"],
  ["U03", "fv", "26000"], ["U07", "fv", "16000"],
  ["U02", "gas", "9500"], ["U13", "gas", "33000"],
  ["U20", "gasolio_t", "8600"],
];

/** [uso, attivo, metodo, nota] */
export const USI: [string, boolean, "mis" | "cal" | "sti" | null, string | null][] = [
  ["U01", false, null, "Nessun forno fusorio: i semilavorati arrivano già colati."],
  ["U02", true, "mis", "Contatore dedicato sul forno di trattamento termico."],
  ["U03", true, "mis", "Somma dei contatori di reparto (torni, centri di lavoro, rettifiche)."],
  ["U07", true, "mis", "Contatore sulla sala compressori."],
  ["U08", true, "cal", "Assorbimento di targa dei gruppi frigo per le ore di funzionamento registrate."],
  ["U10", true, "sti", "Stima da potenza installata e ore di aspirazione dei reparti."],
  ["U13", true, "cal", "Ripartizione della centrale termica sulle volumetrie riscaldate."],
  ["U15", true, "cal", "Censimento dei corpi illuminanti per le ore di accensione."],
  ["U16", true, "sti", "Sala server e postazioni uffici: stima da potenza assorbita media."],
  ["U19", true, "cal", "Consumi di ricarica dei carrelli elettrici."],
  ["U20", true, "mis", "Litri di gasolio dai rifornimenti della flotta."],
];

/** [variabile, 2025, 2024] */
export const VARIABILI: [string, string, string][] = [
  ["prod", "1250", "1180"],
  ["add", "48", "46"],
  ["sup", "4200", "4200"],
  ["suptot", "6800", "6800"],
  ["gg", "228", "226"],
  ["fatt", "5200000", "4900000"],
];

export const INTERVENTI = [
  {
    descrizione: "Sostituzione del compressore a vite con macchina a inverter e rifacimento della rete aria",
    vettoreKey: "ele", quantita: "68000", investimento: "42000", incentivo: null,
    usoKey: "U07", stato: "approvato" as const, annoPrevisto: 2026,
    note: "Risparmio stimato dal confronto fra assorbimento specifico attuale (0,118 kWh/Nm³) e dichiarato della macchina nuova, sulle ore di funzionamento registrate. Non include il recupero delle perdite di rete, quantificate a parte.",
  },
  {
    descrizione: "Relamping a LED dei reparti produttivi e del piazzale",
    vettoreKey: "ele", quantita: "39000", investimento: "28000", incentivo: "5600",
    usoKey: "U15", stato: "realizzato" as const, annoPrevisto: 2025,
    note: "Censimento di 214 corpi illuminanti sostituiti; risparmio a parità di illuminamento misurato in cinque punti campione.",
  },
  {
    descrizione: "Recupero del calore dai compressori per il preriscaldo dell'acqua tecnica",
    vettoreKey: "gas", quantita: "4200", investimento: "16000", incentivo: null,
    usoKey: "U13", stato: "valutato" as const, annoPrevisto: 2027,
    note: "Ipotesi: recupero del 60% del calore dissipato nelle ore di contemporaneità fra sala compressori e fabbisogno termico. Da confermare con una campagna di misura invernale.",
  },
];

/** Il profilo del sito: lo scrive il seme nel `profilo` del bilancio e la vetrina lo mostra
 *  al passo 1, che lì è in anteprima. */
export const PROFILO = {
  forma: "S.r.l.",
  piva: "07566620723",
  sede: "Bari",
  settore: "Componenti meccanici di precisione",
  ateco: "25.62",
  sito: "Stabilimento di Bari, via delle Officine 12",
  attivita: "Tornitura, fresatura e rettifica di componenti di precisione per automotive e meccanica agricola.",
  turni: "Due turni, 228 giorni lavorativi",
  referente: "Ing. Paola Ranieri — HSE Manager",
  perimetro: "Stabilimento di Bari. Il deposito di Modugno, privo di lavorazioni, è escluso dalla diagnosi e dichiarato tale.",
  unitaProd: "t di prodotto finito",
} as const;

export const ANNO_SCENARIO = 2025;
export const ANNO_BASE_SCENARIO = 2024;
