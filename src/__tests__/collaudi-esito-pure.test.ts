import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// IL CODICE D'USCITA DI UN COLLAUDO DEVE DIRE LA VERITÀ.
//
// ⚠️ Nasce da un difetto vero, trovato l'8 settembre 2026 leggendo «44 ok, 0 falliti»
// accanto a un `EXIT=1`. Tre collaudi su quaranta finivano con
// `process.exit(esito ? 0 : 1)`, e `riepilogo` restituisce QUANTI ROSSI ci sono: con dei
// falliti uscivano **zero** — successo — e con tutto verde uscivano **uno**.
//
// Nel verso peggiore: un collaudo rosso riferito come verde a chiunque legga il codice
// d'uscita invece del testo — `qa.mjs`, la CI, `giro-completo.mjs`, `qa-anteprima.mjs`. È
// la stessa famiglia di `npm run test | tail`, che restituisce l'esito dell'ultimo comando
// della pipe: il numero stampato era giusto, la risposta alla macchina no.
//
// ⚠️ Si controlla la POLARITÀ, non solo la presenza. Un collaudo che non chiude l'esito è
// un difetto; uno che lo chiude al contrario è peggio, perché sembra fatto.

const SCRIPTS = join(process.cwd(), "scripts");

/** I collaudi che si affidano al contatore condiviso. */
function collaudiConRiepilogo(): { nome: string; testo: string }[] {
  return readdirSync(SCRIPTS)
    .filter((f) => f.endsWith(".mjs"))
    .map((nome) => ({ nome, testo: readFileSync(join(SCRIPTS, nome), "utf8") }))
    .filter((f) => f.nome !== "comune-collaudo.mjs" && /\briepilogo\s*\(/.test(f.testo));
}

/**
 * La forma malata: l'esito mappato su zero.
 *
 * ⚠️ I backslash del sorgente sono quelli veri, e questa espressione è scritta con
 * `RegExp` letterali invece che costruita da una stringa proprio per non ricadere nella
 * trappola già pagata altrove: dentro un template literal un solo `\d` è la lettera «d»,
 * e la guardia smetterebbe di scattare senza dirlo.
 */
const INVERTITO_DIRETTO = /process\.exit(?:Code)?\s*[(=]\s*riepilogo\s*\([^)]*\)\s*\?\s*0\s*:\s*1/;

function invertitoSuVariabile(nome: string): RegExp {
  return new RegExp(String.raw`process\.exit(?:Code)?\s*[(=]\s*` + nome + String.raw`\s*\?\s*0\s*:\s*1`);
}

describe("il codice d'uscita dei collaudi", () => {
  const file = collaudiConRiepilogo();

  it("ce ne sono, altrimenti questa guardia non guarda niente", () => {
    // Un test che scandisce un elenco vuoto passa sempre: è già successo in questo
    // progetto con un controllo puntato a una cartella che non esiste.
    expect(file.length).toBeGreaterThanOrEqual(10);
  });

  it("⚠️ nessuno mappa «ci sono rossi» su un'uscita di successo", () => {
    // Le forme sane sono tre, e tutte portano il vero a 1:
    //   process.exit(riepilogo(...) ? 1 : 0)
    //   const ko = riepilogo(...);  process.exitCode = ko ? 1 : 0
    //   const ko = riepilogo(...);  if (ko > 0) process.exitCode = 1
    // Quella malata è una sola, e si riconosce dal `? 0 : 1` sulla riga dell'uscita.
    const invertiti: string[] = [];
    for (const { nome, testo } of file) {
      const assegnata = testo.match(/(?:const|let)\s+(\w+)\s*=\s*riepilogo\s*\(/)?.[1];
      const malato =
        INVERTITO_DIRETTO.test(testo) || (assegnata ? invertitoSuVariabile(assegnata).test(testo) : false);
      if (malato) invertiti.push(nome);
    }
    expect(invertiti, "collaudi che riferiscono verde quando sono rossi").toEqual([]);
  });

  it("⚠️ ognuno chiude davvero l'esito: stamparlo e uscire con zero non basta", () => {
    // Un collaudo che stampa «3 falliti» ed esce con zero è invisibile a `qa.mjs` e alla
    // CI: il referto lo legge una persona, il codice d'uscita lo legge tutto il resto.
    const muti = file.filter((f) => !/process\.exit(?:Code)?/.test(f.testo)).map((f) => f.nome);
    expect(muti, "collaudi che non impostano nessun codice d'uscita").toEqual([]);
  });

  it("il controllo sa diventare rosso", () => {
    // La forma malata, riconosciuta su un testo finto: senza questa prova la guardia
    // potrebbe non aver mai riconosciuto niente.
    expect(INVERTITO_DIRETTO.test('process.exit(riepilogo("X") ? 0 : 1);')).toBe(true);
    expect(INVERTITO_DIRETTO.test('process.exit(riepilogo("X") ? 1 : 0);')).toBe(false);
    expect(invertitoSuVariabile("esito").test("process.exit(esito ? 0 : 1);")).toBe(true);
    expect(invertitoSuVariabile("ko").test("process.exitCode = ko ? 1 : 0;")).toBe(false);
  });
});
