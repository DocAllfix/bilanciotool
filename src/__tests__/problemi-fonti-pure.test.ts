import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PROBLEMI } from "@/components/landing/problemi";

// LA COPY DURA DEVE RESTARE VERA.
//
// La home mette davanti a chi legge obblighi e sanzioni: è la parte che deve far sentire
// la pressione, ed è anche la parte in cui un errore costa di più, perché il prodotto vende
// conformità. Ogni voce porta la sua fonte normativa, e la fonte si stampa in pagina.

describe("i problemi della home", () => {
  it("⚠️ ogni voce ha una fonte, e la fonte cita un atto", () => {
    expect(PROBLEMI.length).toBeGreaterThan(3);
    for (const p of PROBLEMI) {
      expect(p.fonte.trim(), p.titolo).not.toBe("");
      // Un riferimento normativo vero: decreto, regolamento, direttiva o norma tecnica.
      expect(p.fonte, p.titolo).toMatch(/D\.Lgs\.|Regolamento|Direttiva|UNI|ISO|Linee guida/);
    }
  });

  it("⚠️ le sanzioni si scrivono in euro a lettere: la home non mostra cifre col simbolo", () => {
    for (const p of PROBLEMI) expect(`${p.titolo} ${p.testo}`, p.titolo).not.toMatch(/€/);
  });

  it("la fonte si stampa davvero sotto ogni voce", () => {
    const home = readFileSync("src/app/(marketing)/page.tsx", "utf8");
    expect(home).toContain("{p.fonte}");
    expect(home).toContain("data-fonte");
  });
});

describe("i problemi delle pagine dei percorsi", () => {
  it("⚠️ ogni dolore di ogni pagina ha una fonte che cita un atto", async () => {
    const { contenutiPubblicati } = await import("@/features/vetrina/contenuti");
    const pagine = contenutiPubblicati();
    expect(pagine.length).toBeGreaterThan(0);
    for (const c of pagine) {
      expect(c.dolori.length, c.slug).toBeGreaterThan(0);
      for (const d of c.dolori) {
        expect(d.fonte, `${c.slug}: ${d.titolo}`).toMatch(/D\.Lgs\.|Regolamento|Direttiva|UNI|ISO|Linee guida|Orientamenti/);
        expect(`${d.titolo} ${d.testo}`, `${c.slug}: ${d.titolo}`).not.toMatch(/€/);
      }
    }
  });

  it("⚠️ nessun trattino lungo nel testo pubblico", async () => {
    const { contenutiPubblicati } = await import("@/features/vetrina/contenuti");
    const { PROBLEMI } = await import("@/components/landing/problemi");
    const testi = [
      ...PROBLEMI.flatMap((p) => [p.titolo, p.testo, p.fonte]),
      ...contenutiPubblicati().flatMap((c) => [
        c.titolo, c.descrizione, c.promessa, ...c.perChi, ...c.cosaFa.flat(), ...c.primaDopo.flat(), ...c.domande.flat(),
        ...c.dolori.flatMap((d) => [d.titolo, d.testo, d.fonte]),
      ]),
    ];
    for (const t of testi) expect(t).not.toMatch(/—/);
  });
});
