// La determinazione dell'AMBITO SOGGETTIVO del D.Lgs. 138/2024 (NIS2).
//
// E' il primo motore del modulo e quello in cui un errore costa di piu': da qui
// discendono gli obblighi che si applicano e il tetto delle sanzioni. Dire «Importante»
// a un soggetto essenziale significa consegnare a un cliente un documento che sottostima
// i suoi obblighi di tre milioni di euro di tetto sanzionatorio e mezzo punto di
// fatturato.
//
// La regola, in tre gradini (art. 3 e Allegati I e II):
//   1. i CRITERI SPECIFICI prescindono dalla dimensione e vincono su tutto;
//   2. altrimenti decide l'incrocio fra settore (Allegato I o II) e dimensione;
//   3. una micro o piccola impresa senza criteri specifici resta fuori ambito.

/** I settori ad alta criticita' dell'Allegato I e gli altri settori critici dell'Allegato II. */
export type Allegato = 1 | 2;

export type Dimensione = "micro" | "media" | "grande";

/**
 * La classificazione.
 *
 * ⚠️ `null` NON e' «fuori ambito», ed e' la distinzione che questo tipo esiste per
 * tenere. «Fuori ambito» e' una determinazione — sei in un settore elencato e stai sotto
 * le soglie — e si scrive in un documento firmato. `null` vuol dire che da qui non si
 * conclude niente, perche' manca il dato o perche' il settore negli allegati non compare.
 * Confonderle significherebbe far dichiarare a un'azienda di essere fuori dal decreto
 * sulla base di una domanda a cui nessuno ha risposto.
 */
export type Classe = "essenziale" | "importante" | "fuori_ambito";

/** Perche' e' venuta quella classificazione. Un codice, non una frase. */
export type Via =
  | "criterio_specifico"
  | "grande_allegato_1"
  | "grande_allegato_2"
  | "media_allegato_1"
  | "media_allegato_2"
  | "sotto_soglia"
  | "settore_non_elencato"
  | "dimensione_non_dichiarata";

/**
 * I criteri che prescindono dalla dimensione (art. 3 c. 4÷8).
 *
 * ⚠️ Enum chiuso, non testo libero. Nella SoA una regola scritta come espressione
 * regolare (`/cloud/i`) corrispondeva anche a «Nessun servizio cloud» e faceva comparire
 * un avviso proprio a chi aveva dichiarato di non usarne. Con un enum il confronto e' per
 * valore e l'esaustivita' la controlla il compilatore.
 */
export type Criterio = "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7" | "c8";

/**
 * A quale classe porta ciascun criterio specifico.
 *
 * ⚠️ Un `Record` completo, non una mappa parziale: un criterio nuovo senza la sua classe
 * non compila. Se fosse un `Partial`, un criterio dimenticato scivolerebbe nel ramo
 * dimensionale e una micro impresa designata dall'Autorita' risulterebbe fuori ambito.
 */
export const CLASSE_DEL_CRITERIO: Record<Criterio, Extract<Classe, "essenziale" | "importante">> = {
  c1: "essenziale", // reti pubbliche di comunicazione elettronica o servizi accessibili al pubblico
  c2: "essenziale", // prestatore di servizi fiduciari
  c3: "essenziale", // registri di dominio di primo livello o servizi DNS
  c4: "essenziale", // pubblica amministrazione individuata dalla normativa
  c5: "essenziale", // unico fornitore nello Stato di un servizio essenziale
  c6: "essenziale", // perturbazione con impatto su sicurezza, incolumita' o salute pubblica
  c7: "importante", // impatto sistemico o rilevanza particolare, nazionale o regionale
  c8: "importante", // individuato da normative settoriali o da specifica designazione
};

export type Ingresso = {
  /** Il settore dichiarato, come lo nomina il catalogo degli allegati. */
  settore: string | null;
  dimensione: Dimensione | null;
  criteri: readonly Criterio[];
};

export type Esito = {
  classe: Classe | null;
  via: Via;
  /** Il criterio che ha deciso, quando ha deciso un criterio. */
  criterio: Criterio | null;
  allegato: Allegato | null;
};

/** Il tetto sanzionatorio, in numeri: la frase la compone chi la mostra. */
export type Sanzione = { massimo: number; percentuale: number };

/**
 * A quale allegato appartiene un settore.
 *
 * I due elenchi sono contenuto di seme (`nis2-settori-1.json` e `nis2-settori-2.json`),
 * quindi si passano: il motore non li conosce, e cosi' resta puro e il giorno che il
 * decreto ne aggiunge uno non si tocca il codice.
 */
