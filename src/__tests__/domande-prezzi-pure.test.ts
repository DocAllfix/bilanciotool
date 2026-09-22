import { describe, it, expect } from "vitest";
import { DOMANDE_PREZZI } from "@/components/landing/domande-prezzi";
import { PIANI, euro, fasceVendibili, prezzoDiVendita } from "@/lib/prezzi";

// Le risposte sui prezzi alimentano la pagina E il `FAQPage` dei dati strutturati, cioè
// ciò che un motore di ricerca riporta. Elencavano le fasce a mano: con la fascia da
// un'azienda avrebbero taciuto il prezzo più basso proprio a chi chiede «quanto costa».

const risposta = (inizio: string) => {
  const r = DOMANDE_PREZZI.find(([q]) => q.startsWith(inizio));
  if (!r) throw new Error(`domanda «${inizio}» sparita`);
  return r[1];
};

describe("le domande sui prezzi", () => {
  it("«Quanto costa» nomina il primo anno di OGNI fascia in vendita", () => {
    const t = risposta("Quanto costa");
    for (const k of fasceVendibili()) {
      expect(t, k).toContain(euro(prezzoDiVendita(PIANI[k], "anno1")!.importo));
    }
    expect(t).toContain("un'azienda");
    expect(t).not.toMatch(/\b1 aziende\b/);
  });

  it("«Il secondo anno» nomina il rinnovo di OGNI fascia in vendita", () => {
    const t = risposta("Il secondo anno");
    for (const k of fasceVendibili()) {
      expect(t, k).toContain(euro(prezzoDiVendita(PIANI[k], "rinnovo")!.importo));
    }
  });
});
