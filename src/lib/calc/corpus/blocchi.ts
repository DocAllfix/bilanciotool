// Le regole di resa di un blocco del corpus, isolate dalla resa vera.
//
// Sembrano dettagli tipografici e non lo sono: sbagliarle cambia la struttura di un
// documento normativo che un cliente porta davanti a un auditor. Qui stanno in funzioni
// pure, così si provano una volta e valgono identiche a schermo e in stampa.

export type BloccoTipo = "p" | "t" | "h" | "sig";

export type Blocco = {
  blockId: string;
  tipo: BloccoTipo;
  contenuto: unknown;
};

/**
 * Un paragrafo che è in realtà un titolo.
 *
 * Nel corpus non esiste un tipo «titolo di paragrafo»: un blocco `p` diventa
 * un'intestazione **in base al proprio testo**. «1. SCOPO» e «1.2 Riferimenti» sono titoli,
 * «Il modello è adottato…» no.
 *
 * ⚠️ Conseguenza da conoscere: riscrivere «1. SCOPO» in «Scopo» dentro una
 * personalizzazione ne cambia anche il livello tipografico. È il comportamento dei
 * prototipi e va tenuto, ma è la ragione per cui la resa non si deduce dal solo tipo.
 */
const TITOLO_1 = /^(\d+)\.\s+[A-ZÀ-Ü]/;
const TITOLO_2 = /^(\d+\.\d+)\s+/;

export function livelloTitolo(testo: string): 1 | 2 | null {
  if (TITOLO_2.test(testo)) return 2;
  if (TITOLO_1.test(testo)) return 1;
  return null;
}

/** Il testo di un paragrafo o di un'intestazione di sezione. */
export function testoParagrafo(contenuto: unknown): string {
  const c = (contenuto ?? {}) as { t?: unknown };
  return typeof c.t === "string" ? c.t : "";
}

/** Le righe di un blocco tabella, pareggiate: la matrice del corpus non è rettangolare. */
function righeDi(contenuto: unknown): { righe: string[][]; vuote: number } {
  const c = (contenuto ?? {}) as { r?: unknown; b?: unknown };
  const grezze = Array.isArray(c.r) ? c.r : [];
  const righe = grezze.map((r) =>
    Array.isArray(r) ? r.map((x) => (typeof x === "string" ? x : String(x ?? ""))) : [],
  );
  // ⚠️ Le righe vuote NON si troncano, e qui si diverge dai prototipi di proposito. Quelli
  // tagliano a 8 (a 6 in SA8000/2026), ma nel corpus ci sono blocchi che ne chiedono 10,
  // 12, 14 e persino 20: un registro cartaceo stampato con otto righe invece di venti è un
  // registro che finisce a metà del mese.
  const vuote = typeof c.b === "number" && Number.isFinite(c.b) && c.b > 0 ? Math.floor(c.b) : 0;
  return { righe, vuote };
}

/**
 * La prima riga si comporta da intestazione?
 *
 * Il corpus non lo dichiara: si deduce. Una riga di titoli è fatta di etichette corte e
 * tutte valorizzate, non di frasi.
 *
 * ⚠️ **Una riga sola non è mai un'intestazione**: un'intestazione senza corpo non esiste.
 * Senza questa regola le righe di dati dei moduli — che nel prototipo della filiera sono
 * blocchi separati di una riga ciascuno — verrebbero rese tutte in grassetto, e un elenco
 * di requisiti diventerebbe una sequenza di titoli.
 */
function intestazionePlausibile(righe: readonly string[][]): boolean {
  if (righe.length < 2) return false;
  const prima = righe[0];
  return prima.length > 1 && prima.every((c) => c !== "" && c.length < 70);
}

export type Unita =
  | { tipo: "paragrafo"; blockId: string; testo: string; livello: 1 | 2 | null }
  | { tipo: "sezione"; blockId: string; testo: string }
  | {
      tipo: "tabella";
      /** Più di uno quando la tabella era spezzata in blocchi da una riga. */
      blockIds: string[];
      intestazione: string[] | null;
      righe: string[][];
      vuote: number;
      colonne: number;
    }
  | { tipo: "firme"; blockId: string };

