// Allinea `durata_obiettivo_s` a quello che lo script dice DAVVERO, e conserva il
// bersaglio chiesto in `durata_richiesta_s`.
//
// ⚠️ I bersagli per sezione del primo documento erano calcolati sulla costante 1,90, che
// la misura ha poi corretto a 2,27. Inseguirli adesso significherebbe scrivere per un
// numero sbagliato. Meglio dichiarare la durata vera di ogni sezione e riequilibrare la
// somma del corso quando le sezioni ci sono tutte: la somma e' un vincolo, il singolo
// bersaglio pre-taratura no.

import { readFileSync, writeFileSync } from "node:fs";

const COSTANTE = 2.27;
const FILE = ["_comuni/script.json", "energetico/script.json", "fornitore/script.json"];

for (const p of FILE) {
  const d = JSON.parse(readFileSync(p, "utf8"));
  for (const s of d.sezioni) {
    const stimata = Math.round(s.parole / COSTANTE);
    if (s.durata_obiettivo_s !== stimata) {
      s.durata_richiesta_s ??= s.durata_obiettivo_s;
      s.durata_obiettivo_s = stimata;
    }
    const scarto = Math.round(((s.durata_obiettivo_s - s.durata_richiesta_s) / s.durata_richiesta_s) * 100);
    console.log(
      `${d.corso}/${s.id}`.padEnd(34) +
        `${String(s.parole).padStart(4)} parole  ${String(s.durata_obiettivo_s).padStart(3)} s ` +
        `(chiesti ${s.durata_richiesta_s}, ${scarto >= 0 ? "+" : ""}${scarto}%)`,
    );
  }
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
