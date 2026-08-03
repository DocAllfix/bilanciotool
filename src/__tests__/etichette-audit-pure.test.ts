import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ETICHETTE_AUDIT } from "@/features/companies/queries";
import { TIPI_DOCUMENTO } from "@/features/documents/tipi";

// Le azioni scritte nel registro delle operazioni devono avere tutte
// un'etichetta leggibile.
//
// Il fallimento è silenzioso e per questo insidioso: `ETICHETTE_AUDIT[azione] ??
// azione` non solleva niente, stampa il nome macchina. In produzione si leggeva
// «documento.soa.publish» nell'attività recente della home, e nessun typecheck
// poteva accorgersene perché quelle azioni si compongono a runtime
// (`documento.${tipo}.publish`).

/** Tutte le stringhe passate come `azione:` nel codice sorgente. */
function azioniNelCodice(dir: string, trovate = new Set<string>()): Set<string> {
  for (const voce of readdirSync(dir)) {
    const percorso = join(dir, voce);
    if (statSync(percorso).isDirectory()) {
      if (voce === "__tests__" || voce === "node_modules") continue;
      azioniNelCodice(percorso, trovate);
      continue;
    }
    if (!/\.tsx?$/.test(voce)) continue;
    const testo = readFileSync(percorso, "utf8");
    // Forma letterale: azione: "ghg.row.create"
    for (const m of testo.matchAll(/azione:\s*"([a-z0-9._]+)"/g)) trovate.add(m[1]);
    // Forma composta: azione: `documento.${tipo}.publish` → si espande sui tipi.
    for (const m of testo.matchAll(/azione:\s*`documento\.\$\{[^}]+\}\.([a-z]+)`/g)) {
      for (const t of TIPI_DOCUMENTO) trovate.add(`documento.${t}.${m[1]}`);
    }
  }
  return trovate;
}

describe("etichette del registro delle operazioni", () => {
  const azioni = azioniNelCodice(join(process.cwd(), "src"));

  it("il codice registra almeno tutte le azioni note", () => {
    // Guardia sulla scansione stessa: se una modifica alla forma delle chiamate
    // la rendesse cieca, il test passerebbe per finta.
    expect(azioni.size).toBeGreaterThan(40);
    expect(azioni.has("company.create")).toBe(true);
    expect(azioni.has("documento.soa.publish")).toBe(true);
  });

  it("ogni azione registrata ha un'etichetta in italiano", () => {
    const senzaEtichetta = [...azioni].filter((a) => !ETICHETTE_AUDIT[a]).sort();
    expect(
      senzaEtichetta,
      `Azioni senza etichetta: in interfaccia comparirebbe il nome macchina. ` +
        `Aggiungile a ETICHETTE_AUDIT in src/features/companies/queries.ts.`,
    ).toEqual([]);
  });

  it("ogni tipo di documento ha l'etichetta di pubblicazione e quella del PDF", () => {
    for (const t of TIPI_DOCUMENTO) {
      expect(ETICHETTE_AUDIT[`documento.${t}.publish`], `manca l'etichetta di pubblicazione per "${t}"`).toBeTruthy();
      expect(ETICHETTE_AUDIT[`documento.${t}.pdf`], `manca l'etichetta del PDF per "${t}"`).toBeTruthy();
    }
  });

  it("nessuna etichetta è il nome macchina ricopiato", () => {
    const pigre = Object.entries(ETICHETTE_AUDIT).filter(([k, v]) => k === v);
    expect(pigre.map(([k]) => k)).toEqual([]);
  });
});
