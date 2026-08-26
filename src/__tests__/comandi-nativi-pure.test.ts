import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// DUE REGOLE SULL'INTERFACCIA CHE NESSUN COLLAUDO FUNZIONALE PUO' VEDERE.
//
// Entrambe nascono dal giro con i DevTools sui comandi dell'inventario GHG — il primo
// modulo del prodotto, rimasto senza un collaudo per comando fino al 26 agosto 2026. La
// pagina si apriva, i comandi rispondevano, tutti i controlli erano verdi.

const COMPONENTI = join(process.cwd(), "src", "components");

function tsx(dir: string): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) out.push(...tsx(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Il sorgente senza commenti: un divieto non deve inciampare in chi lo spiega. */
function senzaCommenti(testo: string): string {
  return testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FILE = tsx(COMPONENTI);

describe("i dialoghi del browser non appartengono al prodotto", () => {
  // ⚠️ `confirm()` e `alert()` sono finestre del BROWSER, non del prodotto: non portano
  // il marchio, non si possono descrivere, e alcuni browser le SOPPRIMONO — un errore
  // riferito con `alert()` puo' non arrivare mai a chi lo deve leggere.
  //
  // Il 13 agosto 2026 erano stati tolti da un gesto solo, quello dell'archiviazione, e
  // messi per iscritto come chiusi. Ne restavano quattro: tre `confirm()` (elimina voce
  // GHG, elimina obiettivo GHG, elimina media nel racconto del Bilancio) e un `alert()`
  // sul fallimento della generazione del PDF. Il prodotto ha un dialogo suo, ed e' quello
  // che i gesti distruttivi devono usare.
  it("nessun componente chiama confirm() o alert() nativi", () => {
    const colpevoli: string[] = [];
    for (const f of FILE) {
      const testo = senzaCommenti(readFileSync(f, "utf8"));
      // `\b` esclude `window.confirmAction` e simili; `AlertDialog` non contiene `alert(`.
      for (const m of testo.matchAll(/(?<![.\w])(confirm|alert)\s*\(/g)) {
        colpevoli.push(`${relative(process.cwd(), f)} → ${m[1]}()`);
      }
    }
    expect(colpevoli).toEqual([]);
  });
});

describe("ogni scelta ha un nome accessibile", () => {
  // ⚠️ Un `<Label>Categoria</Label>` messo SOPRA un `<Select>` e' un'etichetta visibile e
  // nient'altro: non c'e' `htmlFor`, il trigger e' un `<button>` generato dalla libreria,
  // e per chi usa un lettore di schermo quel campo non ha nome. Si annuncia come «pulsante,
  // gas naturale» — il valore, non la domanda.
  //
  // Erano NOVE, tutte nei due moduli piu' vecchi (GHG e Bilancio): gli unici due che
  // nessuno avesse mai percorso comando per comando. Il difetto non lo vede il
  // compilatore (il JSX e' valido), non lo vede Tailwind, non lo vedono i collaudi
  // funzionali (la pagina si apre e i comandi rispondono). Si vede solo CHIEDENDO il nome.
  //
  // La regola verificabile: un `SelectTrigger` porta un `aria-label`, oppure un `id` — e
  // l'`id` implica una `<Label htmlFor>` che il resto del progetto scrive gia' cosi'.
  it("nessun SelectTrigger senza aria-label ne' id", () => {
    const anonimi: string[] = [];
    for (const f of FILE) {
      const testo = senzaCommenti(readFileSync(f, "utf8"));
      // L'apertura del tag fino al primo `>` che non stia dentro una graffa.
      for (const m of testo.matchAll(/<SelectTrigger([^>]*)>/g)) {
        const attributi = m[1] ?? "";
        if (/\baria-label\b/.test(attributi)) continue;
        if (/\bid=/.test(attributi)) continue;
        anonimi.push(relative(process.cwd(), f));
      }
    }
    expect(anonimi).toEqual([]);
  });
});
