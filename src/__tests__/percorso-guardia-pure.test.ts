import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { MODULI } from "@/features/companies/moduli";

// Fascia «Azienda»: ogni porta di un percorso passa dalla guardia dei percorsi.
//
// ⚠️ Dimenticarla non produce nessun errore: produce un collaboratore che scrive in un
// percorso che non gli è stato assegnato. È la stessa forma del paywall dimenticato su
// `archiveCompany`, e si previene allo stesso modo — guardando il sorgente.
//
// ⚠️ Lo strato per persona è APPLICATIVO: le policy RLS restano per studio. Lo si dichiara
// qui perché è la guardia a tenerlo in piedi, non il database.

/** Cartella delle azioni → percorsi che deve nominare la guardia. */
const AZIONI: Record<string, string[]> = {
  "src/features/ghg/actions.ts": ["ghg"],
  "src/features/energy/actions.ts": ["energetico"],
  "src/features/report/actions.ts": ["bilancio"],
  "src/features/sgesg/actions.ts": ["sgesg"],
  "src/features/sgesg/schede-actions.ts": ["sgesg"],
  "src/features/supplier/actions.ts": ["fornitore"],
  "src/features/mog231/actions.ts": ["mog231"],
  "src/features/anticorruzione/actions.ts": ["anticorruzione"],
  "src/features/segnalazioni/actions.ts": ["segnalazioni"],
  "src/features/filiera/actions.ts": ["filiera"],
  "src/features/nis2/actions.ts": ["nis2", "sgnis2"],
  "src/features/sgnis2/actions.ts": ["sgnis2"],
  "src/features/gdpr/actions.ts": ["gdpr"],
  "src/features/sgiqas/actions.ts": ["sgiqas"],
  "src/features/sa8000/actions.ts": ["sa8000"],
  "src/features/pas/actions.ts": ["pas24000"],
  "src/features/soa/actions.ts": ["soa"],
};

const leggi = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/** Il corpo di ogni azione esportata, per controllarle una per una. */
function azioni(sorgente: string): { nome: string; corpo: string }[] {
  const parti = sorgente.split(/^export async function /m).slice(1);
  return parti.map((p) => ({ nome: p.slice(0, p.indexOf("(")), corpo: p }));
}

describe("ogni porta di un percorso passa dalla sua guardia", () => {
  it("l'elenco copre tutti i percorsi del registro", () => {
    const coperti = new Set(Object.values(AZIONI).flat());
    expect([...MODULI].filter((m) => !coperti.has(m))).toEqual([]);
  });

  for (const [file, moduli] of Object.entries(AZIONI)) {
    it(`${file}: nessuna azione senza requirePercorso(${moduli.join(", ")})`, () => {
      const s = leggi(file);
      expect(s, "requireConsultant non deve più comparire: lascia entrare chiunque").not.toMatch(/requireConsultant/);
      const chiamata = `requirePercorso(${moduli.map((m) => `"${m}"`).join(", ")})`;
      expect(s).toContain(chiamata);
      // Ogni azione, o passa dalla guardia, o passa da un aiutante che la chiama (GDPR, PAS).
      const aiutante = /async function (\w+)[^{]*\{[^]*?requirePercorso\(/.exec(s.split(/^export async function /m)[0])?.[1];
      for (const a of azioni(s)) {
        const ok = a.corpo.includes("requirePercorso(") || (aiutante && a.corpo.includes(`${aiutante}(`));
        expect(ok, `${a.nome} non passa dalla guardia`).toBeTruthy();
      }
    });
  }

  for (const m of MODULI) {
    it(`la pagina di ${m} ha il layout che risponde «non trovato» a chi non ha il percorso`, () => {
      const f = `src/app/(app)/aziende/[companyId]/${m}/layout.tsx`;
      expect(existsSync(f), `${f} manca`).toBe(true);
      expect(leggi(f)).toContain(`guardiaPercorso("${m}")`);
    });
  }

  it("corpus, documenti e PDF ricavano il percorso dal contenuto", () => {
    const corpus = leggi("src/features/corpus/actions.ts");
    expect(corpus).not.toMatch(/requireConsultant/);
    for (const a of azioni(corpus)) expect(a.corpo, a.nome).toMatch(/requirePercorsoDel(ContentSet|laRiga)\(/);
    expect(leggi("src/features/documents/actions.ts")).toContain("requirePercorsoDelDocumento(tipo)");
    expect(leggi("src/app/api/documenti/[snapshotId]/pdf/route.ts")).toContain("documentoVisibile(");
    expect(leggi("src/app/(document)/documento/[snapshotId]/page.tsx")).toContain("documentoVisibile(");
  });
});
