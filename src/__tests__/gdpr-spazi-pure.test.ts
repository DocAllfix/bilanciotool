import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Lo spazio dopo un'espressione JSX, nelle viste e nei documenti della protezione dei dati.
//
// ⚠️ Trovato sulla pagina vera: «2 non pertinenti, 45da valutare». Nel sorgente lo spazio
// c'era — `{k.daValutare} da valutare.` — ed era l'ultimo pezzo di testo prima di un a-capo.
// La prima correzione ha messo `{" "}` PRIMA dell'espressione e la pagina è rimasta rotta:
// lo spazio perso era quello DOPO. Lo ha detto la misura sul testo reso
// (`scripts/foto-gdpr.mjs`), non il sorgente.
//
// La causa a monte, come per `documenti-spazi-pure`, non si è cercata oltre: delle otto
// occorrenze di quella forma una sola si rompeva a schermo. `{" "}` dà uno spazio su ogni
// strada, quindi la regola è scriverlo esplicito su TUTTA la forma, non solo dove oggi cede.
//
// Limitata ai file nuovi di questo percorso: estenderla al resto del prodotto è un lavoro a
// sé, e va fatto misurando le pagine, non correggendo alla cieca.

// Estesa al sistema di gestione sociale (PAS 24000), costruito sullo stesso stampo, e al file
// dei pezzi comuni che i due percorsi condividono.
const FILE = [
  ...readdirSync("src/components/gdpr").map((f) => join("src/components/gdpr", f)),
  ...readdirSync("src/components/pas").map((f) => join("src/components/pas", f)),
  "src/components/comune/percorso.tsx",
  "src/components/documento/documento-gdpr.tsx",
  "src/components/documento/documento-pas.tsx",
].filter((f) => f.endsWith(".tsx"));

/** `}` seguita da spazio e testo fino a fine riga, senza altre espressioni né tag. */
const FRAGILE = /\}( +)([^{}<>=`"';]*[A-Za-zÀ-ù0-9.,:;)»%][^{}<>=`"']*)$/;
const CODICE = /^\s*(\/\/|\*|import|export|const|let|return|if|for|type|await)/;

export function fragili(testo: string): number[] {
  const righe = testo.split("\n");
  const out: number[] = [];
  righe.forEach((r, i) => {
    if (CODICE.test(r) || !FRAGILE.test(r)) return;
    const dopo = (righe[i + 1] ?? "").trim();
    if (dopo === "" || /^[<{)]/.test(dopo)) out.push(i + 1);
  });
  return out;
}

describe("lo spazio dopo un'espressione non è lasciato al caso", () => {
  it("la scansione guarda davvero i file del percorso", () => {
    expect(FILE.length).toBeGreaterThan(8);
  });

  it("riconosce la forma malata, e non quella sana", () => {
    // Senza questa prova un'espressione regolare sbagliata resterebbe verde per sempre.
    expect(fragili("<p>\n  {n} da valutare.\n</p>")).toEqual([2]);
    expect(fragili('<p>\n  {n}{" "}da valutare.\n</p>')).toEqual([]);
  });

  it("nessun file lascia lo spazio implicito in fondo a una riga di testo", () => {
    const colpevoli = FILE.flatMap((f) => fragili(readFileSync(f, "utf8")).map((r) => `${f}:${r}`));
    expect(colpevoli, 'Usa `}{" "}testo`: lo spazio letterale può sparire nella pagina vera.').toEqual([]);
  });
});
