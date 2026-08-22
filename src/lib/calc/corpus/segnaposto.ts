// La sostituzione dei segnaposto del corpus, e il contatore che dice quanto manca.
//
// Funzioni PURE: girano identiche sul server e nel browser, così l'anteprima che il
// consulente vede mentre compila non può divergere dal documento che pubblica.
//
// ── PERCHÉ IL CONTATORE È LA PARTE DELICATA ──────────────────────────────────
//
// Nei prototipi il contatore «N segnaposto aperti» conta tutto ciò che resta fra parentesi
// quadre dopo la sostituzione. Sembra ragionevole, e su SA8000/2026 lo tiene a 415 per
// sempre: quel modulo usa le parentesi anche per le caselle da riempire a mano
// (`[GG/MM/AAAA]` ×108, `[N.]`, `[Completo / Intermedio / Straordinario]`), che non sono
// dati che il sistema conosce e non lo saranno mai.
//
// Un contatore che non può mai arrivare a zero smette di essere letto. Qui conta soltanto
// i TOKEN senza valore, cioè le informazioni che l'anagrafica potrebbe dare e non dà: è
// una cosa su cui il consulente può agire. Le caselle si contano a parte, perché dicono
// un'altra cosa — quanto lavoro a mano resta su quel modulo.

export type Genere = "token" | "campo";
export type Fonte = "studio" | "azienda" | "data" | "revisione" | "manuale";

export type Segnaposto = {
  forma: string;
  genere: Genere;
  fonte: Fonte | null;
  campo: string | null;
};

/** I dati da cui i token pescano. */
export type Contesto = {
  /** Il nome dello studio: è lui che redige, e compare nella casella «Redatto da». */
  studio: string | null;
  /** L'anagrafica dell'azienda cliente, campo per campo. */
  azienda: Record<string, string | null | undefined>;
  revisione: string | null;
  /** Data di adozione, già formattata: la formattazione è una scelta di resa. */
  data: string | null;
  /** Valori scritti a mano dal consulente per i token di fonte `manuale`. */
  manuali?: Record<string, string | null | undefined>;
};

/** Il valore di un token, oppure `null` se il dato non c'è. */
export function valore(s: Segnaposto, ctx: Contesto): string | null {
  if (s.genere !== "token") return null;
  const pulito = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
  };
  switch (s.fonte) {
    case "studio":
      return pulito(ctx.studio);
    case "azienda":
      return s.campo ? pulito(ctx.azienda[s.campo]) : null;
    case "revisione":
      return pulito(ctx.revisione);
    case "data":
      return pulito(ctx.data);
    case "manuale":
      return s.campo ? pulito(ctx.manuali?.[s.campo]) : null;
    default:
      return null;
  }
}

/** Le parentesi quadre sono caratteri speciali in un'espressione regolare. */
const perRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Sostituisce i token che hanno un valore. Tutto il resto resta com'è.
 *
 * Un token senza valore **non si cancella**: resta visibile fra parentesi, perché un buco
 * dichiarato è meglio di una frase monca. Nel documento verrà evidenziato.
 */
export function sostituisci(testo: string, segnaposti: readonly Segnaposto[], ctx: Contesto): string {
  let out = testo;
  for (const s of segnaposti) {
    const v = valore(s, ctx);
    if (v === null) continue;
    out = out.replace(new RegExp(perRegex(s.forma), "g"), v);
  }
  return out;
}

export type Conteggio = {
  /** Token presenti nel testo per cui l'anagrafica non ha un valore. È il numero che
   *  conta: sono informazioni che il consulente può andare a inserire. */
  aperti: number;
  /** Le forme distinte di quei token, per poter dire QUALI mancano invece che quanti. */
  forme: string[];
  /** Caselle da riempire a mano. Non sono un problema da risolvere: sono il modulo. */
  caselle: number;
};

/** Conta cosa manca in un testo già noto al sistema. */
export function conta(
  testo: string,
  segnaposti: readonly Segnaposto[],
  ctx: Contesto,
): Conteggio {
  let aperti = 0;
  let caselle = 0;
  const forme = new Set<string>();
  for (const s of segnaposti) {
    const occorrenze = testo.split(s.forma).length - 1;
    if (occorrenze === 0) continue;
    if (s.genere === "campo") {
      caselle += occorrenze;
      continue;
    }
    if (valore(s, ctx) === null) {
      aperti += occorrenze;
      forme.add(s.forma);
    }
  }
  return { aperti, forme: [...forme].sort(), caselle };
}

/** Somma i conteggi di più testi — i blocchi di un documento, i documenti di un modulo. */
export function contaTutti(
  testi: readonly string[],
  segnaposti: readonly Segnaposto[],
  ctx: Contesto,
): Conteggio {
  const forme = new Set<string>();
  let aperti = 0;
  let caselle = 0;
  for (const t of testi) {
    const c = conta(t, segnaposti, ctx);
    aperti += c.aperti;
    caselle += c.caselle;
    for (const f of c.forme) forme.add(f);
  }
  return { aperti, forme: [...forme].sort(), caselle };
}

/** Il testo di un blocco, qualunque sia la sua forma: serve a contare e a cercare. */
export function testoDelBlocco(contenuto: unknown): string {
  if (contenuto === null || typeof contenuto !== "object") return "";
  const c = contenuto as { t?: unknown; r?: unknown };
  if (typeof c.t === "string") return c.t;
  if (Array.isArray(c.r)) {
    return c.r
      .map((riga) => (Array.isArray(riga) ? riga.filter((x) => typeof x === "string").join(" ") : ""))
      .join("\n");
  }
  return "";
}
