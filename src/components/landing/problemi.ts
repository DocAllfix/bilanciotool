// I problemi che la home mette davanti a chi legge, con la FONTE di ciascuno.
//
// ⚠️ SPIETATI MA VERI (6 novembre 2026). La copy deve far sentire la pressione reale —
// obblighi, sanzioni, richieste dei clienti — e su un prodotto che vende conformità
// un'affermazione sbagliata in vetrina è il danno peggiore: la legge prima un potenziale
// cliente, e la riprende un concorrente. Quindi ogni voce dice CHI è obbligato (le soglie
// esistono e si scrivono) e porta la fonte primaria, che compare in pagina sotto il testo.
// Una guardia (`problemi-fonti-pure.test.ts`) pretende la fonte su ogni voce.
//
// ⚠️ Gli importi delle sanzioni si scrivono in LETTERE di euro («10.000 euro»), mai col
// simbolo: la home non mostra cifre di prezzo, e il collaudo pubblico lo verifica cercando
// proprio gli importi col simbolo dell'euro.
//
// Verificate il 6 novembre 2026: D.Lgs. 24/2023 art. 21 c. 1 lett. b); D.Lgs. 102/2014
// art. 8 e art. 16 c. 1; D.Lgs. 138/2024 (soglie per soggetti essenziali e importanti);
// D.Lgs. 231/2001 artt. 5, 6, 9; Reg. (UE) 2016/679 artt. 30, 33, 83; Dir. (UE) 2022/2464.

export type Problema = {
  /** La frase che si legge per prima: la situazione, detta come la vive chi la subisce. */
  titolo: string;
  /** Chi è obbligato, che cosa rischia, e che cosa serve. */
  testo: string;
  /** Il riferimento normativo, stampato sotto il testo. */
  fonte: string;
};

export const PROBLEMI: Problema[] = [
  {
    titolo: "Il cliente ti manda il questionario ESG, e vuole i numeri.",
    testo:
      "I grandi gruppi devono rendicontare la propria catena del valore, e le domande le girano ai fornitori: emissioni, energia, politiche sul personale, prove documentali. Chi risponde con dati e documenti resta fra i fornitori qualificati. Chi risponde a voce, resta a sperare.",
    fonte: "Direttiva (UE) 2022/2464 (CSRD), rendicontazione sulla catena del valore",
  },
  {
    titolo: "Il canale per le segnalazioni non è facoltativo.",
    testo:
      "Dai 50 dipendenti in su, o con un Modello 231 adottato, serve un canale interno di segnalazione con una procedura conforme. Senza, ANAC sanziona da 10.000 a 50.000 euro. E una casella di posta, per le linee guida ANAC, non è un canale idoneo.",
    fonte: "D.Lgs. 24/2023, art. 3, art. 4 e art. 21 c. 1 lett. b); Linee guida ANAC sui canali interni",
  },
  {
    titolo: "La diagnosi energetica ha una scadenza, e una sanzione.",
    testo:
      "Grandi imprese e imprese a forte consumo di energia la devono ogni quattro anni, secondo la norma tecnica. Mancarla costa da 4.000 a 40.000 euro, e i dati che servono sono quelli che hai già nelle bollette.",
    fonte: "D.Lgs. 102/2014, art. 8 e art. 16 c. 1; UNI CEI EN 16247",
  },
  {
    titolo: "NIS2 riguarda più aziende di quanto si pensi.",
    testo:
      "Si applica alle medie e grandi imprese di molti settori: dall'energia ai trasporti, dai rifiuti all'alimentare, fino a parte della manifattura e ai servizi digitali. Le sanzioni arrivano a 10 milioni di euro o al 2% del fatturato mondiale per i soggetti essenziali, a 7 milioni o all'1,4% per gli importanti.",
    fonte: "D.Lgs. 138/2024, di recepimento della Direttiva (UE) 2022/2555",
  },
  {
    titolo: "Il reato di un dipendente può diventare un problema dell'azienda.",
    testo:
      "Se viene commesso nel suo interesse, l'azienda ne risponde con sanzioni pecuniarie e, nei casi più gravi, interdittive. Ciò che la esonera è un Modello di organizzazione adottato prima del fatto, e attuato davvero.",
    fonte: "D.Lgs. 231/2001, art. 5, art. 6 e art. 9",
  },
  {
    titolo: "Un dato personale perso va notificato entro 72 ore.",
    testo:
      "Al Garante, con ciò che è successo e ciò che hai fatto. E il registro dei trattamenti, che quasi ogni azienda deve tenere, si scrive prima, non dopo. Le sanzioni arrivano a 20 milioni di euro o al 4% del fatturato mondiale.",
    fonte: "Regolamento (UE) 2016/679, art. 30, art. 33 e art. 83",
  },
];
