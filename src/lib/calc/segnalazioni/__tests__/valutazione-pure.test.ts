import { describe, it, expect } from "vitest";
import {
  FATTORI_RITORSIONE,
  ammissibilita,
  contattabile,
  livelloRitorsione,
  monitoraggioDovuto,
  punteggioRitorsione,
  type ChiaveRitorsione,
} from "../valutazione";

const TUTTI_SI = { oggetto: "Sì", legittimato: "Sì", contesto: "Sì", elementi: "Sì", nonPersonale: "Sì" };
const sei = (v: Partial<Record<ChiaveRitorsione, string>>) =>
  Object.fromEntries(FATTORI_RITORSIONE.map((f) => [f.chiave, v[f.chiave] ?? "No"])) as Record<
    ChiaveRitorsione,
    string
  >;

describe("ammissibilita'", () => {
  it("tutti e cinque a «Sì» = ammissibile", () => {
    expect(ammissibilita(TUTTI_SI)).toBe("Ammissibile");
  });

  it("finche' manca un elemento l'esito e' `null`, non «inammissibile»", () => {
    // ⚠️ Il terzo stato e' vero. Nel prototipo era la stringa vuota, che nei confronti
    // si comporta come un falso: chi non aveva ancora valutato risultava
    // indistinguibile da chi aveva valutato negativamente.
    expect(ammissibilita({ ...TUTTI_SI, contesto: "" })).toBeNull();
    expect(ammissibilita({})).toBeNull();
    expect(ammissibilita({ ...TUTTI_SI, nonPersonale: null })).toBeNull();
  });

  it("manca SOLO «elementi precisi e concordanti» -> Da integrare", () => {
    // E' l'unica eccezione alla porta AND, e la differenza non e' di sfumatura: una
    // segnalazione da integrare si completa, una inammissibile si archivia — e
    // archiviare cio' che si poteva chiarire toglie la tutela a chi si e' esposto.
    expect(ammissibilita({ ...TUTTI_SI, elementi: "No" })).toBe("Da integrare");
  });

  it("qualunque altro «No» -> inammissibile, anche insieme a «elementi»", () => {
    expect(ammissibilita({ ...TUTTI_SI, oggetto: "No" })).toBe("Inammissibile");
    expect(ammissibilita({ ...TUTTI_SI, legittimato: "No" })).toBe("Inammissibile");
    expect(ammissibilita({ ...TUTTI_SI, elementi: "No", contesto: "No" })).toBe("Inammissibile");
  });
});

describe("rischio di ritorsione", () => {
  it("i pesi sono quelli del prototipo, e i precedenti pesano di piu'", () => {
    expect(punteggioRitorsione(sei({}))).toBe(0);
    expect(punteggioRitorsione(sei({ precedenti: "Sì" }))).toBe(3);
    expect(punteggioRitorsione(sei({ identitaConoscibile: "Sì" }))).toBe(2);
    const tutti = Object.fromEntries(FATTORI_RITORSIONE.map((f) => [f.chiave, "Sì"])) as Record<ChiaveRitorsione, string>;
    expect(punteggioRitorsione(tutti)).toBe(13);
  });

  it("⚠️ un solo «No» non basta a dichiarare il rischio basso", () => {
    // SCOSTAMENTO VOLUTO. Il prototipo considerava valutato un fascicolo in cui anche
    // uno solo dei sei fattori avesse un valore qualsiasi, «No» compreso: rispondere
    // «no» alla prima domanda e lasciare le altre cinque in bianco produceva «Basso»,
    // cioe' un rischio dichiarato basso che nessuno aveva misurato.
    expect(livelloRitorsione({ identitaConoscibile: "No" }, false)).toBeNull();
    expect(livelloRitorsione({}, false)).toBeNull();
    // Cinque su sei non bastano: manca il sesto.
    const cinque = { ...sei({}) } as Record<string, string | null>;
    cinque.giaEsposto = null;
    expect(livelloRitorsione(cinque, false)).toBeNull();
  });

  it("con tutti e sei valutati le soglie sono 4 e 8", () => {
    expect(livelloRitorsione(sei({}), false)).toBe("Basso");
    expect(livelloRitorsione(sei({ identitaConoscibile: "Sì", sovraordinato: "Sì" }), false)).toBe("Medio");
    expect(
      livelloRitorsione(sei({ identitaConoscibile: "Sì", sovraordinato: "Sì", precedenti: "Sì", giaEsposto: "Sì" }), false),
    ).toBe("Alto");
  });

  it("l'anonima con identita' non conoscibile ha il TETTO a Medio", () => {
    // Si conserva, ed e' giusto: se non si puo' risalire alla persona, la ritorsione ha
    // un limite materiale. «Alto» e' irraggiungibile per costruzione, non per svista.
    const quasiTutto = sei({ sovraordinato: "Sì", contestoRistretto: "Sì", precedenti: "Sì", rapportoPrecario: "Sì", giaEsposto: "Sì" });
    expect(punteggioRitorsione(quasiTutto)).toBe(11);
    expect(livelloRitorsione(quasiTutto, true)).toBe("Medio");
    expect(livelloRitorsione(quasiTutto, false)).toBe("Alto");
  });

  it("l'anonima con identita' CONOSCIBILE torna alla scala piena", () => {
    const conIdentita = sei({ identitaConoscibile: "Sì", sovraordinato: "Sì", precedenti: "Sì", giaEsposto: "Sì" });
    expect(livelloRitorsione(conIdentita, true)).toBe("Alto");
  });

  it("il monitoraggio e' dovuto da Medio in su, e un livello ignoto non lo attiva", () => {
    expect(monitoraggioDovuto(sei({}), false)).toBe(false);
    expect(monitoraggioDovuto(sei({ identitaConoscibile: "Sì", sovraordinato: "Sì" }), false)).toBe(true);
    // ⚠️ `null` non attiva il monitoraggio, ma non lo esclude: non si sa ancora, e il
    // quadro deve chiedere di valutare invece di dire che non serve.
    expect(monitoraggioDovuto({}, false)).toBe(false);
  });
});

describe("contattabilita'", () => {
  it("e' asimmetrica di proposito", () => {
    // Non anonima: basta che il recapito non sia un «No» esplicito.
    expect(contattabile({ anonima: false, recapito: null, codice: null })).toBe(true);
    expect(contattabile({ anonima: false, recapito: "No", codice: null })).toBe(false);
    // Anonima: serve un positivo — un codice, oppure un recapito dichiarato.
    expect(contattabile({ anonima: true, recapito: null, codice: null })).toBe(false);
    expect(contattabile({ anonima: true, recapito: null, codice: "A7X2" })).toBe(true);
    expect(contattabile({ anonima: true, recapito: "Sì", codice: null })).toBe(true);
  });
});
