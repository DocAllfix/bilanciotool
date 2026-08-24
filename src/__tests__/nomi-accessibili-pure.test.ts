import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// I nomi accessibili delle griglie di valutazione devono essere UNIVOCI.
//
// ⚠️ Nasce da un difetto vero, trovato dal collaudo di ISO 37001 e non dal compilatore:
// il pulsante di stato di un requisito si annunciava col RIFERIMENTO alla norma
// («4.5: Conforme»), e sei requisiti diversi citano tutti il punto 4.5. Sei pulsanti con
// lo stesso nome sono indistinguibili per chi usa un lettore di schermo, e ambigui per
// qualunque collaudo — Playwright si è fermato con «resolved to 2 elements».
//
// ⚠️ La regola verificabile non è «i nomi sono unici a schermo»: quello si vede solo
// rendendo la pagina con dati veri. È: **un nome accessibile composto si costruisce sulla
// chiave, non sul riferimento normativo**. Le chiavi sono uniche per costruzione (un
// vincolo di unicità nel catalogo), i riferimenti no e non devono esserlo — due requisiti
// possono legittimamente discendere dallo stesso articolo.

const COMPONENTI = join(process.cwd(), "src", "components");

/** I campi che NON possono identificare un elemento in un nome accessibile composto. */
const AMBIGUI = ["riferimento", "articolo"];

function tsx(dir: string): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) out.push(...tsx(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** I nomi accessibili composti di un file, cioè gli `aria-label` con interpolazioni. */
function etichetteComposte(testo: string): string[] {
  return [...testo.matchAll(/aria-label=\{`([^`]*)`\}/g)].map((m) => m[1]!);
}

/** L'etichetta usa `campo` come parte interpolata? */
function usaCampo(etichetta: string, campo: string): boolean {
  return new RegExp(String.raw`\$\{[^}]*\b${campo}\b[^}]*\}`).test(etichetta);
}

describe("i nomi accessibili non si costruiscono su campi che si ripetono", () => {
  it("nessun aria-label composto usa un riferimento normativo come identificativo", () => {
    const problemi: string[] = [];
    for (const file of tsx(COMPONENTI)) {
      for (const etichetta of etichetteComposte(readFileSync(file, "utf8"))) {
        for (const campo of AMBIGUI) {
          if (usaCampo(etichetta, campo)) {
            problemi.push(`${relative(process.cwd(), file).replace(/\\/g, "/")}: «${etichetta}»`);
          }
        }
      }
    }

    expect(
      [...new Set(problemi)],
      "Un nome accessibile composto va costruito sulla CHIAVE, che è unica per " +
        "costruzione, e non sul riferimento normativo, che si ripete: due requisiti " +
        "possono discendere dallo stesso articolo, e due pulsanti con lo stesso nome " +
        "sono indistinguibili per chi usa un lettore di schermo.\n\n",
    ).toEqual([]);
  });

  it("il controllo pesca davvero le etichette composte", () => {
    // Senza questa prova, un errore nell'espressione regolare renderebbe il controllo
    // sempre verde: non troverebbe niente, e sembrerebbe che vada tutto bene.
    const trovate = tsx(COMPONENTI).flatMap((f) => etichetteComposte(readFileSync(f, "utf8")));
    expect(trovate.length).toBeGreaterThan(15);
  });

  it("il controllo sa diventare rosso", () => {
    expect(usaCampo("${r.riferimento}: ${s}", "riferimento")).toBe(true);
    expect(usaCampo("${r.key}: ${s}", "riferimento")).toBe(false);
  });
});
