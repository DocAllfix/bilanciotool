/**
 * Le slide DISTILLATE: il contenuto a schermo scritto per paragrafo del copione.
 *
 * ⚠️ Il contratto con la sessione che scrive i copioni (14 settembre 2026): un file per
 * corso, `audio-formazione/<corso>/slide.json`, e uno solo per le sezioni comuni in
 * `audio-formazione/_comuni/slide.json`. Ogni voce è `{ sezione, p, inizia, layout, …campi }`
 * con i campi dei dodici layout di Evalis Academy.
 *
 * ⚠️ `p` è il paragrafo da cui la slide PARTE, non «una slide per paragrafo»: la slide dura
 * fino al `p` della voce successiva della stessa sezione. Il paragrafo è l'unità in cui la
 * voce ha le marche temporali, quindi lo stacco cade sulla frase giusta invece che «un
 * paragrafo prima o dopo», che era il margine dichiarato del criterio proporzionale.
 *
 * ⚠️ E `inizia` esiste contro l'accoppiamento per POSIZIONE. `p` indica un elemento in un
 * elenco senza identificatori: un paragrafo inserito a metà copione farebbe partire ogni
 * slide successiva sulla frase sbagliata, e niente protesterebbe. Le prime parole del
 * paragrafo sono l'ancora che fa protestare.
 *
 * Qui non c'è né React né il file system: la validazione è pura, e la chiamano sia il test
 * sia lo script che raccoglie i file.
 */

export const LAYOUT_SLIDE = [
  "apertura",
  "chiusura",
  "punti",
  "cards",
  "definizione",
  "flusso",
  "confronto",
  "evidenza",
  "numeri",
  "split",
  "timeline",
  "tabella",
] as const;

export type LayoutSlide = (typeof LAYOUT_SLIDE)[number];

export type VoceSlide = {
  /** L'id della sezione del corso, lo stesso che finisce nell'indirizzo. */
  sezione: string;
  /** Il paragrafo del copione da cui la slide parte, da 0. */
  p: number;
  /** Le prime parole di quel paragrafo, copiate dal copione. */
  inizia: string;
  layout: LayoutSlide;
  [campo: string]: unknown;
};

export type ContestoValidazione = {
  corso: string;
  /** `<corso>/<sezione>` → il copione intero, coi paragrafi separati da una riga vuota. */
  copioni: Record<string, string>;
  /** I numeri del catalogo, quelli che nessuno deve scrivere a mano. */
  numeri: Record<string, number>;
};

/**
 * Header e footer li costruisce il RENDERER dal registro: sigla del corso, riferimento
 * normativo, marchio. Scritti nel file, divergerebbero dal registro al primo cambio di nome
 * — e un footer sbagliato su trecento slide non lo rilegge nessuno.
 */
const CAMPI_VIETATI = ["kicker", "ref", "footer", "label", "corsoLabel"] as const;

/**
 * I campi che ogni layout pretende, e quanti elementi può portare al massimo un elenco.
 *
 * ⚠️ I tetti non sono estetica: sono ciò che tiene la slide dentro la tela. Una slide
 * tagliata non produce nessun errore — il contenuto semplicemente non si vede — quindi il
 * primo posto per fermarla è qui, prima del browser. Il controllo sui tagli nel browser
 * resta, perché un testo lungo sfora anche sotto il tetto.
 */
const REGOLE: Record<LayoutSlide, { obbligatori: string[]; tetti?: Record<string, number> }> = {
  apertura: { obbligatori: ["titolo"] },
  chiusura: { obbligatori: ["titolo", "punti"], tetti: { punti: 8 } },
  punti: { obbligatori: ["titolo", "punti"], tetti: { punti: 8 } },
  cards: { obbligatori: ["titolo", "cards"], tetti: { cards: 6 } },
  definizione: { obbligatori: ["titolo", "definizione"], tetti: { punti: 4 } },
  flusso: { obbligatori: ["titolo", "passi"], tetti: { passi: 5 } },
  confronto: { obbligatori: ["titolo", "a", "b"] },
  evidenza: { obbligatori: ["titolo"] },
  numeri: { obbligatori: ["titolo", "numeri"], tetti: { numeri: 4 } },
  split: { obbligatori: ["titolo", "punti"], tetti: { punti: 8 } },
  timeline: { obbligatori: ["titolo", "tappe"], tetti: { tappe: 6 } },
  tabella: { obbligatori: ["titolo", "cols", "righe"], tetti: { cols: 4, righe: 6 } },
};

