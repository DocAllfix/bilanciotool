import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * LO SCADENZARIO NON PUÒ LEGGERE L'AGENDA.
 *
 * ⚠️ Sono due elenchi che stanno accanto sulla dashboard e si somigliano, e fonderli
 * sembrerebbe un servizio. Ma uno si chiude LAVORANDOCI e l'altro SPUNTANDOLO: un
 * consulente che spuntasse «GHG 2025 da pubblicare» crederebbe di aver chiuso un lavoro
 * che nessuno ha fatto. Lo scadenzario è una misura, non una lista di cose da fare, e
 * nessuno lo scrive e nessuno lo può cancellare.
 *
 * ⚠️ E questo è un controllo STRUTTURALE, non funzionale, perché è la forma giusta per un
 * pericolo che oggi non c'è. Provare dall'interfaccia che spuntare una voce non muove il
 * conteggio dimostra il comportamento di oggi; questo impedisce che domani qualcuno colleghi
 * le due cose «per comodità» — che è il momento in cui il danno si crea. Un pericolo si
 * evita, non si filtra.
 */
const SORGENTE = join(process.cwd(), "src", "features", "companies", "scadenzario.ts");

describe("lo scadenzario e l'agenda restano due cose", () => {
  const codice = readFileSync(SORGENTE, "utf8");

  it("⚠️ la sorgente dello scadenzario non nomina l'agenda", () => {
    // Si guarda il CODICE, senza i commenti: la prosa che spiega il pericolo nomina
    // l'agenda apposta, ed è già successo che un controllo trovasse il divieto dentro la
    // frase scritta per spiegarlo.
    const senzaCommenti = codice
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .map((r) => r.replace(/^\s*\/\/.*$/, ""))
      .join("\n");
    const colpe = [/agendaVoce/, /["'@/\w-]*agenda["'\w-]*/i].filter((re) => re.test(senzaCommenti));
    expect(colpe.map(String), "lo scadenzario ha cominciato a guardare l'agenda").toEqual([]);
  });

  it("il file esiste davvero: un controllo su un percorso sbagliato passa sempre", () => {
    // ⚠️ Già successo altrove: un controllo che scandiva una cartella inesistente era
    // verde guardando zero file.
    expect(codice.length).toBeGreaterThan(500);
    expect(codice).toContain("getScadenzario");
  });
});
