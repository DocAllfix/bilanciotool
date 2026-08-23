import { describe, it, expect } from "vitest";
import { dataIsoSchema } from "@/features/campi";

// La validazione delle date, e il difetto che ha reso necessaria questa funzione.
//
// Era stata scritta due volte — in ISO 37001 e nel Modello 231 — e sbagliata entrambe
// le volte allo stesso modo: `new Date("2026-02-31")` NON lancia e NON e' `Invalid
// Date`, diventa il 3 marzo. Un 31 febbraio veniva accettato e salvato come un'altra
// data, senza che nessuno lo vedesse.
//
// Su un Modello 231 la data di adozione dev'essere «di data certa e anteriore ai
// fatti»: una data che slitta in silenzio e' peggio di una rifiutata.

const ok = (v: string) => dataIsoSchema.safeParse(v).success;

describe("date ISO", () => {
  it("accetta una data vera", () => {
    expect(ok("2026-08-23")).toBe(true);
    expect(ok("2024-02-29")).toBe(true); // bisestile
  });

  it("accetta la stringa vuota: «non compilato» non e' «sbagliato»", () => {
    expect(ok("")).toBe(true);
  });

  it("RIFIUTA le date che JavaScript farebbe scivolare", () => {
    expect(ok("2026-02-31")).toBe(false); // diventerebbe il 3 marzo
    expect(ok("2026-02-30")).toBe(false);
    expect(ok("2026-04-31")).toBe(false); // aprile ha 30 giorni
    expect(ok("2025-02-29")).toBe(false); // il 2025 non e' bisestile
  });

  it("rifiuta i mesi e i giorni fuori scala", () => {
    expect(ok("2026-13-01")).toBe(false);
    expect(ok("2026-00-10")).toBe(false);
    expect(ok("2026-01-32")).toBe(false);
    expect(ok("2026-01-00")).toBe(false);
  });

  it("rifiuta i formati che non sono aaaa-mm-gg", () => {
    expect(ok("23/08/2026")).toBe(false);
    expect(ok("2026-8-3")).toBe(false);
    expect(ok("ieri")).toBe(false);
  });
});
