import { describe, it, expect } from "vitest";
import requisitiCatalogo from "@/lib/db/seeds/data/pas-requisiti.json";
import indicatoriCatalogo from "@/lib/db/seeds/data/pas-indicatori.json";
import politicaCatalogo from "@/lib/db/seeds/data/pas-politica.json";
import gruppiCatalogo from "@/lib/db/seeds/data/pas-gruppi.json";
import { segnali } from "@/lib/calc/pas/segnali";
import { avanzamento } from "@/lib/calc/pas/avanzamento";
import { verifica, type CatalogoVerifica } from "@/lib/calc/pas/verifica";
import { fasciaIndice } from "@/lib/calc/pas/conformita";
import { classe } from "@/lib/calc/pas/rischio";
import { REGISTRI_VUOTI, riesamiDelVerbale, statoRegistri } from "@/lib/calc/pas/registri";
import type { Quadro } from "@/lib/calc/pas/quadro";
import { PARAMETRI_PREDEFINITI, type Rischio } from "@/lib/calc/pas/tipi";

// Gli scenari che l'esempio del prototipo non attraversa: il percorso appena avviato, quello
// pieno di criticità, quello presentabile. Il golden prova che il motore fa ciò che fa il
// prototipo; questi provano i rami che l'esempio non tocca.

const ANNO = 2026;
const OGGI = "2026-10-12";

const CAT: CatalogoVerifica = {
  gruppi: Object.fromEntries(gruppiCatalogo.map((g) => [g.key, g.nome])),
  riferimenti: Object.fromEntries(requisitiCatalogo.map((r) => [r.key, r.riferimento])),
  contenutiPolitica: politicaCatalogo.contenuti,
  indicatori: indicatoriCatalogo.indicatori,
};

const PROFILO_VUOTO = {
  forma: "", piva: "", sede: "", settore: "", ateco: "", ccnl: "", siti: "", campo: "", direzione: "", responsabile: "", rappresentanti: "", contatto: "",
};

function vuoto(): Quadro {
  return {
    profilo: PROFILO_VUOTO,
    parametri: PARAMETRI_PREDEFINITI,
    fattori: [],
    parti: [],
    requisiti: requisitiCatalogo.map((r) => ({ key: r.key, gruppo: r.gruppo })),
    stati: {},
    dettagli: {},
    rischi: [],
    fornitori: [],
    politica: { testo: "", contenuti: [], approvataIl: null, firma: "" },
    contenutiPolitica: politicaCatalogo.contenuti.length,
    obiettivi: [],
    attivita: [],
    misure: {},
    indicatori: indicatoriCatalogo.indicatori.map((k) => k.key),
    registri: REGISTRI_VUOTI,
  };
}

const rischio = (p: number | null, g: number | null, misure = ""): Rischio => ({
  area: "A6", ambito: "O", testo: `Rischio ${p}×${g}`, probabilita: p, gravita: g, misure, responsabile: "",
});

