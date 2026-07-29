import { describe, it, expect } from "vitest";
import { nz, dec, toFixedStr } from "@/lib/calc/shared/decimal";

// Contratto ereditato dal prototipo (funzione nz): input libero dell'utente con
// virgola decimale italiana, non-numerici → 0. Aritmetica su Decimal, mai float.
describe("nz — parsing numerico tollerante", () => {
  it("accetta la virgola decimale italiana", () => {
    expect(nz("1.234,56").toString()).toBe("1234.56");
    expect(nz("12,5").toString()).toBe("12.5");
  });
  it("accetta il punto decimale e i numeri puri", () => {
    expect(nz("12.5").toString()).toBe("12.5");
    expect(nz(7).toString()).toBe("7");
  });
  it("non-numerici, null, undefined e stringa vuota valgono 0", () => {
    expect(nz("").toString()).toBe("0");
    expect(nz(null).toString()).toBe("0");
    expect(nz(undefined).toString()).toBe("0");
    expect(nz("abc").toString()).toBe("0");
  });
  it("niente perdita di precisione float su moltiplicazioni tipiche", () => {
    // 0.1 * 3 = 0.30000000000000004 in float: qui deve essere esatto.
    expect(nz("0,1").times(3).toString()).toBe("0.3");
    // caso reale: 12500 Smc × 1,9755 kg/Smc ÷ 1000 = 24,69375 t esatte
    expect(nz("12500").times(dec("1.9755")).div(1000).toString()).toBe("24.69375");
  });
});

describe("toFixedStr — stringa decimale per la persistenza", () => {
  it("produce stringhe con punto, senza notazione esponenziale", () => {
    expect(toFixedStr(dec("0.00000123"), 8)).toBe("0.00000123");
    expect(toFixedStr(dec("23500"), 0)).toBe("23500");
  });
});
