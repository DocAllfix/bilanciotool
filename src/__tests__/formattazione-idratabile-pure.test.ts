import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// NIENTE `toLocale*` DENTRO UN COMPONENTE CLIENT.
//
// ⚠️ Nasce da un difetto trovato sul deploy di ANTEPRIMA, il 26 agosto 2026, e da nessuna
// altra parte: `Minified React error #418` sul pannello della condivisione, cioe' il testo
// reso dal server non coincideva con quello reso dal browser.
//
// La causa era una data formattata con `toLocaleDateString("it-IT", …)`. Quelle funzioni
// dipendono dai dati ICU del RUNTIME, e server e browser ne hanno due diversi: lo stesso
// istante puo' uscire «27 agosto 2026» da una parte e in un'altra forma dall'altra. React
// se ne accorge, butta via l'HTML del server e ridisegna.
//
// ⚠️ Questo progetto lo aveva GIA' scritto, il giorno prima, a proposito del denaro:
// «`toLocaleString` non si usa per il denaro… server e browser hanno due ICU diversi, e lo
// stesso importo si stamperebbe in due modi nella stessa pagina». Era una previsione, ed
// e' arrivata su una data. Questa guardia esiste perche' non arrivi una terza volta.
//
// ⚠️ In locale non si vede MAI: e' lo stesso Node, la stessa ICU, la stessa macchina. Solo
// un deploy vero separa i due runtime.
//
// I componenti SERVER non sono in questo elenco: rendono una volta sola, non si idratano,
// e non c'e' un secondo risultato con cui divergere.

const RADICI = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];

function tsx(dir: string): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) out.push(...tsx(p));
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** Il sorgente senza commenti: un divieto non deve inciampare in chi lo spiega. */
function senzaCommenti(testo: string): string {
  return testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FILE = RADICI.flatMap(tsx);
const CLIENT = FILE.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));

describe("la formattazione dei componenti client non dipende dal runtime", () => {
  it("nessun toLocale* in un componente client", () => {
    // ⚠️ Il conteggio dei client va verificato: se un giorno il rilevamento smettesse di
    // funzionare, questo controllo passerebbe guardando zero file.
    expect(CLIENT.length).toBeGreaterThan(20);

    const colpevoli: string[] = [];
    for (const f of CLIENT) {
      const testo = senzaCommenti(readFileSync(f, "utf8"));
      for (const m of testo.matchAll(/\.toLocale(String|DateString|TimeString)\s*\(/g)) {
        colpevoli.push(`${relative(process.cwd(), f)} → toLocale${m[1]}()`);
      }
    }
    expect(colpevoli).toEqual([]);
  });
});
