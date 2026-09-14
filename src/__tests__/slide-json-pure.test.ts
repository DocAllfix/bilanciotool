import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { NUMERI } from "@/features/formazione/numeri";
import { validaSlide, type VoceSlide } from "@/features/formazione/slide-distillate";
import mappa from "../../audio-formazione/slide-map.json";

// I FILE DI SLIDE VERI, contro i copioni veri.
//
// ⚠️ Il test del modulo prova le regole su dati inventati; questo le applica a ciò che
// l'altra sessione consegna. È il cancello: un `slide.json` che non passa qui non arriva
// sullo schermo di nessuno, e chi l'ha scritto riceve l'elenco completo degli errori.
//
// ⚠️ E il manifesto deve essere quello RACCOLTO dai file, non uno vecchio: se qualcuno
// aggiunge un `slide.json` e dimentica `node scripts/raccogli-slide.mjs`, il renderer
// continua a mostrare le slide di prima e nessun test lo dice. Qui lo dice.

const RADICE = join(process.cwd(), "audio-formazione");
const MAPPA = mappa as Record<string, VoceSlide[]>;

/** I copioni, con la stessa chiave del manifesto: `<corso>/<sezione>`. */
function copioni(): Record<string, string> {
  const fuori: Record<string, string> = {};
  for (const d of readdirSync(RADICE, { withFileTypes: true })) {
    const f = join(RADICE, d.name, "script.json");
    if (!d.isDirectory() || !existsSync(f)) continue;
    const corso = d.name === "_comuni" ? "comuni" : d.name;
    for (const s of JSON.parse(readFileSync(f, "utf8")).sezioni) fuori[`${corso}/${s.id}`] = s.script;
  }
  return fuori;
}

describe("i file slide.json consegnati", () => {
  it("⚠️ il manifesto coincide con i file: nessuno ha dimenticato di raccoglierli", () => {
    const daiFile: Record<string, number> = {};
    for (const d of readdirSync(RADICE, { withFileTypes: true })) {
      const f = join(RADICE, d.name, "slide.json");
      if (!d.isDirectory() || !existsSync(f)) continue;
      const corso = d.name === "_comuni" ? "comuni" : d.name;
      for (const v of JSON.parse(readFileSync(f, "utf8"))) {
        const k = `${corso}/${v.sezione}`;
        daiFile[k] = (daiFile[k] ?? 0) + 1;
      }
    }
    const nelManifesto = Object.fromEntries(Object.entries(MAPPA).map(([k, v]) => [k, v.length]));
    expect(nelManifesto, "lancia `node scripts/raccogli-slide.mjs`").toEqual(daiFile);
  });

  it("ogni voce rispetta il contratto: paragrafi, ancore, layout, tetti e numeri", () => {
    const tutti = copioni();
    const errori: string[] = [];
    // Si valida per CORSO, perché è il corso a dare la chiave del copione.
    const perCorso = new Map<string, VoceSlide[]>();
    for (const [chiave, voci] of Object.entries(MAPPA)) {
      const corso = chiave.split("/")[0];
      perCorso.set(corso, [...(perCorso.get(corso) ?? []), ...voci]);
    }
    for (const [corso, voci] of perCorso) {
      errori.push(...validaSlide(voci, { corso, copioni: tutti, numeri: NUMERI as Record<string, number> }).map((e) => `${corso}: ${e}`));
    }
    expect(errori).toEqual([]);
  });
});
