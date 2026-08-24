import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

// Nessuna pagina pubblica deve leggere la richiesta HTTP.
//
// Nato da un guasto vero, in produzione: `SiteHeader` chiamava `getSessionOrNull()` —
// cioè `headers()` — per decidere se scrivere «Accedi» o «Vai al portafoglio». Quella
// singola lettura impediva a Next di generare come statica ogni pagina che monta
// l'intestazione. Finché il blog era vuoto non se n'e' accorto nessuno; il giorno del
// primo articolo, la sua pagina — che nessun build conosceva — andava generata su
// richiesta, e in quel contesto leggere gli header e' vietato: 500 a chiunque aprisse
// l'articolo. Nel frattempo la home veniva ricostruita a ogni visita.
//
// Il controllo SEGUE GLI IMPORT invece di guardare i soli file delle pagine: il difetto
// non stava nella pagina, stava tre livelli sotto, in un componente condiviso. Un grep
// sulle sole pagine non l'avrebbe mai visto.

const RADICE = resolve(__dirname, "..");
const PAGINE = join(RADICE, "app", "(marketing)");

/** Ciò che opta una route fuori dalla generazione statica. `draftMode()` NON è qui:
 *  durante il prerender Next lo risolve a «disattivato» senza rendere dinamica la
 *  route, ed è stato verificato sul campo, non dedotto. */
const VIETATI = [
  { spia: /\bheaders\s*\(\s*\)/, nome: "headers()" },
  { spia: /\bcookies\s*\(\s*\)/, nome: "cookies()" },
  { spia: /\bgetSessionOrNull\b/, nome: "getSessionOrNull()" },
  { spia: /\brequireSession\b/, nome: "requireSession()" },
  { spia: /auth\.api\.getSession/, nome: "auth.api.getSession()" },
];

function fileSorgente(dir: string): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) out.push(...fileSorgente(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Risolve un import verso un file vero, provando le estensioni come fa il bundler. */
function risolvi(daFile: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? join(RADICE, spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(daFile), spec)
      : null;
  if (!base) return null; // pacchetto esterno: non è roba nostra
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

const IMPORT = /(?:^|\n)\s*import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

/** Percorso di import dalla pagina fino al file incriminato: senza, il messaggio direbbe
 *  «questo file legge gli header» e chi legge non saprebbe perché lo riguarda. */
function catenaVerso(partenza: string): Map<string, string[]> {
  const visti = new Map<string, string[]>([[partenza, [partenza]]]);
  const coda = [partenza];
  while (coda.length) {
    const f = coda.shift()!;
    const testo = readFileSync(f, "utf8");
    // I componenti client girano nel browser: lì `headers()` non esiste proprio, e
    // qualunque cosa facciano non tocca la generazione statica della pagina.
    if (/^\s*["']use client["']/.test(testo)) continue;
    for (const m of testo.matchAll(IMPORT)) {
      const dest = risolvi(f, m[1]);
      if (!dest || visti.has(dest)) continue;
      visti.set(dest, [...visti.get(f)!, dest]);
      coda.push(dest);
    }
  }
  return visti;
}

const breve = (p: string) => p.slice(RADICE.length + 1).replace(/\\/g, "/");

/** Via i commenti prima di cercare: la prima versione di questo test si e' accesa sul
 *  commento che spiegava il divieto, e un controllo che segnala le sue stesse istruzioni
 *  insegna solo a ignorarlo. */
const codice = (testo: string) =>
  testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:'"`])\/\/[^\n]*/g, "$1");

describe("le pagine pubbliche restano generabili staticamente", () => {
  it("nessun file raggiunto da una pagina marketing legge la richiesta", () => {
    const pagine = fileSorgente(PAGINE).filter((f) => /[\\/](page|layout)\.tsx$/.test(f));
    expect(pagine.length).toBeGreaterThan(5);

    const problemi: string[] = [];
    for (const pagina of pagine) {
      // ⚠️ Una pagina che dichiara `force-dynamic` non è candidata alla generazione
      // statica, quindi il guasto che questo controllo esiste per prevenire non la
      // riguarda: quel guasto era una pagina che Next AVREBBE generato staticamente e
      // che, non potendo, rispondeva 500 al primo articolo pubblicato.
      //
      // È una regola STRUTTURALE e non un elenco di nomi da tenere aggiornato: si legge
      // dal file la stessa dichiarazione che legge Next. Chi togliesse `force-dynamic`
      // per errore rimetterebbe la pagina sotto il controllo, che è esattamente il
      // comportamento voluto — mentre un'eccezione per nome resterebbe muta.
      if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(readFileSync(pagina, "utf8"))) {
        continue;
      }
      for (const [file, catena] of catenaVerso(pagina)) {
        const testo = readFileSync(file, "utf8");
        if (/^\s*["']use client["']/.test(testo)) continue;
        const corpo = codice(testo);
        for (const { spia, nome } of VIETATI) {
          if (spia.test(corpo)) {
            problemi.push(`${nome} in ${breve(file)}\n      via ${catena.map(breve).join("\n        → ")}`);
          }
        }
      }
    }

    expect(
      [...new Set(problemi)],
      "Una pagina pubblica non può leggere la richiesta: la rende impossibile da generare " +
        "staticamente, e ogni pagina nuova (un articolo appena pubblicato) risponde 500.\n" +
        "Sposta la lettura in un componente client, come `azioni-accesso.tsx`.\n\n",
    ).toEqual([]);
  });

  it("il controllo sa diventare rosso", () => {
    // Un controllo che non può fallire non è un controllo: si prova la spia sul testo
    // esatto che il difetto aveva in produzione.
    const comEra = `const session = await getSessionOrNull();`;
    expect(VIETATI.some((v) => v.spia.test(comEra))).toBe(true);
    expect(VIETATI.some((v) => v.spia.test(`const h = await headers();`))).toBe(true);
    // E non deve invece inciampare su ciò che è legittimo.
    expect(VIETATI.some((v) => v.spia.test(`const { isEnabled } = await draftMode();`))).toBe(false);
  });
});
