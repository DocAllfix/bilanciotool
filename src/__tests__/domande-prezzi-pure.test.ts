import { describe, it, expect } from "vitest";
import { DOMANDE_PREZZI } from "@/components/landing/domande-prezzi";
import { PERIODI, PIANI, euro, fasceVendibili, prezzoDiVendita } from "@/lib/prezzi";

// Le risposte sui prezzi alimentano la pagina E il `FAQPage` dei dati strutturati, cioè
// ciò che un motore di ricerca riporta. Un prezzo che manca o è vecchio in una risposta è
// una seconda verità sullo stesso numero, e la più letta.

const risposta = (inizio: string) => {
  const r = DOMANDE_PREZZI.find(([q]) => q.startsWith(inizio));
  if (!r) throw new Error(`domanda «${inizio}» sparita`);
  return r[1];
};

describe("le domande sui prezzi", () => {
  it("«Quanto costa» nomina l'annuale e il mensile di OGNI piano in vendita", () => {
    const t = risposta("Quanto costa");
    for (const k of fasceVendibili()) {
      for (const p of PERIODI) expect(t, `${k} ${p}`).toContain(euro(prezzoDiVendita(PIANI[k], p)!.importo));
    }
    expect(t).not.toMatch(/\b1 aziende\b/);
  });

  it("«Il secondo anno» dice che costa uguale, con l'annuale di ogni piano", () => {
    const t = risposta("Il secondo anno");
    expect(t).toMatch(/^Sì/);
    for (const k of fasceVendibili()) expect(t, k).toContain(euro(prezzoDiVendita(PIANI[k], "anno")!.importo));
  });

  it("⚠️ nessuna risposta nomina ciò che non si vende più", () => {
    const tutto = DOMANDE_PREZZI.map(([q, a]) => `${q} ${a}`).join("\n");
    expect(tutto).not.toMatch(/Fondatori|blocch|20% in meno|primo anno comprende|Un'azienda»|Fino a 5 aziende/);
  });
});
