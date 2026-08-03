import { describe, it, expect } from "vitest";
import {
  computeSoa, fasciaDi, inAmbito, VALORE_STATO, chiaveControllo,
  type Controllo, type Decisione, type StatoAttuazione,
} from "@/lib/calc/soa/scoring";
import { buildPlan, computeUpside } from "@/lib/calc/soa/plan";
import { checkControlli, checkProfilo } from "@/lib/calc/soa/checks";
import CONTROLLI from "@/lib/db/seeds/data/soa-controls.json";
import SEZIONI from "@/lib/db/seeds/data/soa-sections.json";

// Golden estratto dal prototipo `soa-iso27001.html` eseguendone `compute()` sul
// dataset di esempio: 143 controlli in ambito, 141 applicabili, indice 51.

const SEC = SEZIONI as Record<string, { fw: string; n: string }>;
const CATALOGO: Controllo[] = (CONTROLLI as { s: string; id: string; c?: number }[]).map((x) => ({
  frameworkKey: SEC[x.s].fw,
  sectionKey: x.s,
  controlloId: x.id,
  cardine: x.c === 1,
}));
const SEMPRE = new Set(["27001"]);

/** Dataset di esempio del prototipo, riprodotto alla lettera. */
function datasetDemo() {
  const moduli = { "27017": true, "27018": true, "27701A": false, "27701B": true };
  const decisioni: Record<string, Decisione> = {};
  const seq: (StatoAttuazione | "")[] = ["av", "at", "pa", "pl", "nd", "", "at", "pa"];
  inAmbito(CATALOGO, moduli, SEMPRE).forEach((c, i) => {
    const s = seq[i % seq.length];
    decisioni[chiaveControllo(c.frameworkKey, c.controlloId)] = {
      applicabile: true,
      stato: s === "" ? null : s,
      motivazioni: i % 7 !== 3 ? ["rv"] : [],
      responsabile: i % 5 !== 4 ? "Responsabile del SGSI" : null,
      riferimentoDoc:
        (s === "av" || s === "at") && i % 11 !== 5 ? `DOC-${c.controlloId.replace(/\./g, "")}` : null,
    };
  });
  decisioni[chiaveControllo("27001", "8.4")] = {
    applicabile: false,
    stato: null,
    giustificazione: "L'organizzazione non sviluppa software: non esiste codice sorgente proprietario da proteggere.",
  };
  decisioni[chiaveControllo("27001", "8.30")] = { applicabile: false, stato: null };
  return { moduli, decisioni };
}

describe("catalogo dei controlli", () => {
  it("sono 174, ripartiti come le norme prescrivono", () => {
    expect(CATALOGO.length).toBe(174);
    const per = (f: string) => CATALOGO.filter((c) => c.frameworkKey === f).length;
    expect([per("27001"), per("27017"), per("27018"), per("27701A"), per("27701B")])
      .toEqual([93, 7, 25, 31, 18]);
    expect(Object.keys(SEC).length).toBe(21);
    expect(CATALOGO.filter((c) => c.cardine).length).toBe(61);
  });

  it("ogni controllo appartiene a una sezione esistente", () => {
    for (const c of CATALOGO) {
      expect(SEC[c.sectionKey], `${c.controlloId}`).toBeDefined();
      expect(SEC[c.sectionKey].fw).toBe(c.frameworkKey);
    }
  });

  it("i valori di maturità sono quelli del prototipo", () => {
    expect(VALORE_STATO).toEqual({ nd: 0, pl: 20, pa: 55, at: 90, av: 100 });
  });
});

describe("ambito della dichiarazione", () => {
  it("la 27001 è sempre in ambito, gli altri quadri solo se attivati", () => {
    const nessuno = inAmbito(CATALOGO, {}, SEMPRE);
    expect(nessuno.length).toBe(93);
    expect(nessuno.every((c) => c.frameworkKey === "27001")).toBe(true);

    const conCloud = inAmbito(CATALOGO, { "27017": true }, SEMPRE);
    expect(conCloud.length).toBe(100);

    const tutti = inAmbito(CATALOGO, { "27017": true, "27018": true, "27701A": true, "27701B": true }, SEMPRE);
    expect(tutti.length).toBe(174);
  });
});

