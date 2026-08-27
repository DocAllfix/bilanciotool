import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// OGNI COLLAUDO LEGGE IL BERSAGLIO DALL'AMBIENTE.
//
// ⚠️ Nasce dal difetto più costoso della giornata del 26 agosto 2026, e non era nel
// prodotto: era nei collaudi.
//
// Nove collaudi su cinquantotto avevano `const BASE = "http://localhost:3000"` scritto a
// mano, e ignoravano `process.env.BASE`. Conseguenza:
//
//   npm run qa -- soa-percorso --su https://<anteprima>
//   → visual-check-soa-percorso.mjs  (https://<anteprima>)   ← e parlava con localhost
//
// Il lanciatore DICHIARAVA un bersaglio e il collaudo ne misurava un altro. È peggio di
// non dichiararlo affatto: a un'etichetta sbagliata ci si crede. Tre collaudi «falliti sul
// pulsante PDF dell'anteprima» non avevano mai toccato l'anteprima, e i loro «33 su 34»
// non dicevano niente sul deploy — mentre io li riportavo come se lo dicessero.
//
// Mezza giornata di diagnosi su un difetto che non esisteva dove lo cercavo.
//
// La regola era già scritta in CLAUDE.md dal 15 agosto — «un collaudo dichiara sempre
// contro cosa sta parlando» — e riguardava il lanciatore. Questa la chiude dall'altro
// capo: non basta che il lanciatore lo dica, deve essere il collaudo ad ascoltarlo.

const SCRIPTS = join(process.cwd(), "scripts");

/** I file che sono collaudi: quelli che il lanciatore elenca. */
const COLLAUDI = readdirSync(SCRIPTS).filter((f) => /^(verifica|visual-check).*\.mjs$/.test(f));

describe("i collaudi parlano col bersaglio che gli si dice", () => {
  it("nessun collaudo fissa l'indirizzo a mano", () => {
    // ⚠️ Se un giorno la cartella cambiasse nome, questo controllo passerebbe guardando
    // zero file: il conteggio è parte dell'asserzione.
    expect(COLLAUDI.length).toBeGreaterThan(40);

    const sordi: string[] = [];
    for (const f of COLLAUDI) {
      const testo = readFileSync(join(SCRIPTS, f), "utf8");
      // Una dichiarazione di BASE che non nomina `process.env.BASE` è un bersaglio fisso.
      for (const m of testo.matchAll(/^\s*const\s+BASE\s*=\s*(.+)$/gm)) {
        const espressione = m[1] ?? "";
        if (!espressione.includes("process.env.BASE")) sordi.push(`${f} → const BASE = ${espressione.trim()}`);
      }
    }
    expect(sordi).toEqual([]);
  });

  it("ogni collaudo dichiara un BASE: nessuno lo indovina strada facendo", () => {
    // Un collaudo senza `BASE` costruisce gli indirizzi a pezzi, e allora il bersaglio non
    // è ispezionabile: la regola sopra non può proteggerlo.
    const senzaBase = COLLAUDI.filter((f) => {
      const t = readFileSync(join(SCRIPTS, f), "utf8");
      return !/\bBASE\b/.test(t);
    });
    expect(senzaBase).toEqual([]);
  });
});
