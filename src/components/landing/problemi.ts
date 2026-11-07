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

export const PROBLEMI: Richiesta[] = [
  {
    mittente: "Il cliente",
    titolo: "Ti manda il questionario ESG, e vuole numeri.",
    testo:
      "I grandi gruppi rendicontano la loro catena del valore e girano le domande ai fornitori. Chi risponde con dati e documenti resta fra i qualificati.",
    fonte: "Direttiva (UE) 2022/2464 (CSRD); Raccomandazione (UE) 2025/1710 (VSME)",
  },
  {
    mittente: "La banca",
    titolo: "Nel tuo merito di credito entrano anche i fattori ESG.",
    testo: "La banca li deve valutare quando concede un prestito. Se non ha i tuoi numeri, ragiona su stime di settore.",
    fonte: "Orientamenti EBA/GL/2020/06; Orientamenti EBA/GL/2025/01",
  },
  {
    mittente: "La gara",
    titolo: "In gara, chi non è certificato versa di più.",
    testo:
      "Inventario GHG, attestazione del Modello 231, SA8000 e sistemi ISO certificati riducono la garanzia da presentare.",
    fonte: "D.Lgs. 36/2023, art. 106, comma 8, e Allegato II.13",
  },
  {
    mittente: "La legge",
    titolo: "Dai 50 dipendenti, il canale per le segnalazioni.",
    testo: "Senza un canale interno conforme, ANAC sanziona da 10.000 a 50.000 euro.",
    fonte: "D.Lgs. 24/2023, art. 4 e art. 21",
  },
  {
    mittente: "La legge",
    titolo: "NIS2 riguarda le medie e grandi imprese di molti settori.",
    testo: "Le sanzioni arrivano a 10 milioni di euro o al 2% del fatturato mondiale.",
    fonte: "D.Lgs. 138/2024",
  },
  {
    mittente: "La legge",
    titolo: "Un dato personale perso si notifica entro 72 ore.",
    testo: "Al Garante, con ciò che è successo e ciò che hai fatto per rimediare.",
    fonte: "Regolamento (UE) 2016/679, art. 33",
  },
];