describe("indice di maturità", () => {
  const { moduli, decisioni } = datasetDemo();
  const esito = computeSoa(CATALOGO, decisioni, moduli, SEMPRE);

  it("riproduce il golden del prototipo", () => {
    expect(esito.totale).toBe(143);
    expect(esito.applicabili).toBe(141);
    expect(esito.esclusi).toBe(2);
    expect(esito.indice).toBe(51);
    expect(esito.conStato).toBe(123);
    expect(esito.attuati).toBe(52);
    expect(esito.pctCompletamento).toBe(87);
  });

  it("i punteggi per quadro sono quelli del prototipo", () => {
    expect(esito.perFramework["27001"]).toEqual({ totale: 93, applicabili: 91, esclusi: 2, punteggio: 50 });
    expect(esito.perFramework["27017"].punteggio).toBe(59);
    expect(esito.perFramework["27018"].punteggio).toBe(49);
    expect(esito.perFramework["27701B"].punteggio).toBe(51);
    // Il modulo non attivo non compare affatto: non vale zero, non esiste.
    expect(esito.perFramework["27701A"]).toBeUndefined();
  });

  it("un controllo applicabile SENZA stato pesa zero, non viene ignorato", () => {
    // È la lettura più fraintendibile del modello e va difesa da un test.
    const due: Controllo[] = [
      { frameworkKey: "27001", sectionKey: "A.5", controlloId: "5.1", cardine: false },
      { frameworkKey: "27001", sectionKey: "A.5", controlloId: "5.2", cardine: false },
    ];
    const conStato = computeSoa(due, {
      "27001|5.1": { applicabile: true, stato: "av" },
      "27001|5.2": { applicabile: true, stato: null },
    }, {}, SEMPRE);
    // 100 e "niente" fanno 50, non 100: mediare sui soli valutati farebbe
    // salire l'indice ignorando i controlli difficili.
    expect(conStato.indice).toBe(50);

    const escluso = computeSoa(due, {
      "27001|5.1": { applicabile: true, stato: "av" },
      "27001|5.2": { applicabile: false, stato: null },
    }, {}, SEMPRE);
    // Escluso e motivato invece esce dal calcolo: 100.
    expect(escluso.indice).toBe(100);
    expect(escluso.esclusi).toBe(1);
  });

  it("senza controlli applicabili l'indice è zero e non NaN", () => {
    const uno: Controllo[] = [{ frameworkKey: "27001", sectionKey: "A.5", controlloId: "5.1", cardine: false }];
    const e = computeSoa(uno, { "27001|5.1": { applicabile: false, stato: null } }, {}, SEMPRE);
    expect(e.indice).toBe(0);
    expect(Number.isNaN(e.indice)).toBe(false);
    expect(e.pctCompletamento).toBe(0);
  });

  it("le fasce di giudizio seguono le soglie del prototipo", () => {
    expect(fasciaDi(0).key).toBe("non_presidiato");
    expect(fasciaDi(29).key).toBe("non_presidiato");
    expect(fasciaDi(30).key).toBe("avvio");
    expect(fasciaDi(54).key).toBe("avvio");
    expect(fasciaDi(55).key).toBe("consolidamento");
    expect(fasciaDi(74).key).toBe("consolidamento");
    expect(fasciaDi(75).key).toBe("maturo");
    expect(fasciaDi(89).key).toBe("maturo");
    expect(fasciaDi(90).key).toBe("pronto");
  });
});

describe("piano di attuazione", () => {
  const { moduli, decisioni } = datasetDemo();
  const esito = computeSoa(CATALOGO, decisioni, moduli, SEMPRE);
  const piano = buildPlan(esito, decisioni);

  it("elenca i soli applicabili non ancora attuati", () => {
    expect(piano.length).toBe(esito.applicabili - esito.attuati);
    expect(piano.every((v) => v.stato !== "at" && v.stato !== "av")).toBe(true);
  });

  it("l'alta priorità va a cardine, senza stato e non attuati", () => {
    for (const v of piano) {
      const attesa = v.cardine || v.stato === null || v.stato === "nd" ? "alta" : "media";
      expect(v.priorita, v.controlloId).toBe(attesa);
    }
    // Le voci di priorità alta stanno tutte prima delle medie.
    const primaMedia = piano.findIndex((v) => v.priorita === "media");
    if (primaMedia >= 0) {
      expect(piano.slice(primaMedia).every((v) => v.priorita === "media")).toBe(true);
    }
  });

  it("il recupero è massimo per i controlli senza stato", () => {
    // 141 applicabili: portare da zero a cento vale 100/141 = 0,7 punti.
    expect(computeUpside(esito, null)).toBe(0.7);
    expect(computeUpside(esito, "nd")).toBe(0.7);
    expect(computeUpside(esito, "av")).toBe(0);
    expect(computeUpside(esito, "at")).toBeCloseTo(0.1, 5);
  });
});

