import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Ogni classe `*-area-<gruppo>` deve corrispondere a un token che esiste davvero.
//
// ⚠️ Nato da un difetto vero, trovato riorganizzando i moduli in tre gruppi. Il
// registro `features/companies/moduli.ts` deriva le classi dal gruppo, ed e' scritto
// apposta perche' due moduli della stessa materia non divergano. Ma **quindici
// componenti scrivevano la classe a mano** — `bg-area-filiera`, `bg-area-responsabilita`,
// `bg-area-sostenibilita` — e quei nomi di gruppo hanno smesso di esistere.
//
// Il difetto che ne segue e' della classe peggiore che questo progetto conosca:
//   - il compilatore non lo vede, perche' una stringa e' una stringa valida;
//   - Tailwind non protesta, perche' genera le utility scandendo il TESTO e per un
//     token inesistente semplicemente non genera niente;
//   - i collaudi funzionali non lo vedono, perche' la pagina si apre e i comandi
//     rispondono.
// Resta solo un riquadro senza fondo, e lo vede il cliente.
//
// E' gia' successo una volta, con le classi costruite da un template literal: delle
// cinque aree solo una aveva il colore, e ce l'aveva **per caso**, perche' quella
// classe compariva scritta per esteso in un esempio dentro `DESIGN.md`.
//
// Questa guardia e' strutturale e non un elenco di nomi: chiede a `globals.css` quali
// token esistono e al sorgente quali si usano. Un gruppo nuovo si protegge da solo, e
// un gruppo rinominato fa fallire subito i punti rimasti indietro.

const RADICE = "src/";
const CSS = "src/app/globals.css";

/** `bg-area-x`, `text-area-x`, `border-area-x`, e `var(--area-x)` negli stili in linea. */
const USO = /(?:bg|text|border|from|to|via|fill|stroke|ring)-area-([a-z0-9]+)|var\(--area-([a-z0-9]+)\)/g;

/** La definizione in `globals.css`: `--area-x: oklch(...)`. */
const DEFINIZIONE = /--area-([a-z0-9]+)\s*:/g;

function sorgenti(dir: string, out: string[] = []): string[] {
  for (const voce of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, voce.name);
    if (voce.isDirectory()) sorgenti(p, out);
    else if (/\.(ts|tsx)$/.test(voce.name)) out.push(p);
  }
  return out;
}

/**
 * Via i commenti prima di cercare.
 *
 * ⚠️ Serve davvero: la prima esecuzione di questa guardia ha accusato `moduli.ts` — che
 * cita `bg-area-ambiente` nel commento che RACCONTA il difetto — e ha accusato se stessa,
 * perche' i nomi vecchi sono scritti qui sopra. Una classe dentro un commento non e' una
 * classe: Tailwind scandisce il testo, ma il browser non riceve niente da una riga
 * commentata, quindi non c'e' nessun riquadro da lasciare senza fondo.
 *
 * Il taglio a `//` puo' mangiare del codice vero dopo un indirizzo `https://` sulla
 * stessa riga. E' un difetto accettato e in una direzione sola: fa perdere un'occorrenza,
 * non ne inventa una. Un controllo che grida al lupo si smette di leggere.
 */
function senzaCommenti(testo: string): string {
  return testo.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function raccogli(testo: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of testo.matchAll(re)) {
    const nome = m[1] ?? m[2];
    if (nome) out.add(nome);
  }
  return out;
}

describe("classi del colore di gruppo", () => {
  const definiti = raccogli(readFileSync(CSS, "utf8"), DEFINIZIONE);

  it("globals.css definisce almeno un token di gruppo", () => {
    // Se il selettore smettesse di corrispondere, ogni asserzione qui sotto
    // passerebbe contro un insieme vuoto: e' la trappola del test che e' verde
    // perche' non guarda niente.
    expect(definiti.size).toBeGreaterThan(0);
  });

  it("ogni classe usata nel sorgente corrisponde a un token che esiste", () => {
    const orfane: string[] = [];
    for (const file of sorgenti(RADICE)) {
      const testo = readFileSync(file, "utf8");
      for (const nome of raccogli(senzaCommenti(testo), USO)) {
        if (!definiti.has(nome)) orfane.push(`${file}: area-${nome}`);
      }
    }
    expect(orfane).toEqual([]);
  });

  it("nessun token definito e' rimasto senza usarlo", () => {
    // Non e' pignoleria: un token che nessuno usa e' quasi sempre il resto di un
    // gruppo rinominato a meta', e la meta' che manca e' altrove.
    const usati = new Set<string>();
    for (const file of sorgenti(RADICE)) {
      for (const nome of raccogli(senzaCommenti(readFileSync(file, "utf8")), USO)) usati.add(nome);
    }
    expect([...definiti].filter((d) => !usati.has(d))).toEqual([]);
  });
});
