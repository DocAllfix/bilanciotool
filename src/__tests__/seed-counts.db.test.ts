import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { count, eq } from "drizzle-orm";
import {
  contentSet, ghgCategory, ghgSourceType, emissionFactor, gwpSet,
  checklistRequirement, materialityTopic, kpiSection, kpiDefinition,
  ratingScale, narrativeTemplate, atecoSuggestion,
} from "@/lib/db/schema";

// Conteggi ESATTI dei contenuti metodologici estratti dai prototipi
// (estrazione automatica via scripts/extract-seed.mjs — niente trascrizione manuale).
// NB: le sorgenti sono 25 (4+2+5+7+4+3), non 26 come stimato in pianificazione.
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("seed contenuti metodologici", () => {
  const conta = async (t: Parameters<typeof db.select>[0] extends never ? never : any) => {
    const r = await db.select({ n: count() }).from(t);
    return r[0].n;
  };

  it("conteggi esatti per ogni catalogo", async () => {
    expect(await conta(contentSet)).toBe(2); // ghg-v1 + report-v1
    expect(await conta(ghgCategory)).toBe(6);
    expect(await conta(ghgSourceType)).toBe(25);
    expect(await conta(emissionFactor)).toBe(59);
    expect(await conta(gwpSet)).toBe(3);
    expect(await conta(checklistRequirement)).toBe(15);
    expect(await conta(materialityTopic)).toBe(18);
    expect(await conta(kpiSection)).toBe(8);
    expect(await conta(kpiDefinition)).toBe(49);
    expect(await conta(ratingScale)).toBe(3); // dq + imp + fin
    expect(await conta(narrativeTemplate)).toBe(7);
    expect(await conta(atecoSuggestion)).toBe(8);
  });

  it("i contenuti campione sono fedeli al prototipo", async () => {
    const [gas] = await db.select().from(emissionFactor).where(eq(emissionFactor.key, "gas_smc"));
    expect(gas.nome).toBe("Gas naturale");
    expect(gas.fe).toBe("1.9755");
    const [t01] = await db.select().from(materialityTopic).where(eq(materialityTopic.key, "T01"));
    expect(t01.nome).toBe("Cambiamento climatico ed emissioni");
    expect((t01.guida as { imp: string[] }).imp).toHaveLength(3);
    const [sf6] = await db.select().from(emissionFactor).where(eq(emissionFactor.key, "sf6"));
    expect(sf6.fe).toBe("23500"); // GWP SF6 — il valore più estremo della libreria
  });

  it("ogni sorgente appartiene a una categoria esistente", async () => {
    const cats = new Set((await db.select().from(ghgCategory)).map((c) => c.key));
    const srcs = await db.select().from(ghgSourceType);
    for (const s of srcs) expect(cats.has(s.categoryKey), `${s.key}→${s.categoryKey}`).toBe(true);
  });
});