describe("verifiche di coerenza", () => {
  const { moduli, decisioni } = datasetDemo();
  const esito = computeSoa(CATALOGO, decisioni, moduli, SEMPRE);

  it("segnala le esclusioni senza giustificazione", () => {
    const r = checkControlli(esito, decisioni).find((x) => x.key === "esclusioni_senza_giustificazione")!;
    // 8.4 è escluso e motivato, 8.30 escluso e muto.
    expect(r.controlli).toEqual(["8.30"]);
  });

  it("segnala inclusioni senza motivazione, attuati senza documento e controlli muti", () => {
    const r = checkControlli(esito, decisioni);
    const per = (k: string) => r.find((x) => x.key === k)?.controlli.length ?? 0;
    expect(per("inclusioni_senza_motivazione")).toBeGreaterThan(0);
    expect(per("attuati_senza_documento")).toBeGreaterThan(0);
    expect(per("senza_stato")).toBe(esito.applicabili - esito.conStato);
    expect(per("senza_responsabile")).toBeGreaterThan(0);
  });

  it("una dichiarazione completa non produce rilievi", () => {
    const uno: Controllo[] = [{ frameworkKey: "27001", sectionKey: "A.5", controlloId: "5.1", cardine: true }];
    const e = computeSoa(uno, {
      "27001|5.1": {
        applicabile: true, stato: "av", motivazioni: ["rv", "ol"],
        riferimentoDoc: "POL-001", responsabile: "Responsabile del SGSI",
      },
    }, {}, SEMPRE);
    expect(checkControlli(e, {
      "27001|5.1": {
        applicabile: true, stato: "av", motivazioni: ["rv", "ol"],
        riferimentoDoc: "POL-001", responsabile: "Responsabile del SGSI",
      },
    })).toEqual([]);
  });
});

describe("coerenza fra profilo e moduli", () => {
  const base = { moduliAttivi: {}, scope: "Perimetro dichiarato", approvato: "Direzione generale" };

  it("«nessun servizio cloud» NON produce l'avviso sul cloud", () => {
    // Il difetto del prototipo: /cloud/i corrispondeva a "Nessun servizio cloud"
    // e l'avviso compariva proprio a chi aveva dichiarato il contrario.
    const a = checkProfilo({ ...base, ruoloPrivacy: "nessuno", ruoloCloud: "nessuno" });
    expect(a.some((x) => x.key === "cloud_senza_27017")).toBe(false);
    expect(a).toEqual([]);
  });

  it("chi usa il cloud senza il modulo 27017 viene avvisato", () => {
    for (const r of ["cliente", "fornitore", "entrambi"] as const) {
      const a = checkProfilo({ ...base, ruoloPrivacy: "nessuno", ruoloCloud: r });
      expect(a.some((x) => x.key === "cloud_senza_27017"), r).toBe(true);
    }
  });

  it("il fornitore cloud viene indirizzato alla 27018", () => {
    expect(
      checkProfilo({ ...base, ruoloPrivacy: "nessuno", ruoloCloud: "fornitore" })
        .some((x) => x.key === "fornitore_senza_27018"),
    ).toBe(true);
    expect(
      checkProfilo({ ...base, ruoloPrivacy: "nessuno", ruoloCloud: "cliente" })
        .some((x) => x.key === "fornitore_senza_27018"),
    ).toBe(false);
  });

  it("titolare e responsabile richiamano i rispettivi allegati", () => {
    const t = checkProfilo({ ...base, ruoloPrivacy: "titolare", ruoloCloud: "nessuno" });
    expect(t.some((x) => x.key === "titolare_senza_27701a")).toBe(true);
    expect(t.some((x) => x.key === "responsabile_senza_27701b")).toBe(false);

    const e = checkProfilo({ ...base, ruoloPrivacy: "entrambi", ruoloCloud: "nessuno" });
    expect(e.some((x) => x.key === "titolare_senza_27701a")).toBe(true);
    expect(e.some((x) => x.key === "responsabile_senza_27701b")).toBe(true);
  });

  it("segnala anche il caso opposto: moduli accesi senza il ruolo che li giustifica", () => {
    const a = checkProfilo({
      ...base,
      ruoloPrivacy: "nessuno",
      ruoloCloud: "nessuno",
      moduliAttivi: { "27701A": true },
    });
    expect(a.some((x) => x.key === "pims_senza_ruolo")).toBe(true);
  });

  it("perimetro e approvazione mancanti sono rilievi", () => {
    const a = checkProfilo({ ruoloPrivacy: "nessuno", ruoloCloud: "nessuno", moduliAttivi: {}, scope: "  ", approvato: null });
    expect(a.map((x) => x.key).sort()).toEqual(["approvazione_mancante", "scope_mancante"]);
  });
});
