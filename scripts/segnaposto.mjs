// I SEGNAPOSTO DEL CORPUS: due meccanismi sotto la stessa parentesi quadra.
//
// Questo file contiene DECISIONI, non estrazione, ed è per questo che sta a parte e si
// legge: chi lo modifica cambia che cosa compare in un documento legale.
//
// ── Il fatto che ha sciolto il nodo ──────────────────────────────────────────
//
// Ogni procedura ha una testata con `["Redatto da:", <segnaposto>, "Approvato da:",
// <segnaposto>]`. Il committente ha chiarito che **il Modello 231 lo redigono i consulenti
// per i loro clienti**: quindi «Redatto da» è lo STUDIO, «Approvato da» è la direzione del
// CLIENTE.
//
// Da qui la sorte di `[Resp. Due Diligence]`, che compare in cinque moduli su sei: nei
// prototipi è coperto solo dalla filiera, dove l'autore lo mappava a un ruolo interno del
// cliente. Ma sta nella casella «Redatto da» in tutti e cinque, quindi è lo studio
// ovunque — nella filiera compresa. La mappatura del prototipo era l'autore che assumeva
// un uso self-service; il prodotto si vende ai consulenti.
//
// ── Perché `[GG/MM/AAAA]` non è un token ────────────────────────────────────
//
// In SA8000/2026 compare 108 volte: 44 nelle procedure e **64 nei moduli**. Il prototipo
// la sostituisce con la data di adozione, il che va bene per l'intestazione di una
// procedura e va MALE per un verbale in bianco, che si troverebbe predatato. Un modulo che
// si compila a mano deve restare vuoto: resta una casella.
//
// Stessa ragione per le 48 altre forme di SA8000/2026: `[N.]`, `[R__]`, `[Mese]`,
// `[Completo / Intermedio / Straordinario]`, `[Resp. SA / HR]` non sono dati che il
// sistema conosce — sono spazi da riempire e liste fra cui scegliere. Contarle come token
// non risolti terrebbe quel modulo a «415 segnaposto aperti» per sempre.

/** Token comuni alla testata di ogni procedura. */
const TESTATA = {
  "[Rev.]": { fonte: "revisione" },
  "[Nome Organizzazione]": { fonte: "azienda", campo: "ragione" },
  // «Redatto da»: il consulente, non un ruolo dell'azienda cliente.
  "[Resp. Due Diligence]": { fonte: "studio" },
};

/** Ogni modulo dichiara i propri: le anagrafiche hanno campi diversi, e lo stesso
 *  segnaposto pesca da fonti diverse. È la ragione per cui la tabella è per modulo. */
export const TOKEN = {
  mog231: {
    ...TESTATA,
    "[Alta Direzione]": { fonte: "azienda", campo: "direzione" },
  },
  iso37001: {
    ...TESTATA,
    "[Alta Direzione]": { fonte: "azienda", campo: "direzione" },
    "[Funzione PC]": { fonte: "azienda", campo: "funzPC" },
  },
  sgiqas: {
    ...TESTATA,
    "[Alta Direzione]": { fonte: "azienda", campo: "direzione" },
    "[Direzione]": { fonte: "azienda", campo: "direzione" },
    "[Responsabile SGI]": { fonte: "azienda", campo: "rsi" },
  },
  filiera: {
    ...TESTATA,
    "[Alta Direzione]": { fonte: "azienda", campo: "direzione" },
  },
  wb: {
    ...TESTATA,
    // ⚠️ L'anagrafica del whistleblowing NON ha un campo `direzione`: ha `organo`
    // («Organo di indirizzo»). È esattamente per questo che nel prototipo `[Alta
    // Direzione]` restava non risolto: la sua tabella conosceva `[Direzione]`, non questa
    // forma, e il campo si chiamava in un altro modo.
    "[Alta Direzione]": { fonte: "azienda", campo: "organo" },
  },
  sa8000: {
    "[Nome Organizzazione]": { fonte: "azienda", campo: "ragione" },
    // Variante tutta maiuscola, una sola occorrenza: il prototipo non la copriva.
    "[NOME ORGANIZZAZIONE]": { fonte: "azienda", campo: "ragione" },
    "[Resp. SA]": { fonte: "azienda", campo: "respSA" },
    "[Resp. SA8000]": { fonte: "azienda", campo: "respSA" },
    "[Responsabile SA8000]": { fonte: "azienda", campo: "respSA" },
    "[Alta Direzione]": { fonte: "azienda", campo: "direzione" },
    "[Direzione]": { fonte: "azienda", campo: "direzione" },
    "[URL sito web]": { fonte: "azienda", campo: "sitoweb" },
  },
};

/**
 * Le caselle da riempire di SA8000/2026: 49 forme, 171 occorrenze.
 *
 * `[org]` sta qui e non fra i token di proposito. Compare una volta sola, dentro
 * `reclami.sa8000@[org].it`: il prototipo ci sostituisce una versione abbreviata della
 * ragione sociale, e senza quella trasformazione ci finirebbe il nome per esteso dentro un
 * indirizzo di posta. Meglio una casella che un indirizzo sbagliato.
 */
export const CAMPO = {
  sa8000: [
    "[GG/MM/AAAA]", "[AAAA]", "[N.]", "[N]", "[NN]", "[MM]", "[2]",
    "[Mese]", "[Mese–Mese]", "[Trimestre / Anno]", "[Trimestrale]", "[12/24]", "[Data indicativa]",
    "[R__]", "[A__]", "[OB-__]", "[N. seggi]",
    "[Titolo]", "[Firma]", "[Nome]", "[Nome/Ruolo]", "[Cognome Nome]",
    "[AD]", "[HR]", "[AD / Resp. SA]", "[HR / Resp. SA]", "[DPO / HR]",
    "[Resp. SA / HR]", "[Resp. SA / SPT]", "[Resp. SA / Acquisti]", "[Resp. SA / Legale]",
    "[Resp. SA / Funzioni]", "[Resp. SA / Panel]", "[Resp. SA / RSPP]", "[Resp. SA / DPO]",
    "[DPO / Resp. SA]", "[Rapp. Dir. H&S / RSPP]", "[Rapp. Dir. H&S / Resp. SA]",
    "[Coordinatore SPT]", "[SPT / OO.SS.]", "[Panel / Nomi]", "[Elenco sindacati]",
    "[Completo / Intermedio / Straordinario]",
    "[Cassetta suggerimenti / Email / Portale / SPT]",
    "[Canale reclami riservato]", "[canale di contatto]", "[canale]",
    "[Da inserire nei contratti e ordini di acquisto]",
    "[org]",
  ],
};

/** Le righe da seminare per un modulo, nella forma della tabella `corpus_placeholder`. */
export function segnaposti(dominio) {
  const righe = [];
  for (const [forma, r] of Object.entries(TOKEN[dominio] ?? {})) {
    righe.push({ forma, genere: "token", fonte: r.fonte, campo: r.campo ?? null });
  }
  for (const forma of CAMPO[dominio] ?? []) {
    righe.push({ forma, genere: "campo", fonte: null, campo: null });
  }
  return righe;
}
