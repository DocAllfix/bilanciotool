import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateStaticParams } from "@/app/(auth)/attiva/[fascia]/page";
import { fasceVendibili } from "@/lib/prezzi";

// La porta d'acquisto che parte dalla vetrina: `/attiva/<fascia>`.
//
// ⚠️ Le pagine si generano DAL LISTINO. Scritte a mano, una fascia nuova non avrebbe la
// sua porta e il richiamo sulla home porterebbe a un 404 — il difetto che nessuno vede,
// perché chi lo incontra è chi stava per comprare e se ne va senza dirlo.

describe("le porte d'acquisto per fascia", () => {
  it("ce n'è una per ogni fascia in vendita, e solo per quelle", () => {
    expect(generateStaticParams().map((p) => p.fascia)).toEqual([...fasceVendibili()]);
  });

  it("⚠️ una fascia che non esiste non iscrive nessuno: la pagina chiama notFound()", () => {
    // Si guarda il SORGENTE e non il comportamento, perché qui il comportamento lo
    // deciderebbe Next: quel che conta è che il ramo esista e non sia stato tolto.
    const src = readFileSync("src/app/(auth)/attiva/[fascia]/page.tsx", "utf8");
    expect(src).toMatch(/if \(!p\) notFound\(\);/);
  });

  it("la fascia viaggia fino alla pagina dei piani, che è l'unica dinamica", () => {
    const src = readFileSync("src/app/(auth)/attiva/[fascia]/page.tsx", "utf8");
    expect(src).toContain("/impostazioni/abbonamento?fascia=");
  });

  it("la home rimanda alla porta della fascia d'ingresso, senza scriverne il nome a mano", () => {
    const home = readFileSync("src/app/(marketing)/page.tsx", "utf8");
    expect(home).toContain("`/attiva/${fasceVendibili()[0]}`");
  });
});