/**
 * Trasforma i blocchi nelle unità che si rendono.
 *
 * ── Perché non basta una unità per blocco ────────────────────────────────────
 *
 * Nel prototipo della filiera l'autore ha spezzato intestazione e righe di dati in blocchi
 * tabella **separati**, uno per riga. Misurato sul corpus: 456 tabelle da una riga sola
 * (23% del totale), ma le catene consecutive sono **30, e 29 stanno nella filiera** — la
 * più lunga di 11 blocchi. Rese una per una diventerebbero undici tabelline staccate al
 * posto di un elenco di requisiti.
 *
 * Qui le catene si ricompongono, con una condizione conservativa: **stesso numero di
 * colonne**. Due tabelle da una riga che non si somigliano restano distinte, perché
 * unirle sarebbe peggio che lasciarle separate.
 */
export function unita(blocchi: readonly Blocco[]): Unita[] {
  const out: Unita[] = [];
  let i = 0;
  while (i < blocchi.length) {
    const b = blocchi[i];

    if (b.tipo === "sig") {
      out.push({ tipo: "firme", blockId: b.blockId });
      i += 1;
      continue;
    }
    if (b.tipo === "h") {
      out.push({ tipo: "sezione", blockId: b.blockId, testo: testoParagrafo(b.contenuto) });
      i += 1;
      continue;
    }
    if (b.tipo === "p") {
      const testo = testoParagrafo(b.contenuto);
      out.push({ tipo: "paragrafo", blockId: b.blockId, testo, livello: livelloTitolo(testo) });
      i += 1;
      continue;
    }

    // Tabella: raccoglie la catena di blocchi da una riga con lo stesso numero di colonne.
    const primo = righeDi(b.contenuto);
    const blockIds = [b.blockId];
    let righe = primo.righe;
    let vuote = primo.vuote;
    if (primo.righe.length === 1) {
      const colonne = primo.righe[0].length;
      let j = i + 1;
      while (j < blocchi.length && blocchi[j].tipo === "t") {
        const succ = righeDi(blocchi[j].contenuto);
        if (succ.righe.length !== 1 || succ.righe[0].length !== colonne) break;
        righe = [...righe, ...succ.righe];
        vuote += succ.vuote;
        blockIds.push(blocchi[j].blockId);
        j += 1;
      }
      i = j;
    } else {
      i += 1;
    }

    const colonne = righe.reduce((max, r) => Math.max(max, r.length), 0);
    const pari = righe.map((r) =>
      r.length === colonne ? r : [...r, ...Array(colonne - r.length).fill("")],
    );
    const conIntestazione = intestazionePlausibile(pari);
    out.push({
      tipo: "tabella",
      blockIds,
      intestazione: conIntestazione ? pari[0] : null,
      righe: conIntestazione ? pari.slice(1) : pari,
      vuote,
      colonne,
    });
  }
  return out;
}

/**
 * Applica il testo su misura del cliente a un blocco.
 *
 * L'override sostituisce **solo il testo**: una tabella personalizzata resta una tabella e
 * non perde la struttura. Nei prototipi l'override per le tabelle non è previsto, ed è
 * coerente — una tabella si modifica cella per cella, non riscrivendola come prosa.
 */
export function conOverride(b: Blocco, testo: string | undefined): Blocco {
  if (testo === undefined || b.tipo === "t" || b.tipo === "sig") return b;
  return { ...b, contenuto: { t: testo } };
}

/** I blocchi di un documento, in ordine, col testo su misura già applicato. */
export function componi(
  blocchi: readonly Blocco[],
  override: Readonly<Record<string, string>>,
): Blocco[] {
  return blocchi.map((b) => conOverride(b, override[b.blockId]));
}
