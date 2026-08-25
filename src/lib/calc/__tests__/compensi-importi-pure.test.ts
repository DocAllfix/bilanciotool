import { describe, it, expect } from "vitest";
// Dal modulo PURO: un test di aritmetica non deve avere bisogno di un database.
import { aCentesimi, euro, riepilogo, type VoceSommabile } from "../compensi/importi";

// L'aritmetica del denaro, dove un difetto è silenzioso e caro.
//
// ⚠️ Il caso che giustifica da solo questo file: «1.234,56» in italiano vale
// milleduecentotrentaquattro e cinquantasei. `parseFloat` legge `1.234` e restituisce
// **uno virgola duecentotrentaquattro** — un compenso di un euro e ventitré al posto di
// milleduecento — e non solleva nessun errore. Sarebbe finito in una somma, e la somma
// sarebbe sembrata plausibile.

describe("da testo a centesimi", () => {
  it("legge la forma italiana con migliaia e decimali", () => {
    expect(aCentesimi("1.234,56")).toBe(123456);
    expect(aCentesimi("12.345,00")).toBe(1234500);
    expect(aCentesimi("1.000.000,99")).toBe(100000099);
  });

  it("legge i numeri semplici", () => {
    expect(aCentesimi("1500")).toBe(150000);
    expect(aCentesimi("1500,5")).toBe(150050);
    expect(aCentesimi("0,01")).toBe(1);
    expect(aCentesimi("0")).toBe(0);
  });

  it("tollera il simbolo dell'euro e gli spazi", () => {
    expect(aCentesimi(" € 1.450,00 ")).toBe(145000);
  });

  it("NON confonde le migliaia con i decimali", () => {
    // ⚠️ Il punto del file. `parseFloat("1.234")` darebbe 1.234, cioè 123 centesimi.
    expect(aCentesimi("1.234")).toBe(123400);
    expect(aCentesimi("1.234")).not.toBe(123);
  });

  it("rifiuta ciò che non è un importo, invece di indovinare", () => {
    // Un importo indovinato male non produce un errore: produce un numero sbagliato in
    // una colonna che si somma, e nessuno se ne accorge.
    for (const s of ["", "  ", "abc", "12,345", "1,2,3", "-50", "1.23.4", "12€34"]) {
      expect(aCentesimi(s), `«${s}» non dovrebbe passare`).toBeNull();
    }
  });

  it("rifiuta piu' di due decimali", () => {
    expect(aCentesimi("10,123")).toBeNull();
  });
});

describe("da centesimi a testo", () => {
  it("mette sempre due decimali e i punti delle migliaia", () => {
    expect(euro(123456)).toBe("1.234,56");
    expect(euro(100)).toBe("1,00");
    expect(euro(5)).toBe("0,05");
    expect(euro(0)).toBe("0,00");
  });

  it("va e torna senza perdere niente", () => {
    // ⚠️ Il giro completo su valori scomodi: con i decimali in virgola mobile qualcuno
    // di questi tornerebbe indietro diverso.
    for (const c of [1, 99, 100, 12345, 999999, 100000099]) {
      expect(aCentesimi(euro(c)), `${c} non torna`).toBe(c);
    }
  });
});

describe("riepilogo", () => {
  const voce = (importo: number, incassato: number, scadenza: string | null): VoceSommabile =>
    ({
      importo,
      incassato,
      residuo: Math.max(0, importo - incassato),
      scadenza,
    }) as VoceSommabile;

  it("somma interi, e tre acconti da 333,33 su 1000 lasciano un centesimo", () => {
    // ⚠️ È il caso che con i float non tornerebbe: 333.33 * 3 = 999.9899999999999.
    const v = [voce(100000, 33333 * 3, null)];
    const r = riepilogo(v, "2026-08-26");
    expect(r.concordato).toBe(100000);
    expect(r.incassato).toBe(99999);
    expect(r.daIncassare).toBe(1);
  });

  it("un acconto in eccesso non diventa un debito dello studio", () => {
    // Un arrotondamento o un bonifico sbagliato non deve mettere un meno in una colonna
    // che si somma.
    const r = riepilogo([voce(10000, 12000, null)], "2026-08-26");
    expect(r.daIncassare).toBe(0);
  });

  it("conta in ritardo solo chi ha un residuo E una scadenza passata", () => {
    const r = riepilogo(
      [
        voce(10000, 0, "2026-08-01"), // scaduto e non pagato
        voce(10000, 10000, "2026-08-01"), // scaduto ma pagato
        voce(10000, 0, "2026-12-31"), // non pagato ma non ancora scaduto
        voce(10000, 0, null), // senza scadenza
      ],
      "2026-08-26",
    );
    expect(r.inRitardo).toBe(1);
    expect(r.concordato).toBe(40000);
    expect(r.daIncassare).toBe(30000);
  });

  it("su un elenco vuoto da' zero, non NaN", () => {
    const r = riepilogo([], "2026-08-26");
    expect(r).toEqual({ concordato: 0, incassato: 0, daIncassare: 0, inRitardo: 0 });
  });
});
