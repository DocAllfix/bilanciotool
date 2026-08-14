// Il collegamento a scadenza con cui l'azienda cliente scarica i propri documenti.
//
// Qui il collegamento **è** la credenziale: non c'è login a fare da secondo cancello. Le
// prove che seguono difendono le tre cose che rendono accettabile quella scelta — che nel
// database non ci sia mai il token in chiaro, che scada, che si revochi — e l'ordine in cui
// si risponde a chi lo apre.

import { describe, it, expect } from "vitest";
import {
  generaToken,
  improntaToken,
  formaValida,
  statoCollegamento,
  scadenzaFraGiorni,
  DURATE,
  DURATA_PREDEFINITA,
} from "@/features/condivisione/token";

describe("generaToken", () => {
  it("non si ripete", () => {
    const visti = new Set(Array.from({ length: 500 }, () => generaToken()));
    expect(visti.size).toBe(500);
  });

  it("è lungo abbastanza da non poter essere indovinato", () => {
    const t = generaToken();
    expect(t.length).toBeGreaterThanOrEqual(40);
    expect(formaValida(t)).toBe(true);
  });

  it("sta in un indirizzo senza doverlo codificare", () => {
    for (let i = 0; i < 50; i++) {
      const t = generaToken();
      expect(encodeURIComponent(t), "il token non deve cambiare dentro un URL").toBe(t);
    }
  });
});

describe("improntaToken", () => {
  it("dallo stesso token esce sempre la stessa impronta", () => {
    const t = generaToken();
    expect(improntaToken(t)).toBe(improntaToken(t));
  });

  it("da token diversi escono impronte diverse", () => {
    expect(improntaToken(generaToken())).not.toBe(improntaToken(generaToken()));
  });

  it("l'impronta non contiene il token: da lì non si torna indietro", () => {
    const t = generaToken();
    const i = improntaToken(t);
    expect(i).not.toContain(t);
    expect(i).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("formaValida — scartare la spazzatura prima di interrogare il database", () => {
  it("accetta un token vero", () => {
    expect(formaValida(generaToken())).toBe(true);
  });

  it("rifiuta tutto ciò che non ha la forma di un token", () => {
    for (const storto of ["", "corto", "../../etc/passwd", "a".repeat(200), "con spazio", "punto.e.virgola"]) {
      expect(formaValida(storto), `«${storto}»`).toBe(false);
    }
  });
});

describe("statoCollegamento", () => {
  const adesso = new Date("2026-08-07T12:00:00Z");
  const domani = new Date("2026-08-08T12:00:00Z");
  const ieri = new Date("2026-08-06T12:00:00Z");

  it("valido finché non è scaduto e non è stato revocato", () => {
    expect(statoCollegamento({ revokedAt: null, expiresAt: domani }, adesso)).toBe("valido");
  });

  it("scaduto quando la data è passata", () => {
    expect(statoCollegamento({ revokedAt: null, expiresAt: ieri }, adesso)).toBe("scaduto");
  });

  it("scaduto anche nell'istante esatto della scadenza", () => {
    // Il confine si chiude: «scade il 7 agosto» non deve significare «funziona ancora il 7».
    expect(statoCollegamento({ revokedAt: null, expiresAt: adesso }, adesso)).toBe("scaduto");
  });

  it("revocato batte scaduto, e non il contrario", () => {
    // Se rispondesse «scaduto» a un collegamento revocato, lo studio andrebbe a cercare il
    // problema nella data e riaprirebbe l'accesso che aveva appena chiuso.
    expect(statoCollegamento({ revokedAt: ieri, expiresAt: domani }, adesso)).toBe("revocato");
    expect(statoCollegamento({ revokedAt: ieri, expiresAt: ieri }, adesso)).toBe("revocato");
  });
});

describe("scadenzaFraGiorni", () => {
  const da = new Date("2026-08-07T12:00:00Z");

  it("calcola la scadenza dalle durate proposte", () => {
    for (const d of DURATE) {
      const s = scadenzaFraGiorni(d.giorni, da);
      expect(Math.round((s.getTime() - da.getTime()) / 86_400_000)).toBe(d.giorni);
    }
  });

  it("una durata non prevista ricade su quella predefinita", () => {
    // Il valore arriva dal client: 3650 giorni scritti a mano non devono diventare
    // un collegamento che vale dieci anni.
    for (const storto of [3650, 0, -1, 999999]) {
      const s = scadenzaFraGiorni(storto, da);
      expect(Math.round((s.getTime() - da.getTime()) / 86_400_000), `${storto}`).toBe(DURATA_PREDEFINITA);
    }
  });

  it("nessuna durata proposta è eterna", () => {
    for (const d of DURATE) expect(d.giorni).toBeLessThanOrEqual(90);
  });
});
