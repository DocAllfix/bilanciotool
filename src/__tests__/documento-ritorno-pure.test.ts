import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TIPI_DOCUMENTO } from "@/features/documents/tipi";
import { MODULI_AZIENDA, moduloDelDocumento, ritornoDelDocumento } from "@/features/companies/moduli";

// «Torna al percorso» sul documento pubblicato.
//
// ⚠️ IL DIFETTO. Il pulsante faceva `router.back()`, e il documento si apre IN UNA SCHEDA
// NUOVA (`window.open(…, "_blank")`): una scheda nuova non ha cronologia, quindi il
// pulsante non faceva niente — su tutti e ventidue i tipi di documento, perché il
// componente è uno solo. Segnalato dal committente guardando il bilancio.
//
// Ora il pulsante è un collegamento vero, calcolato dal server dal registro dei moduli.

const CO = "00000000-0000-0000-0000-000000000001";

describe("il ritorno dal documento", () => {
  it("⚠️ ogni tipo di documento torna al percorso che lo produce", () => {
    // Un tipo che nessun modulo dichiara tornerebbe all'archivio in silenzio: chi aggiunge
    // un documento a un percorso e dimentica di dirlo al registro lo scopre qui.
    const orfani = TIPI_DOCUMENTO.filter((t) => moduloDelDocumento(t) === null);
    expect(orfani, "tipi che nessun percorso dichiara di produrre").toEqual([]);
  });

  it("porta all'azienda del documento, sotto il segmento del modulo", () => {
    for (const t of TIPI_DOCUMENTO) {
      const m = moduloDelDocumento(t)!;
      const r = ritornoDelDocumento(CO, t, 2025);
      expect(r.href.startsWith(`/aziende/${CO}/${m}`), `${t} -> ${r.href}`).toBe(true);
      expect(r.etichetta).toBe("Torna al percorso");
    }
  });

  it("⚠️ i percorsi per esercizio tornano a QUELL'esercizio, non all'ultimo aperto", () => {
    // Chi rilegge il bilancio 2024 e torna indietro vuole il 2024.
    for (const m of MODULI_AZIENDA.filter((x) => x.perEsercizio)) {
      for (const t of m.documenti) {
        expect(ritornoDelDocumento(CO, t, 2024).href).toBe(`/aziende/${CO}/${m.href}/2024`);
      }
    }
  });

  it("i documenti senza esercizio (anno 0) non finiscono su «/0»", () => {
    for (const m of MODULI_AZIENDA.filter((x) => !x.perEsercizio)) {
      for (const t of m.documenti) {
        expect(ritornoDelDocumento(CO, t, 0).href).toBe(`/aziende/${CO}/${m.href}`);
      }
    }
  });

  it("⚠️ la barra del documento non torna a `router.back()`", () => {
    // Un controllo sul sorgente, perché il difetto è di quelli che si reintroducono
    // «semplificando»: `router.back()` sembra la cosa naturale da scrivere su un pulsante
    // che dice «torna», e in una scheda nuova non fa niente.
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/documento/doc-toolbar.tsx"), "utf8");
    const codice = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(codice).not.toMatch(/router\.back\(\)|history\.back\(\)/);
    expect(codice).toMatch(/href=\{ritorno\.href\}/);
  });
});
