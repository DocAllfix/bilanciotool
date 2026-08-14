import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Nessuna password fissa nei collaudi.
//
// `PasswordSicura123!` stava in chiaro in trentadue file, e diversi collaudi hanno
// `https://evalisdeck.it` come indirizzo predefinito: creavano conti VERI in produzione,
// con quella password e un indirizzo dallo schema prevedibile
// (`tutto-attivo-<marca temporale>@example.com`). Chiunque leggesse il repository poteva
// entrare in uno di quegli studi.
//
// Questo controllo esiste perche' il rimedio non regge da solo: la stringa fissa torna
// alla prima volta che qualcuno scrive un collaudo nuovo copiando quello accanto.

const RADICI = ["scripts", "tests"];
const ESTENSIONI = [".mjs", ".js", ".ts", ".tsx"];

/** Le password che sono gia' state nel repository, piu' le forme in cui rispuntano. */
const VIETATE = [/PasswordSicura123!/, /Password123!/, /["'`]Test1234!?["'`]/];

function files(dir: string): string[] {
  const dentro: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) dentro.push(...files(p));
    else if (ESTENSIONI.some((e) => p.endsWith(e))) dentro.push(p);
  }
  return dentro;
}

describe("i collaudi non portano una password fissa", () => {
  it("nessun file di collaudo contiene una password nota", () => {
    const colpevoli: string[] = [];
    for (const radice of RADICI) {
      for (const f of files(radice)) {
        const testo = readFileSync(f, "utf8");
        if (VIETATE.some((rx) => rx.test(testo))) colpevoli.push(f);
      }
    }
    expect(colpevoli, `password fissa in:\n${colpevoli.join("\n")}`).toEqual([]);
  });

  it("la password nasce casuale a ogni esecuzione, e l'ambiente la puo' fissare", () => {
    // Due processi veri, non due `import` nello stesso: la password si calcola una
    // volta al caricamento del modulo, e dentro un solo processo si vedrebbe sempre
    // la stessa anche se fosse una costante.
    const leggi = (env?: Record<string, string>) =>
      execFileSync(
        process.execPath,
        ["-e", 'import("./scripts/comune-credenziali.mjs").then(m => console.log(m.PWD_COLLAUDO))'],
        { env: { ...process.env, PWD_COLLAUDO: "", ...env }, encoding: "utf8" },
      ).trim();

    const uno = leggi();
    const due = leggi();
    expect(uno).not.toBe(due);
    expect(uno.length).toBeGreaterThan(20);

    // Chi riusa un conto gia' creato deve poter rimettere la stessa password.
    expect(leggi({ PWD_COLLAUDO: "Fissata-Per-Riuso!" })).toBe("Fissata-Per-Riuso!");
  });
});