describe("PAS 24000: il percorso appena avviato", () => {
  it("avanzamento zero in ogni parte, senza divisioni per zero", () => {
    const a = avanzamento(vuoto(), ANNO);
    expect([a.organizzazione, a.contesto, a.conformita, a.rischi, a.politica, a.indicatori, a.registri, a.percentuale]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("i segnali sono solo le registrazioni annuali mancanti: nessuna criticità inventata", () => {
    const s = segnali(vuoto(), ANNO, OGGI);
    expect(s.every((x) => x.livello === "A" && x.vista === "reg")).toBe(true);
    expect(s).toHaveLength(5);
  });

  it("la verifica elenca tutto ciò che manca, e non è presentabile", () => {
    const v = verifica(vuoto(), ANNO, OGGI, CAT);
    expect(v.sezioni[0].voci).toHaveLength(10);
    expect(v.sezioni[1].voci).toEqual(["meno di quattro fattori di contesto"]);
    expect(v.sezioni[2].voci).toHaveLength(98);
    expect(v.sezioni[5].voci).toEqual(["nessun fornitore censito"]);
    expect(v.sezioni[6].voci).toContain("meno di tre obiettivi");
    expect(v.sezioni[6].voci).toContain("piano annuale con meno di otto attività");
    expect(v.sezioni[7].voci).toHaveLength(35);
    expect(v.sezioni[8].voci).toHaveLength(7);
    expect(v.presentabile).toBe(false);
  });
});

describe("PAS 24000: tutte le criticità", () => {
  function critico(): Quadro {
    const q = vuoto();
    return {
      ...q,
      stati: { "4.1": "n" },
      rischi: [rischio(5, 5), rischio(null, 3)],
      fornitori: [
        { nome: "Cooperativa", categoria: "Cooperativa di servizi", paese: "Italia", rischio: "Alto", clausola: false, questionario: false, verificatoIl: null, esito: "Critico" },
        { nome: "Senza rischio", categoria: "Servizi", paese: "Italia", rischio: "", clausola: true, questionario: true, verificatoIl: "2026-01-10", esito: "" },
      ],
      misure: {
        [ANNO]: {
          lav_u15: 1, re_min: 1400, re_ccnl: 1545, tratt: 2, rit: 1, cop: 40, lav_tot: 48, ore_max: 66, sett_60: 3, riposi: 4, re_lw: 1650, corr: 1,
        },
      },
      registri: {
        ...REGISTRI_VUOTI,
        reclami: [{ data: "2026-01-10", chiusoIl: null }],
        nonConformita: [{ data: "2026-02-01", scadenza: "2026-03-01", chiusaIl: null, efficacia: "Da verificare" }],
      },
    };
  }

  it("ogni criticità e attenzione del prototipo scatta, nel suo ordine", () => {
    const s = segnali(critico(), ANNO, OGGI).map((x) => `${x.livello} ${x.riferimento}`);
    expect(s).toEqual([
      "C A.3 · 1", "C A.8 · 4", "C A.8 · 10", "A A.8 · 5", "A A.8 · 4", "C A.9 · 2-3", "C A.9 · 3", "A A.9 · 7",
      "A A.8 · 4 nota", "C A.11 · 1", "C Conformità", "A 6.1.2", "A 8.1.3", "C A.1 · 4", "A 10.2", "A A.10",
      "A 8.2", "A 7.4.2", "A 7.4.3", "A 9.2", "A 9.3",
    ]);
  });

  it("la settimana oltre il limite complessivo è criticità, fra ordinario e complessivo attenzione", () => {
    const q = critico();
    const s = segnali({ ...q, misure: { [ANNO]: { ore_max: 52 } } }, ANNO, OGGI);
    expect(s[0]).toMatchObject({ livello: "A", riferimento: "A.9 · 1" });
    expect(s[0].testo).toContain("oltre 48");
  });

  it("un numero decimale nei segnali si scrive con la virgola", () => {
    const s = segnali({ ...vuoto(), misure: { [ANNO]: { ore_max: 61.5 } } }, ANNO, OGGI);
    expect(s[0].testo).toBe("Settimana di 61,5 ore: oltre il limite complessivo di 60");
  });

  it("la verifica conta i rischi da valutare, i rischi alti senza misure e i fornitori senza livello, coi plurali giusti", () => {
    const v = verifica(critico(), ANNO, OGGI, CAT);
    expect(v.sezioni[5].voci).toEqual(["1 rischio da valutare", "senza misure: Rischio 5×5", "1 fornitore senza livello di rischio"]);
    expect(v.criticita).toBeGreaterThan(0);
  });
});

describe("PAS 24000: il percorso presentabile", () => {
  it("tutto valutato, nessuna criticità, registrazioni complete, avanzamento sopra l'85%", () => {
    const q = vuoto();
    const giorno = (m: number) => `${ANNO}-${String(m).padStart(2, "0")}-10`;
    const pieno: Quadro = {
      ...q,
      profilo: Object.fromEntries(Object.keys(PROFILO_VUOTO).map((k) => [k, "compilato"])) as Quadro["profilo"],
      fattori: Array.from({ length: 4 }, (_, i) => ({ tipo: "Interno", descrizione: "Fattore " + i, effetto: "Rischio" })),
      parti: [{ nome: "Lavoratori", esigenze: "Sicurezza", obbligo: true, gestita: true, coinvolgimento: "Riunioni" }],
      stati: Object.fromEntries(requisitiCatalogo.map((r) => [r.key, "c" as const])),
      dettagli: Object.fromEntries(requisitiCatalogo.map((r) => [r.key, { evidenza: "evidenza", azione: "" }])),
      rischi: [rischio(1, 2, "misura")],
      fornitori: [{ nome: "F", categoria: "Servizi", paese: "Italia", rischio: "Basso", clausola: true, questionario: true, verificatoIl: giorno(2), esito: "Adeguato" }],
      politica: { testo: "x".repeat(250), contenuti: politicaCatalogo.contenuti.map((c) => c.key), approvataIl: giorno(1), firma: "Direzione" },
      obiettivi: Array.from({ length: 3 }, (_, i) => ({
        obiettivo: "Obiettivo " + i, area: "A6", indicatore: "i", traguardo: "t", scadenza: giorno(12), responsabile: "r", risorse: "", stato: "In corso",
      })),
      attivita: Array.from({ length: 8 }, (_, i) => ({ attivita: "Attività " + i, mese: i + 1, stato: "Fatto" })),
      misure: { [ANNO]: Object.fromEntries(indicatoriCatalogo.indicatori.map((k) => [k.key, 0])) },
      registri: {
        reclami: [{ data: giorno(3), chiusoIl: giorno(4) }],
        nonConformita: [{ data: giorno(3), scadenza: giorno(5), chiusaIl: giorno(4), efficacia: "Efficace" }],
        formazione: [{ data: giorno(2), partecipanti: 10, ore: 2 }],
        emergenze: [{ data: giorno(5), tipo: "Prova di evacuazione" }],
        comunicazioni: [{ data: giorno(2), tipo: "Interna" }, { data: giorno(11), tipo: "Esterna" }],
        consultazioni: [{ data: giorno(1) }],
        audit: [{ data: giorno(9), stato: "Svolto", rilievi: 2 }],
        riesami: [{ data: giorno(12) }],
      },
    };
    const v = verifica(pieno, ANNO, OGGI, CAT);
    expect(v.criticita).toBe(0);
    expect(v.aperte).toBe(0);
    expect(avanzamento(pieno, ANNO).percentuale).toBe(100);
    expect(v.presentabile).toBe(true);
    expect(statoRegistri(pieno.registri, ANNO, OGGI, 30)).toMatchObject({ rilievi: 2, efficaci: 1, giorniMediChiusura: 31 });
  });
});

describe("PAS 24000: dati incompleti o malformati", () => {
  it("una data in formato italiano non appartiene a nessun esercizio, e non manda in errore niente", () => {
    const r = {
      ...REGISTRI_VUOTI,
      formazione: [{ data: "10/03/2026", partecipanti: 5, ore: 2 }],
      reclami: [{ data: null, chiusoIl: null }],
    };
    const s = statoRegistri(r, ANNO, OGGI, 30);
    expect([s.formazioni, s.orePersona, s.reclami, s.reclamiDaSollecitare]).toEqual([0, 0, 0, 0]);
  });

  it("ore o partecipanti mancanti valgono zero ore-persona, non NaN", () => {
    const r = { ...REGISTRI_VUOTI, formazione: [{ data: "2026-03-10", partecipanti: null, ore: 2 }], audit: [{ data: "2026-05-01", stato: "Svolto", rilievi: null }] };
    const s = statoRegistri(r, ANNO, OGGI, 30);
    expect([s.orePersona, s.rilievi, s.audit]).toEqual([0, 0, 1]);
  });

  it("un catalogo senza contenuti della politica non divide per zero", () => {
    const q = { ...vuoto(), contenutiPolitica: 0, politica: { testo: "x".repeat(250), contenuti: [], approvataIl: null, firma: "" } };
    expect(avanzamento(q, ANNO).politica).toBeCloseTo(0.5 / 3, 12);
  });

  it("i plurali della verifica: più rischi e più fornitori senza livello", () => {
    const q = {
      ...vuoto(),
      rischi: [rischio(null, null), rischio(2, null)],
      fornitori: [
        { nome: "A", categoria: "Servizi", paese: "Italia", rischio: "", clausola: false, questionario: false, verificatoIl: null, esito: "" },
        { nome: "B", categoria: "Servizi", paese: "Italia", rischio: "", clausola: false, questionario: false, verificatoIl: null, esito: "" },
      ],
    };
    expect(verifica(q, ANNO, OGGI, CAT).sezioni[5].voci).toEqual(["2 rischi da valutare", "2 fornitori senza livello di rischio"]);
  });
});

describe("PAS 24000: soglie e ordinamenti", () => {
  it("fasce dell'indice e classi del rischio sulle soglie del prototipo", () => {
    expect([fasciaIndice(null), fasciaIndice(90), fasciaIndice(60), fasciaIndice(59)]).toEqual([null, "buona", "media", "bassa"]);
    expect([classe(null, PARAMETRI_PREDEFINITI), classe(15, PARAMETRI_PREDEFINITI), classe(8, PARAMETRI_PREDEFINITI), classe(7, PARAMETRI_PREDEFINITI)]).toEqual([
      null, "alto", "medio", "basso",
    ]);
  });

  it("riesami: lo stesso giorno due volte non confonde l'ordinamento, e senza data non conta", () => {
    const r = riesamiDelVerbale([{ data: "2026-03-10" }, { data: null }, { data: "2026-03-10" }, { data: "2025-04-01" }], 2026);
    expect(r).toEqual({ corrente: { data: "2026-03-10" }, precedente: { data: "2025-04-01" } });
  });
});
