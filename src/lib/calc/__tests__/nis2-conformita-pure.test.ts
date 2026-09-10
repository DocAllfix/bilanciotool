import { describe, expect, it } from "vitest";

import {
  LIVELLI,
  OBIETTIVO_PREDEFINITO,
  GIORNI_PER_PRIORITA,
  conformita,
  livelloMedio,
  perCapitolo,
  scostamenti,
  priorita,
  type Valutazione,
} from "@/lib/calc/nis2/conformita";
import golden from "./nis2-golden.json";

// IL LIVELLO DI CONFORMITA': 126 requisiti su 12 capi, scala 0÷4.
//
// ⚠️ QUI STA LA DIVERGENZA PIU' GROSSA DAL PROTOTIPO, ED E' LA STESSA GIA' CORRETTA
// DUE VOLTE IN QUESTO PROGETTO (Modello 231 e ISO 37001).
//
// Il prototipo media sui SOLI requisiti valutati. Sul caso del golden — venti requisiti
// valutati a giro sui cinque livelli, uno non applicabile, centocinque mai guardati —
// restituisce **50%**. E' lo stesso numero che darebbe «tutti e 125 valutati a livello 2»,
// e lo stesso che darebbe «tre requisiti conformi e centoventidue ignorati».
//
// Tre situazioni opposte, un numero solo, su un documento che si porta all'ACN.
//
// Qui un requisito applicabile e non valutato pesa ZERO: sullo stesso caso si ottiene
// **8%**, che e' quanto quell'ente ha davvero dimostrato. «Non applicabile» resta invece
// fuori dal denominatore, ed e' un'altra cosa: e' una valutazione, non un'omissione.
//
// La regola non e' riscritta qui: viene da `calc/comune/valutazione.ts`, dove sta da
// quando la stessa domanda si e' presentata per la terza volta.

/** Il caso del golden, tradotto nel nostro vocabolario. */
const CASO: Valutazione[] = (() => {
  const v: Valutazione[] = [];
  for (let i = 0; i < 126; i++) {
    if (i < 20) v.push({ livello: i % 5, nonApplicabile: false });
    else if (i === 20) v.push({ livello: null, nonApplicabile: true });
    else v.push({ livello: null, nonApplicabile: false });
  }
  return v;
})();

describe("la scala e' quella del prototipo", () => {
  it("cinque livelli, da 0 a 100 per venticinque", () => {
    expect(LIVELLI.map((l) => l.valore)).toEqual([0, 1, 2, 3, 4]);
    expect(LIVELLI.map((l) => l.percentuale)).toEqual([0, 25, 50, 75, 100]);
  });

  it("gli stessi cinque del corpus", () => {
    // Il golden non li porta espliciti, ma l'obiettivo predefinito si', ed e' il 3.
    expect(golden.conformita.obiettivo).toBe(OBIETTIVO_PREDEFINITO);
    expect(OBIETTIVO_PREDEFINITO).toBe(3);
  });

  it("⚠️ il livello 3 pretende l'evidenza documentale, il 4 la verifica di efficacia", () => {
    // Sta scritto nella descrizione perche' e' la sola cosa che impedisce a un
    // consulente di mettere 3 dappertutto: senza l'evidenza il livello e' 2.
    expect(LIVELLI[3].descrizione).toMatch(/evidenza documentale/i);
    expect(LIVELLI[4].descrizione).toMatch(/efficacia/i);
  });
});

describe("conformita · ⚠️ un requisito applicabile e non valutato pesa ZERO", () => {
  it("sul caso del golden diamo 8%, il prototipo dava 50%", () => {
    expect(conformita(CASO)).toBe(8);
    expect(golden.conformita.percentualeProtipo).toBe(50);
  });

  it("il conto: 20 valutati su 125 applicabili, uno non applicabile fuori", () => {
    expect(golden.conformita.attivi).toBe(125);
    expect(golden.conformita.valutati).toBe(20);
    // 4 requisiti per livello: (0 + 25 + 50 + 75 + 100) × 4 = 1000, su 125 → 8.
    expect(Math.round(1000 / 125)).toBe(8);
  });

  it("tre requisiti conformi su venti NON danno cento", () => {
    // E' il caso che ha fatto nascere la regola: mediando sui valutati darebbe 100,
    // cioe' lo stesso numero di «tutti e venti conformi».
    const tre: Valutazione[] = Array.from({ length: 20 }, (_, i) =>
      i < 3 ? { livello: 4, nonApplicabile: false } : { livello: null, nonApplicabile: false },
    );
    expect(conformita(tre)).toBe(15);
    expect(conformita(tre)).not.toBe(100);
  });

  it("«non applicabile» esce dal denominatore, e non e' la stessa cosa", () => {
    // Chi ha dichiarato che venti requisiti non lo riguardano non deve risultare
    // inadempiente su venti requisiti.
    const na: Valutazione[] = Array.from({ length: 20 }, (_, i) =>
      i < 3 ? { livello: 4, nonApplicabile: false } : { livello: null, nonApplicabile: true },
    );
    expect(conformita(na)).toBe(100);
  });

  it("tutti valutati al massimo: cento", () => {
    expect(conformita(CASO.map(() => ({ livello: 4, nonApplicabile: false })))).toBe(100);
  });

  it("nessun requisito applicabile: zero, non un errore", () => {
    expect(conformita([{ livello: null, nonApplicabile: true }])).toBe(0);
    expect(conformita([])).toBe(0);
  });
});

