import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fmtDataBreve, fmtDataEstesa } from "@/lib/format";

// Le date si scrivono nel giorno ITALIANO, qualunque sia il fuso del processo.
//
// ⚠️ Il server di Vercel gira in UTC, il browser a Roma. `getDate()` dava due giorni diversi
// fra mezzanotte e le due, e React rispondeva #418 buttando via l'HTML del server: il giro
// sull'anteprima del 17 ottobre 2026, finito alle due di notte, l'ha trovato su assistenza e
// condivisione. Qui il processo si mette in UTC apposta, che è il caso di Vercel.

let prima: string | undefined;
beforeAll(() => {
  prima = process.env.TZ;
  process.env.TZ = "UTC";
});
afterAll(() => {
  if (prima === undefined) delete process.env.TZ;
  else process.env.TZ = prima;
});

describe("date nel giorno italiano", () => {
  it("le 23:30 UTC del 16 ottobre sono già il 17 in Italia (ora legale)", () => {
    expect(fmtDataBreve("2026-10-16T23:30:00Z")).toBe("17 ott 2026");
    expect(fmtDataEstesa(new Date("2026-10-16T23:30:00Z"))).toBe("17 ottobre 2026");
  });

  it("e d'inverno lo scarto è di un'ora sola", () => {
    expect(fmtDataBreve("2026-12-31T22:30:00Z")).toBe("31 dic 2026");
    expect(fmtDataBreve("2026-12-31T23:30:00Z")).toBe("1 gen 2027");
  });

  it("una data pura resta quella", () => {
    expect(fmtDataBreve("2026-02-28")).toBe("28 feb 2026");
    expect(fmtDataEstesa("2026-10-16")).toBe("16 ottobre 2026");
  });

  it("vuoto e invalido danno il trattino", () => {
    expect(fmtDataBreve(null)).toBe("—");
    expect(fmtDataEstesa("non è una data")).toBe("—");
  });
});