// ── I numeri scritti a mano ────────────────────────────────────────────────────────────
//
// ⚠️ La stessa regola di `formazione-numeri-pure.test.ts`, applicata alle slide: un
// conteggio del catalogo («124 requisiti») si scrive come `{chiave}` di `NUMERI`. Tre
// famiglie restano scritte a mano PER REGOLA, perché non sono mai conteggi: i riferimenti
// normativi (art. 12), le grandezze (12 mesi, 10 milioni) e le date (12 marzo). Più il
// segno di percento e i numeri incollati a trattini, barre o altre cifre.

const MESI = "(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)";
const RIFERIMENTI = "(art\\.|articolo|artt\\.|comma|commi|allegato|Allegato|direttiva|Direttiva|punto)";
const GRANDEZZE = "(mila|milioni|miliardi|euro|ore|giorni|mesi|anni|addetti|dipendenti)";
const SEGNAPOSTO = /\{([A-Za-z0-9]+)\}/g;

function comeConteggio(valore: number): RegExp {
  return new RegExp(
    "(?<![\\d\\-/])(?<![\\d][.,])(?<!" + RIFERIMENTI + " )" + valore +
      "(?![\\d\\-/%])(?![.,]\\d)(?! " + MESI + ")(?! " + GRANDEZZE + ")",
    "u",
  );
}

/** Tutte le stringhe dentro un valore, anche annidate negli elenchi e negli oggetti. */
function stringheIn(v: unknown, fuori: string[] = []): string[] {
  if (typeof v === "string") fuori.push(v);
  else if (Array.isArray(v)) for (const x of v) stringheIn(x, fuori);
  else if (v && typeof v === "object") for (const x of Object.values(v)) stringheIn(x, fuori);
  return fuori;
}

/** Il testo confrontabile: minuscolo, spazi ridotti. Le parole restano quelle. */
const normalizza = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Tutti gli errori di un file di slide. Vuoto = il file è accettabile.
 *
 * ⚠️ Restituisce l'ELENCO e non si ferma al primo: chi distilla trecento voci deve poterle
 * correggere in un giro, non in trecento.
 */
