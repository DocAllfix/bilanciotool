import type { ModuloAzienda } from "@/features/companies/moduli";

/**
 * Che cosa saprai fare dopo aver seguito il corso.
 *
 * ⚠️ NON È UN SOTTOTITOLO DECORATIVO, ed è la cosa che fa aprire un corso. «Bilancio
 * energetico» dice l'argomento e non fa venire voglia di niente: è il nome di una materia,
 * e chi lo legge sa già di che si tratta. «Costruire una diagnosi che regge in verifica»
 * dice il ritorno, ed è la stessa cosa detta dal lato di chi deve decidere se spenderci
 * quaranta minuti.
 *
 * ⚠️ E il calore di questa pagina viene DA QUI, non dai colori. È la sola cosa che l'altra
 * sessione ha portato dalla propria esperienza su questo punto: hanno una palette calda e
 * le schede fredde le hanno scaldate cambiando le stringhe, non le tinte. Questo prodotto
 * ha una palette fredda per scelta, quindi qui la leva è tutta nelle parole.
 *
 * Il tipo è un `Record` completo: un percorso nuovo senza la sua riga non compila. Una
 * riga mancante lascerebbe una scheda muta in mezzo a dodici che promettono qualcosa, e si
 * leggerebbe come una dimenticanza — che è esattamente quello che sarebbe.
 */
export const RISULTATO: Record<ModuloAzienda, string> = {
  ghg: "Costruire un inventario delle emissioni che regga davanti a un verificatore, con le esclusioni motivate e le evidenze al loro posto.",
  energetico:
    "Portare a termine una diagnosi energetica che quadra, sapendo dove spendere una misura vera e dove basta una stima.",
  bilancio:
    "Redigere un bilancio in cui materialità, politiche e indicatori si tengono insieme, e in cui le emissioni vengono da un posto solo.",
  sgesg:
    "Accompagnare un'azienda lungo un anno, dalle prime domande a un sistema che sta in piedi anche quando tu non ci sei.",
  fornitore:
    "Rispondere in mezza giornata al questionario di un committente, e uscirne con un piano ordinato per convenienza.",
  filiera:
    "Mappare una filiera per sito invece che per ragione sociale, e sapere quali fornitori verificare per primi.",
  mog231:
    "Impiantare un modello che regge il giudizio di idoneità, dalla mappatura dei processi ai registri che ne provano l'attuazione.",
  anticorruzione:
    "Riconoscere i soci in affari che la norma esiste per intercettare, e sapere quali obblighi scattano su ciascuno.",
  segnalazioni:
    "Gestire un fascicolo rispettando i termini di legge e la riservatezza di chi ha parlato, senza mai scrivere un nome.",
  sgiqas:
    "Tenere insieme più norme in un sistema solo, con il perimetro che decide che cosa conta davvero.",
  sa8000:
    "Arrivare alla visita con un sistema vissuto invece che documentato, a partire dal gruppo e dai canali di reclamo.",
  soa: "Dichiarare l'applicabilità di ogni controllo con una motivazione che si difende, e sapere quali sono i cardine.",
};

/**
 * Il corso trasversale, che non ha un `ModuloAzienda` e quindi non entra nel record sopra.
 */
export const RISULTATO_TRASVERSALE: Record<string, string> = {
  "avviare-attivita":
    "Trovare i primi clienti dove il bisogno è già sentito, costruire una proposta che si legge in due pagine, e far vivere lo studio di canoni invece che di progetti.",
};
