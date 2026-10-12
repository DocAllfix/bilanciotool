import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import domini from "@/lib/db/seeds/data/gdpr-domini.json";
import registri from "@/lib/db/seeds/data/gdpr-registri.json";
import { STATI_VERIFICA, TIPI_VERIFICA } from "@/lib/calc/gdpr/registri";
import { STATI_ATTIVITA, STATI_DOCUMENTO } from "@/lib/calc/gdpr/quadro";
import { STATI_REQUISITO } from "@/lib/calc/gdpr/tipi";

// Tre posti dicono quali valori ammette un campo: il prototipo (estratto in JSON), il
// motore (costanti TypeScript) e la migrazione (CHECK). Se divergono, l'interfaccia
// propone un valore che il database rifiuta, e lo si scopre al primo salvataggio di un
// cliente. Qui si confrontano.

const MIGRAZIONE = readFileSync("src/lib/db/migrations/0063_gdpr_rls.sql", "utf8");
const lit = (s: string) => `'${s.replaceAll("'", "''")}'`;
const opzioni = (reg: string, col: string) =>
  (registri.find((r) => r.key === reg)!.colonne.find((c) => c.chiave === col)!.opzioni ?? []).filter((x) => x !== "");

/** Le stringhe del vincolo `nome`, lette dalla migrazione. */
function nelVincolo(nome: string): string[] {
  const riga = MIGRAZIONE.split("\n").find((l) => l.includes(`${nome}_ck CHECK`));
  if (!riga) throw new Error(`Vincolo ${nome} non trovato nella migrazione`);
  return [...riga.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replaceAll("''", "'"));
}

describe("GDPR: i domini chiusi coincidono fra prototipo, motore e database", () => {
  it("il motore usa le stesse opzioni del prototipo", () => {
    expect([...TIPI_VERIFICA]).toEqual(opzioni("audit", "tipo"));
    expect([...STATI_VERIFICA]).toEqual(opzioni("audit", "stato"));
    expect([...STATI_DOCUMENTO]).toEqual(domini.statiDocumento);
    expect([...STATI_REQUISITO]).toEqual(domini.stati.map((s) => s.key));
    expect([...STATI_ATTIVITA]).toEqual(["Da fare", "In corso", "Fatto"]);
  });

  it("i CHECK della migrazione elencano esattamente le etichette del prototipo", () => {
    expect(nelVincolo("gdpr_trattamento_base")).toEqual(domini.basi);
    expect(nelVincolo("gdpr_trattamento_condizione9")).toEqual(domini.condizioni9);
    expect(nelVincolo("gdpr_fornitore_qualifica")).toEqual(domini.qualifiche);
    expect(nelVincolo("gdpr_fornitore_garanzia")).toEqual(domini.garanzie);
    expect(nelVincolo("gdpr_documento_tipo")).toEqual(domini.tipiDocumento);
    expect(nelVincolo("gdpr_documento_stato")).toEqual(domini.statiDocumento);
    expect(nelVincolo("gdpr_richiesta_diritto")).toEqual(opzioni("dir", "diritto"));
    expect(nelVincolo("gdpr_richiesta_canale")).toEqual(opzioni("dir", "canale"));
    expect(nelVincolo("gdpr_richiesta_esito")).toEqual(opzioni("dir", "esito"));
    expect(nelVincolo("gdpr_violazione_natura")).toEqual(opzioni("breach", "natura"));
    expect(nelVincolo("gdpr_violazione_rischio")).toEqual(opzioni("breach", "rischio"));
    expect(nelVincolo("gdpr_verifica_tipo")).toEqual(opzioni("audit", "tipo"));
  });

  it("gli apostrofi sono raddoppiati, non persi", () => {
    // «Dati resi pubblici dall'interessato», «Norme vincolanti d'impresa»: un apostrofo
    // singolo chiuderebbe la stringa SQL a metà.
    expect(MIGRAZIONE).toContain(lit("e) Dati resi pubblici dall'interessato"));
    expect(MIGRAZIONE).toContain(lit("Norme vincolanti d'impresa"));
  });

  it("la migrazione porta RLS, il trigger e il dominio del content set", () => {
    expect(MIGRAZIONE).toContain("'gdpr_system', 'gdpr_trattamento'");
    expect(MIGRAZIONE).toContain("t || '_tenant_rls'");
    expect(MIGRAZIONE).toContain("ON gdpr_system\n  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro')");
    expect(MIGRAZIONE).toMatch(/'nis2','gdpr'\]\)\);/);
  });
});
