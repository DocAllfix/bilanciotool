import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Lo spazio dopo il grassetto, nei documenti che finiscono in mano ai clienti.
//
// ⚠️ Trovato guardando una relazione pubblicata: «Natura del documento.La relazione»,
// in un riquadro che dichiara la natura giuridica del documento a un organo di
// controllo. Nel sorgente lo spazio c'era.
//
// La parte istruttiva è come si è arrivati alla causa. Rendere il componente DA SOLO,
// con `renderToStaticMarkup`, restituiva lo spazio: la prova sembrava scagionare il
// codice. Sulla pagina vera, servita da Next, lo spazio non c'era. Quindi **rendere un
// componente in isolamento non è una misura fedele di ciò che arriva al browser**, ed è
// un raffinamento della regola che questo progetto aveva già («lo spazio mangiato si
// cerca sull'HTML reso, non sul sorgente»): reso DOVE, conta.
//
// Nello stesso riquadro, due paragrafi identici per forma si comportavano in modo
// diverso — uno perdeva lo spazio, l'altro no. Non si è cercata oltre la causa a monte:
// `{" "}` produce esattamente uno spazio in ogni percorso, quindi la regola è renderlo
// esplicito e verificarlo, invece di dipendere da come una catena di strumenti tratta
// uno spazio letterale.
//
// Il difetto è invisibile a tutto il resto: non è un errore di console, non è una
// richiesta fallita, non è un test rosso. Si vede solo leggendo il documento — cioè lo
// vedrebbe per primo il destinatario.

const CARTELLA = "src/components/documento";

/** Spazio letterale fra un tag di chiusura in linea e il testo che segue. */
const FRAGILE = /<\/(strong|em|b|i)> (?=[A-ZÀ-Ü])/g;

describe("i documenti non affidano lo spazio dopo il grassetto al caso", () => {
  const file = readdirSync(CARTELLA).filter((f) => f.endsWith(".tsx"));

  it("la scansione guarda davvero i documenti", () => {
    // Guardia sulla scansione stessa: se un domani i template si spostassero, questo
    // test passerebbe per finta su una cartella vuota.
    expect(file.length).toBeGreaterThan(5);
    expect(file.some((f) => f.startsWith("documento-"))).toBe(true);
  });

  it("nessun template lascia lo spazio implicito dopo un tag in linea", () => {
    const colpevoli: string[] = [];
    for (const f of file) {
      const testo = readFileSync(join(CARTELLA, f), "utf8");
      for (const m of testo.matchAll(FRAGILE)) {
        const riga = testo.slice(0, m.index).split("\n").length;
        colpevoli.push(`${f}:${riga} — ${m[0].trim()}`);
      }
    }
    expect(
      colpevoli,
      "Usa `{\" \"}` al posto dello spazio letterale: renderizzato dalla pagina vera " +
        "quello spazio può sparire, e il primo ad accorgersene sarebbe il destinatario " +
        "del documento.",
    ).toEqual([]);
  });
});
