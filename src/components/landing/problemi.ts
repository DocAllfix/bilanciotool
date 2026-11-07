// Le richieste che la home mette davanti a chi legge, con la FONTE di ciascuna.
//
// ⚠️ DURE MA VERE (6 novembre 2026, riscritte il 7). La copy deve far sentire la pressione
// reale, e su un prodotto che vende conformità un'affermazione sbagliata in vetrina è il
// danno peggiore: la legge prima un potenziale cliente, e la riprende un concorrente.
// Quindi ogni voce dice CHI è obbligato (le soglie esistono e si scrivono) e porta la
// fonte primaria, che compare in pagina sotto il testo. La guardia è
// `problemi-fonti-pure.test.ts`.
//
// ⚠️ Due frasi sono scritte più miti di come le si vorrebbe, di proposito:
// - la BANCA non «rifiuta il finanziamento»: gli orientamenti EBA le chiedono di valutare
//   i fattori ESG, non di rifiutare. È vero, invece, che senza i dati dell'impresa ragiona
//   su stime (EBA/GL/2025/01 le ammette quando i dati mancano);
// - la GARA non «si perde»: l'Allegato II.13 riduce la GARANZIA a chi è certificato, e
//   questo è ciò che si scrive.
//
// ⚠️ Gli importi delle sanzioni si scrivono in LETTERE di euro, mai col simbolo: la home
// non mostra cifre di prezzo, e il collaudo pubblico lo verifica cercando proprio gli
// importi col simbolo dell'euro.
//
// Verificate il 7 novembre 2026: D.Lgs. 36/2023 art. 106, comma 8, e Allegato II.13 (l'elenco
// comprende ISO 14064-1, l'attestazione del Modello 231, SA8000, ISO 9001, 14001, 45001 e
// 27001); EBA/GL/2020/06 (fattori ESG nella valutazione del merito di credito);
// EBA/GL/2025/01 (stime quando i dati mancano); Raccomandazione (UE) 2025/1710 (VSME);
// D.Lgs. 24/2023 artt. 4 e 21; D.Lgs. 138/2024; Reg. (UE) 2016/679 art. 33.

export type Problema = {
  /** La frase che si legge per prima: la situazione, detta come la vive chi la subisce. */
  titolo: string;
  /** Chi è obbligato, che cosa rischia, e che cosa serve. */
  testo: string;
  /** Il riferimento normativo, stampato sotto il testo. */
  fonte: string;
};

/** Da dove arriva la richiesta. L'ordine è quello in cui si leggono in pagina. */
export const MITTENTI = ["Il cliente", "La banca", "La gara", "La legge"] as const;
export type Mittente = (typeof MITTENTI)[number];

export type Richiesta = Problema & { mittente: Mittente };

// ⚠️ Più dure e più corte dal 7 novembre 2026 (richiesta del committente: «più lacrime e
// sangue, meno verboso»). Ogni frase dura resta VERA: si stringe il testo, non si gonfia la
// conseguenza. Il Modello 231 non è un obbligo, ed è scritto come conseguenza: senza Modello
// l'azienda risponde del reato commesso nel suo interesse.
export const PROBLEMI: Richiesta[] = [
  {
    mittente: "Il cliente",
    titolo: "Il tuo cliente rendiconta la sua filiera. Cioè te.",
    testo: "Le domande arrivano a te. Vogliono numeri e documenti.",
    fonte: "Direttiva (UE) 2022/2464 (CSRD); Raccomandazione (UE) 2025/1710 (VSME)",
  },
  {
    mittente: "La banca",
    titolo: "La banca pesa anche il tuo rischio ESG.",
    testo: "Senza i tuoi numeri usa le stime del tuo settore.",
    fonte: "Orientamenti EBA/GL/2020/06; Orientamenti EBA/GL/2025/01",
  },
  {
    mittente: "La gara",
    titolo: "Chi non è certificato versa di più.",
    // ⚠️ NON «senza, si versa per intero»: il comma 8 riduce già del 50% la garanzia di micro,
    // piccole e medie imprese, e le certificazioni dell'Allegato II.13 tolgono fino a un altro
    // 20%, cumulabile. Chi non è certificato versa di più: non l'importo pieno.
    testo: "La riducono inventario GHG, Modello 231, SA8000 e sistemi ISO certificati.",
    fonte: "D.Lgs. 36/2023, art. 106, comma 8, e Allegato II.13",
  },
  {
    mittente: "La legge",
    titolo: "Il reato è del dipendente. La sanzione è dell'azienda.",
    testo: "Se è commesso nel suo interesse, e senza un Modello 231 attuato.",
    fonte: "D.Lgs. 231/2001, art. 5, art. 6 e art. 9",
  },
  {
    mittente: "La legge",
    titolo: "Dai 50 dipendenti: senza canale per le segnalazioni, fino a 50.000 euro.",
    testo: "Dai 50 dipendenti in su, o con un Modello 231. La sanzione parte da 10.000 euro.",
    fonte: "D.Lgs. 24/2023, art. 4 e art. 21",
  },
  {
    mittente: "La legge",
    titolo: "NIS2, medie e grandi imprese di molti settori: fino a 10 milioni o il 2% del fatturato.",
    testo: "Per le medie e grandi imprese di molti settori, dall'energia alla manifattura.",
    fonte: "D.Lgs. 138/2024",
  },
  {
    mittente: "La legge",
    titolo: "Un dato personale perso: 72 ore per dirlo al Garante.",
    testo: "Il registro dei trattamenti si scrive prima. Le sanzioni arrivano al 4% del fatturato.",
    fonte: "Regolamento (UE) 2016/679, art. 30, art. 33 e art. 83",
  },
];
