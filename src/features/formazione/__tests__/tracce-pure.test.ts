import { describe, expect, it } from "vitest";

import { corsoDelModulo, corsoTrasversale, TRASVERSALI } from "..";
import { chiaveTraccia, traccia, pistaPerSlide } from "../audio";
import { costruisciSlide } from "../presentazione";
import { MODULI_AZIENDA } from "@/features/companies/moduli";

/**
 * Ogni sezione è agganciata alla PROPRIA traccia.
 *
 * ⚠️ QUESTO TEST ESISTE PER NON DOVER APRIRE UN BROWSER. La domanda «ogni traccia è
 * attaccata alla slide giusta» ha due metà, e solo una richiede un browser: che l'audio
 * parta davvero è un fatto del browser e della politica di riproduzione automatica, ma che
 * la sezione X carichi la traccia X è aritmetica, e l'aritmetica si prova in millisecondi
 * su tutte e centosessantotto le sezioni invece che in dieci minuti su trecentootto slide.
 *
 * Il collaudo con Playwright resta e prova l'altra metà su un campione: senza, un audio
 * bloccato dalla CSP passerebbe indisturbato — è già successo col video di benvenuto, dove
 * il controllo diceva verde perché scaricava il file con una `fetch` invece di riprodurlo.
 */

type Caso = { nome: string; sezioni: { id: string }[]; corso: string; idComuni: string[] };

const CASI: Caso[] = [
  ...MODULI_AZIENDA.map((m) => {
    const c = corsoDelModulo(m.href);
    return { nome: m.href, sezioni: c.sezioni, corso: m.href, idComuni: c.idComuni };
  }),
  ...Object.keys(TRASVERSALI).map((k) => {
    const c = corsoTrasversale(k as keyof typeof TRASVERSALI);
    // ⚠️ Il trasversale non ha sezioni comuni: non insegna un percorso, quindi non ha
    // «dove sei» né «come si salva». È il caso che smentisce la regola generale.
    return { nome: k, sezioni: [...c.sezioni], corso: k, idComuni: [] as string[] };
  }),
];

for (const { nome, sezioni, corso, idComuni } of CASI) describe(nome, () => {
  const slide = costruisciSlide(sezioni as never);
  const pista = pistaPerSlide(slide, corso, idComuni);

  it("carica una traccia solo sulla slide che APRE una sezione", () => {
    // Una sezione è una traccia sola: ricaricarla a metà la manderebbe da capo proprio
    // mentre chi ascolta ha capito.
    for (const [k, p] of pista.entries()) {
      if (p.src) expect(slide[k].apreSezione, `slide ${k + 1}`).toBe(true);
    }
  });

  it("aggancia ogni sezione alla PROPRIA traccia, mai a quella di un'altra", () => {
    const coppie = slide
      .map((s, k) => ({ sezione: s.sezione.id, src: pista[k].src }))
      .filter((x) => x.src);

    for (const c of coppie) {
      const attesa = chiaveTraccia(corso, c.sezione, idComuni.includes(c.sezione));
      expect(c.src, `sezione ${c.sezione}`).toBe(`/api/formazione/audio/${attesa}`);
    }
  });

  it("non promette una traccia che il manifesto non ha", () => {
    // Una sorgente verso una chiave inesistente darebbe 404 e un lettore muto senza
    // spiegazione: meglio nessun audio che un audio che non arriva.
    for (const [k, p] of pista.entries()) {
      if (!p.src) continue;
      const chiave = p.src.replace("/api/formazione/audio/", "");
      expect(traccia(chiave), `slide ${k + 1}`).not.toBeNull();
    }
  });

  it("dà a ogni slide un momento crescente dentro la propria sezione", () => {
    // Due slide sullo stesso istante vorrebbero dire che una non compare mai.
    let inizio = 0;
    for (const [k, s] of slide.entries()) {
      if (s.apreSezione) {
        inizio = k;
        continue;
      }
      expect(pista[k].momento, `slide ${k + 1}`).toBeGreaterThan(pista[k - 1].momento);
      expect(pista[k].momento, `slide ${k + 1}`).toBeLessThanOrEqual(pista[inizio].durata);
    }
  });
});