export type Allegati = { primo: readonly string[]; secondo: readonly string[] };

function allegatoDi(settore: string | null, allegati: Allegati): Allegato | null {
  if (!settore) return null;
  if (allegati.primo.includes(settore)) return 1;
  if (allegati.secondo.includes(settore)) return 2;
  return null;
}

// ⚠️ QUI C'ERA L'ELENCO DEI VENTITRE SETTORI, ED E' STATO TOLTO.
//
// I contenuti metodologici di questo prodotto sono dati di seme versionati nel database,
// non costanti nel codice: e' la regola scritta dalla Fase 2, e vale per i 25 tipi di
// sorgente ISO, per i 49 KPI e per i 59 fattori di emissione. Un elenco scritto qui E
// seminato la' sono due elenchi, e due elenchi divergono.
//
// Quello che resta nel codice e' la REGOLA — a quale classe porta ciascun criterio, e
// come l'allegato incrocia la dimensione — perche' una regola e' eseguibile e deve stare
// con la logica che la applica. E' la stessa distinzione gia' fatta per gli otto obblighi
// derivati di ISO 37001: le etichette nel database, le condizioni nel motore.
//
// Conseguenza voluta: `classifica` PRETENDE gli allegati e non ne ha un valore
// predefinito. Un predefinito sarebbe una copia silenziosa che regge finche' nessuno
// aggiorna il seme.

export function classifica(ingresso: Ingresso, allegati: Allegati): Esito {
  const allegato = allegatoDi(ingresso.settore, allegati);

  // ── 1 · I criteri specifici, che prescindono dalla dimensione ───────────────
  //
  // ⚠️ Vince il piu' GRAVE, non il primo dell'elenco. Un soggetto che spunta sia c7
  // (importante) sia c1 (essenziale) e' essenziale: scegliere per ordine di comparsa
  // gli darebbe tre milioni in meno di tetto sanzionatorio e meno obblighi, e
  // l'ordine in cui uno spunta delle caselle non e' una fonte del diritto.
  const perCriterio = ingresso.criteri
    .map((c) => ({ criterio: c, classe: CLASSE_DEL_CRITERIO[c] }))
    .filter((x) => !!x.classe);
  const essenziale = perCriterio.find((x) => x.classe === "essenziale");
  const importante = perCriterio.find((x) => x.classe === "importante");
  const deciso = essenziale ?? importante;
  if (deciso) {
    return { classe: deciso.classe, via: "criterio_specifico", criterio: deciso.criterio, allegato };
  }

  // ── 2 · Il settore ─────────────────────────────────────────────────────────
  if (!allegato) {
    return { classe: null, via: "settore_non_elencato", criterio: null, allegato: null };
  }

  // ── 3 · La dimensione ──────────────────────────────────────────────────────
  if (!ingresso.dimensione) {
    return { classe: null, via: "dimensione_non_dichiarata", criterio: null, allegato };
  }
  if (ingresso.dimensione === "grande") {
    return allegato === 1
      ? { classe: "essenziale", via: "grande_allegato_1", criterio: null, allegato }
      : { classe: "importante", via: "grande_allegato_2", criterio: null, allegato };
  }
  if (ingresso.dimensione === "media") {
    return {
      classe: "importante",
      via: allegato === 1 ? "media_allegato_1" : "media_allegato_2",
      criterio: null,
      allegato,
    };
  }
  return { classe: "fuori_ambito", via: "sotto_soglia", criterio: null, allegato };
}

/**
 * Il tetto sanzionatorio dell'art. 38.
 *
 * ⚠️ Numeri, non una frase. Il prototipo restituisce «fino a 10 milioni di euro o al 2%
 * del fatturato mondiale annuo, se superiore»: una frase si stampa e basta — non si
 * confronta col fatturato dichiarato, non si traduce, e chi la rende deve fidarsi che sia
 * gia' formattata bene per il posto in cui finisce. Qui la frase la compone chi la mostra,
 * e il documento e la schermata possono dirla in due modi restando d'accordo sul numero.
 */
export function sanzione(classe: Classe | null): Sanzione | null {
  if (classe === "essenziale") return { massimo: 10_000_000, percentuale: 2 };
  if (classe === "importante") return { massimo: 7_000_000, percentuale: 1.4 };
  return null;
}