export function validaSlide(voci: VoceSlide[], ctx: ContestoValidazione): string[] {
  const errori: string[] = [];
  const derivabili = new Map<number, string[]>();
  for (const [nome, v] of Object.entries(ctx.numeri)) {
    if (v >= 8) derivabili.set(v, [...(derivabili.get(v) ?? []), nome]);
  }

  const ultimoP = new Map<string, number>();

  voci.forEach((voce, i) => {
    const dove = `voce ${i + 1} (${voce.sezione}, p ${voce.p})`;

    // ── La sezione e il paragrafo ──────────────────────────────────────────────────
    const copione = ctx.copioni[`${ctx.corso}/${voce.sezione}`];
    if (copione === undefined) {
      errori.push(`${dove}: nessun copione per ${ctx.corso}/${voce.sezione}`);
    } else {
      const paragrafi = copione.split("\n\n");
      const prima = ultimoP.get(voce.sezione);
      if (prima === undefined && voce.p !== 0) {
        errori.push(`${dove}: la prima voce di una sezione deve cominciare dal paragrafo 0`);
      }
      if (prima !== undefined && voce.p <= prima) {
        errori.push(`${dove}: i p di una sezione devono crescere (${prima} poi ${voce.p})`);
      }
      if (!Number.isInteger(voce.p) || voce.p < 0 || voce.p >= paragrafi.length) {
        errori.push(`${dove}: p ${voce.p} fuori dai ${paragrafi.length} paragrafi del copione`);
      } else if (!normalizza(paragrafi[voce.p]).startsWith(normalizza(String(voce.inizia ?? "")))
        || !normalizza(String(voce.inizia ?? ""))) {
        errori.push(
          `${dove}: «inizia» non corrisponde all'inizio del paragrafo ${voce.p} — il copione dice «${paragrafi[voce.p].slice(0, 50)}…»`,
        );
      }
      ultimoP.set(voce.sezione, Math.max(prima ?? -1, voce.p));
    }

    // ── Il layout e i suoi campi ───────────────────────────────────────────────────
    const regola = REGOLE[voce.layout as LayoutSlide];
    if (!regola) {
      errori.push(`${dove}: layout «${String(voce.layout)}» sconosciuto`);
    } else {
      for (const campo of regola.obbligatori) {
        const v = voce[campo];
        if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
          errori.push(`${dove}: il layout ${voce.layout} pretende «${campo}»`);
        }
      }
      for (const [campo, max] of Object.entries(regola.tetti ?? {})) {
        const v = voce[campo];
        if (Array.isArray(v) && v.length > max) {
          errori.push(`${dove}: «${campo}» ha ${v.length} elementi, al massimo ${max}`);
        }
      }
      if (voce.layout === "tabella" && Array.isArray(voce.righe)) {
        const larghe = (voce.righe as unknown[]).filter((r) => Array.isArray(r) && r.length > 4);
        if (larghe.length) errori.push(`${dove}: una riga della tabella ha più di 4 colonne`);
      }
    }
    for (const campo of CAMPI_VIETATI) {
      if (campo in voce) errori.push(`${dove}: «${campo}» non va scritto nel file, lo costruisce il renderer`);
    }

    // ── I numeri ───────────────────────────────────────────────────────────────────
    const testi = Object.entries(voce)
      .filter(([k]) => k !== "sezione" && k !== "p" && k !== "inizia" && k !== "layout")
      .flatMap(([, v]) => stringheIn(v));
    for (const testo of testi) {
      for (const m of testo.matchAll(SEGNAPOSTO)) {
        if (!(m[1] in ctx.numeri)) errori.push(`${dove}: segnaposto «{${m[1]}}» inesistente in NUMERI`);
      }
      const nudo = testo.replace(SEGNAPOSTO, " ");
      for (const [valore, nomi] of derivabili) {
        if (comeConteggio(valore).test(nudo)) {
          errori.push(`${dove}: «${valore}» scritto a mano — usa ${nomi.map((n) => `{${n}}`).join(" oppure ")}`);
        }
      }
    }
  });

  return errori;
}

/**
 * I segnaposto al loro valore.
 *
 * ⚠️ Un segnaposto sconosciuto SOLLEVA, non passa com'è: a schermo comparirebbe
 * «{requisiti} requisiti», e nessun controllo funzionale lo vedrebbe — la pagina si apre.
 */
export function sostituisciNumeri(testo: string, numeri: Record<string, number>): string {
  return testo.replace(SEGNAPOSTO, (_, nome: string) => {
    if (!(nome in numeri)) throw new Error(`Segnaposto «{${nome}}» inesistente in NUMERI`);
    return String(numeri[nome]);
  });
}

/**
 * Il secondo in cui compare ciascuna slide, dal paragrafo da cui parte.
 *
 * ⚠️ ESATTO, e non proporzionale: la marca del paragrafo è l'istante misurato dentro
 * l'audio in cui quella frase comincia. Senza marche non si inventano momenti.
 */
export function momentiDistillati(ps: number[], marche: { p: number; s: number }[]): number[] | null {
  if (marche.length === 0) return null;
  return ps.map((p) => marche.find((m) => m.p === p)?.s ?? marche[Math.min(p, marche.length - 1)].s);
}