describe("livelloMedio · sui soli valutati, e questo e' giusto", () => {
  it("e' 2 sul caso del golden, come nel prototipo", () => {
    // ⚠️ Il livello medio E' una media sui valutati, e non e' un'incoerenza con la
    // regola qui sopra: risponde a un'altra domanda. La conformita' dice «quanto di
    // cio' che e' dovuto e' attuato»; il livello medio dice «dove sta, in media, cio'
    // che abbiamo guardato». Il secondo serve a scegliere l'obiettivo, e mescolarci
    // dentro i requisiti mai guardati lo renderebbe muto.
    expect(livelloMedio(CASO)).toBe(2);
    expect(golden.conformita.livelloMedio).toBe(2);
  });

  it("senza valutazioni e' null, non zero", () => {
    // Zero vuol dire «tutto assente»; qui non si sa niente, ed e' un'altra cosa.
    expect(livelloMedio([{ livello: null, nonApplicabile: false }])).toBeNull();
  });
});

describe("perCapitolo", () => {
  it("i dodici capi del golden, con gli stessi conteggi", () => {
    const capi = golden.conformita.perCapo;
    expect(capi).toHaveLength(12);
    expect(capi.reduce((n, c) => n + c.attivi, 0)).toBe(125);
    expect(capi.reduce((n, c) => n + c.valutati, 0)).toBe(20);
  });

  it("un capo tutto da valutare vale zero, non e' assente", () => {
    const r = perCapitolo([
      { capitolo: "G", valutazioni: [{ livello: 4, nonApplicabile: false }, { livello: null, nonApplicabile: false }] },
      { capitolo: "R", valutazioni: [{ livello: null, nonApplicabile: false }] },
    ]);
    expect(r).toEqual([
      { capitolo: "G", percentuale: 50, attivi: 2, valutati: 1 },
      { capitolo: "R", percentuale: 0, attivi: 1, valutati: 0 },
    ]);
  });
});

describe("scostamenti e priorita'", () => {
  const req = (id: string, crit: "A" | "M", livello: number | null) => ({
    id, critico: crit === "A", valutazione: { livello, nonApplicabile: false },
  });

  it("sono i requisiti valutati SOTTO l'obiettivo, non quelli non valutati", () => {
    // ⚠️ Un requisito mai valutato non e' uno scostamento: e' una lacuna di istruttoria.
    // Metterlo nel piano di adeguamento riempirebbe il piano di centocinque azioni che
    // nessuno ha ancora deciso di dover fare, e il piano diventerebbe illeggibile.
    const s = scostamenti([req("a", "A", 1), req("b", "A", null), req("c", "A", 4)], 3);
    expect(s.map((x) => x.id)).toEqual(["a"]);
  });

  it("dodici sul caso del golden", () => {
    expect(golden.conformita.scostamenti).toBe(12);
    const nostri = scostamenti(
      CASO.map((v, i) => ({ id: String(i), critico: false, valutazione: v })),
      3,
    );
    expect(nostri).toHaveLength(12);
  });

  it.each(golden.conformita.priorita)("$id (crit $crit, livello $livello) → $priorita", (c) => {
    const nostra = priorita({ critico: c.crit === "A", livello: c.livello }, golden.conformita.obiettivo);
    const suo = { "1 · immediata": "immediata", "2 · alta": "alta", "3 · media": "media" }[c.priorita];
    expect(nostra).toBe(suo);
  });

  it("critico a livello 0 o 1 → immediata", () => {
    expect(priorita({ critico: true, livello: 0 }, 3)).toBe("immediata");
    expect(priorita({ critico: true, livello: 1 }, 3)).toBe("immediata");
  });

  it("critico a livello 2 → alta; non critico a scarto 2 → alta", () => {
    expect(priorita({ critico: true, livello: 2 }, 3)).toBe("alta");
    expect(priorita({ critico: false, livello: 1 }, 3)).toBe("alta");
  });

  it("non critico a scarto 1 → media", () => {
    expect(priorita({ critico: false, livello: 2 }, 3)).toBe("media");
  });

  it("chi e' gia' al target non ha priorita'", () => {
    expect(priorita({ critico: true, livello: 3 }, 3)).toBeNull();
    expect(priorita({ critico: true, livello: null }, 3)).toBeNull();
  });

  it("i giorni suggeriti sono quelli del prototipo", () => {
    expect(GIORNI_PER_PRIORITA).toEqual({ immediata: 30, alta: 90, media: 180, programmata: 365 });
    const suoi = golden.conformita.giorniPerPriorita as Record<string, number>;
    expect(suoi["1 · immediata"]).toBe(GIORNI_PER_PRIORITA.immediata);
    expect(suoi["4 · programmata"]).toBe(GIORNI_PER_PRIORITA.programmata);
  });

  it("⚠️ «programmata» esiste ma non si calcola: la sceglie una persona", () => {
    // Nel prototipo `priorita()` non la restituisce mai — e' un'opzione del piano di
    // adeguamento, non un esito del motore. Chi decide di rimandare un adeguamento se ne
    // assume la responsabilita', e il calcolo non gliela toglie.
    //
    // ⚠️ La prima versione di questo test scriveva `tutte.has("programmata")` e il
    // COMPILATORE l'ha respinta: il tipo di ritorno esclude gia' quel valore, quindi la
    // domanda non e' nemmeno esprimibile. La garanzia e' piu' forte di un'asserzione a
    // runtime — vale su tutti gli ingressi, non sui sei che il test prova — e qui resta
    // solo il conto di cio' che davvero esce.
    const tutte = new Set(
      [0, 1, 2, 3, null].flatMap((l) => [true, false].map((c) => priorita({ critico: c, livello: l }, 3))),
    );
    expect([...tutte].sort()).toEqual(["alta", "immediata", "media", null].sort());
  });
});
