import { describe, it, expect } from "vitest";
import requisitiCatalogo from "@/lib/db/seeds/data/gdpr-requisiti.json";
import indicatoriCatalogo from "@/lib/db/seeds/data/gdpr-indicatori.json";
import politicaCatalogo from "@/lib/db/seeds/data/gdpr-politica.json";
import gruppiCatalogo from "@/lib/db/seeds/data/gdpr-gruppi.json";
import { segnali } from "@/lib/calc/gdpr/segnali";
import { avanzamento } from "@/lib/calc/gdpr/avanzamento";
import { verifica } from "@/lib/calc/gdpr/verifica";
import { conformita, fasciaIndice } from "@/lib/calc/gdpr/conformita";
import { giorniDiRiscontro, oreAllaNotifica, statoViolazione, annoViolazione, annoDi } from "@/lib/calc/gdpr/termini";
import { statoRegistri, REGISTRI_VUOTI } from "@/lib/calc/gdpr/registri";
import { statoRegistro } from "@/lib/calc/gdpr/registro";
import type { Quadro, Profilo } from "@/lib/calc/gdpr/quadro";
import { PARAMETRI_PREDEFINITI, type Trattamento, type Fornitore, type Violazione } from "@/lib/calc/gdpr/tipi";

// Gli scenari che l'esempio del prototipo non tocca: il percorso appena aperto, ogni
// segnale acceso da solo, e il percorso completo che la verifica deve dichiarare
// «dimostrabile». Il golden prova che diciamo le stesse cose del prototipo; questi
// provano che le diciamo anche nei casi che il suo esempio non mostrava.

const ANNO = 2026;
const OGGI = "2026-10-12";
const ADESSO = new Date("2026-10-12T10:00:00.000Z");
const T = { oggi: OGGI, adesso: ADESSO };
const CAT = {
  gruppi: Object.fromEntries(gruppiCatalogo.map((g) => [g.key, g.nome])),
  riferimenti: Object.fromEntries(requisitiCatalogo.map((r) => [r.key, r.riferimento])),
  contenutiPolitica: politicaCatalogo.contenuti,
  indicatori: indicatoriCatalogo.indicatori,
};
const INDICATORI = indicatoriCatalogo.indicatori.map((k) => k.key);

const PROFILO_VUOTO: Profilo = {
  forma: "", sede: "", settore: "", ateco: "", dipendenti: "", legale: "", referente: "", contatto: "",
  amministratori: "", dpoA: "", dpoB: "", dpoC: "", dpoNome: "", dpoComunicatoIl: null,
};

function vuoto(): Quadro {
  return {
    profilo: PROFILO_VUOTO,
    parametri: PARAMETRI_PREDEFINITI,
    trattamenti: [],
    fornitori: [],
    requisiti: requisitiCatalogo.map((r) => ({ key: r.key, gruppo: r.gruppo })),
    stati: {},
    dettagli: {},
    politica: { testo: "", contenuti: [], approvataIl: null },
    contenutiPolitica: politicaCatalogo.contenuti.length,
    documenti: [],
    attivita: [],
    misure: {},
    indicatori: INDICATORI,
    registri: REGISTRI_VUOTI,
  };
}

const TRATTAMENTO: Trattamento = {
  nome: "Paghe", finalita: "Paghe", base: "Obbligo legale (6.1.c)", bilanciamento: "", interessati: "Dipendenti",
  dati: "Anagrafici", particolari: false, condizione9: "", destinatari: "Studio paghe", trasferimento: false,
  conservazione: "10 anni", misure: "Utenze individuali", criteri: [], probabilita: 2, gravita: 2, mitigazione: "",
  dpiaStato: "Da avviare", dpiaEsito: "",
};
const FORNITORE: Fornitore = {
  nome: "Studio paghe", qualifica: "Responsabile (art. 28)", contratto: "Sì", garanzia: "Nessun trasferimento",
  verificatoIl: "2026-03-01", esito: "Adeguato",
};
const testi = (q: Quadro) => segnali(q, ANNO, T).map((s) => s.testo);
const con = (q: Quadro, testo: string | RegExp) => testi(q).some((t) => (typeof testo === "string" ? t === testo : testo.test(t)));

describe("il percorso appena aperto", () => {
  it("segnali: registro vuoto, obbligo DPO non valutato, nessuna registrazione", () => {
    const s = segnali(vuoto(), ANNO, T);
    expect(s.map((x) => x.testo)).toEqual([
      "Registro dei trattamenti vuoto",
      "Obbligo di designare il responsabile della protezione dei dati non ancora valutato",
      "Nessuna formazione registrata nel 2026",
      "Nessun audit o verifica svolti nel 2026",
      "Riesame annuale non ancora svolto nel 2026",
    ]);
  });

  it("avanzamento a zero in ogni parte, e nessuna divisione per zero", () => {
    const a = avanzamento(vuoto(), ANNO, OGGI, ADESSO);
    expect([a.organizzazione, a.trattamenti, a.conformita, a.rischi, a.politica, a.indicatori, a.registri, a.percentuale]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("verifica: ogni sezione elenca ciò che manca, nulla è dimostrabile", () => {
    const v = verifica(vuoto(), ANNO, T, CAT);
    const per = Object.fromEntries(v.sezioni.map((s) => [s.titolo, s.voci]));
    expect(per["Organizzazione e ruoli"]).toHaveLength(10);
    expect(per["Registro dei trattamenti"]).toEqual(["nessun trattamento censito"]);
    expect(per["Requisiti da valutare"]).toHaveLength(requisitiCatalogo.length);
    expect(per["Responsabili e trasferimenti"]).toEqual(["nessun fornitore censito"]);
    expect(per[`Indicatori dell'esercizio ${ANNO}`]).toHaveLength(INDICATORI.length);
    expect(v.dimostrabile).toBe(false);
  });

  it("indice di conformità assente, non zero", () => {
    expect(conformita([]).indice).toBeNull();
    expect(fasciaIndice(null)).toBeNull();
  });
});

describe("ogni segnale si accende da solo", () => {
  it("trattamenti senza base, senza condizione 9.2, senza conservazione", () => {
    const q = vuoto();
    q.trattamenti = [{ ...TRATTAMENTO, base: "", particolari: true, condizione9: "", conservazione: " " }];
    expect(con(q, "Trattamenti senza base giuridica: 1")).toBe(true);
    expect(con(q, "Categorie particolari di dati senza condizione dell'art. 9.2: 1")).toBe(true);
    expect(con(q, "Trattamenti senza termine di conservazione: 1")).toBe(true);
  });

  it("valutazione d'impatto mancante, consultazione preventiva al singolare e al plurale, rischio alto scoperto", () => {
    const q = vuoto();
    const nec = { ...TRATTAMENTO, criteri: ["monit", "vuln"], probabilita: 5, gravita: 4 };
    q.trattamenti = [{ ...nec, dpiaEsito: "Consultazione preventiva del Garante" }];
    expect(con(q, "Valutazioni d'impatto necessarie e non concluse: 1")).toBe(true);
    expect(con(q, "Rischio residuo elevato: consultazione preventiva del Garante per 1 trattamento")).toBe(true);
    expect(con(q, "Rischi alti senza misure di mitigazione: 1")).toBe(true);
    q.trattamenti = [q.trattamenti[0], { ...q.trattamenti[0], nome: "Altro", dpiaStato: "Conclusa", mitigazione: "Misure" }];
    expect(con(q, "Rischio residuo elevato: consultazione preventiva del Garante per 2 trattamenti")).toBe(true);
    expect(con(q, "Valutazioni d'impatto necessarie e non concluse: 1")).toBe(true);
  });

  it("fornitori: contratto mancante, garanzia da definire, deroga, esito critico", () => {
    const q = vuoto();
    q.fornitori = [
      { ...FORNITORE, nome: "A", contratto: "No" },
      { ...FORNITORE, nome: "B", garanzia: "Da definire" },
      { ...FORNITORE, nome: "C", garanzia: "Deroga art. 49" },
      { ...FORNITORE, nome: "D", esito: "Critico" },
    ];
    expect(con(q, "Responsabili senza contratto ai sensi dell'art. 28: 1")).toBe(true);
    expect(con(q, "Trasferimenti fuori dallo Spazio economico europeo senza garanzia definita: 1")).toBe(true);
    expect(con(q, "Trasferimenti fondati su una deroga: verifica che siano occasionali (1)")).toBe(true);
    expect(con(q, "Responsabili con esito critico alla verifica: 1")).toBe(true);
  });

  it("responsabile della protezione dei dati: obbligatorio e mancante, poi designato e non comunicato", () => {
    const q = vuoto();
    q.profilo = { ...PROFILO_VUOTO, dpoA: "Sì", dpoB: "No", dpoC: "No" };
    expect(con(q, "Responsabile della protezione dei dati obbligatorio e non designato")).toBe(true);
    q.profilo = { ...q.profilo, dpoNome: "Studio DPO" };
    expect(con(q, "Dati di contatto del responsabile della protezione dei dati non comunicati al Garante")).toBe(true);
    q.profilo = { ...q.profilo, dpoComunicatoIl: "2026-01-10" };
    expect(con(q, /responsabile della protezione dei dati/)).toBe(false);
  });

  it("richieste scadute e fuori termine; violazioni scadute, in corso, in ritardo, elevate non comunicate", () => {
    const q = vuoto();
    const v = (x: Partial<Violazione>): Violazione => ({
      conoscenzaIl: null, rischio: "Rischio", notificataIl: null, comunicataIl: null, chiusaIl: null, interessati: null, ...x,
    });
    q.registri = {
      ...REGISTRI_VUOTI,
      richieste: [
        { ricevutaIl: "2026-08-01", proroga: false, riscontroIl: null },
        { ricevutaIl: "2026-01-10", proroga: false, riscontroIl: "2026-03-01" },
      ],
      violazioni: [
        v({ conoscenzaIl: "2026-10-01T08:00:00.000Z" }),
        v({ conoscenzaIl: "2026-10-11T08:00:00.000Z" }),
        v({ conoscenzaIl: "2026-05-01T08:00:00.000Z", notificataIl: "2026-05-06T08:00:00.000Z", chiusaIl: "2026-05-20" }),
        v({ conoscenzaIl: "2026-06-01T08:00:00.000Z", rischio: "Rischio elevato", notificataIl: "2026-06-02T08:00:00.000Z", chiusaIl: "2026-06-20" }),
      ],
    };
    expect(con(q, "Richieste degli interessati scadute senza riscontro: 1")).toBe(true);
    expect(con(q, "Richieste riscontrate oltre il termine nel 2026: 1")).toBe(true);
    expect(con(q, "Violazioni a rischio non notificate entro 72 ore: 1")).toBe(true);
    expect(con(q, "Violazioni da notificare al Garante con termine in corso: 1")).toBe(true);
    expect(con(q, "Violazioni notificate oltre le 72 ore nel 2026: il ritardo va motivato (1)")).toBe(true);
    expect(con(q, "Violazioni a rischio elevato non comunicate agli interessati: 1")).toBe(true);
    const g = statoRegistri(q.registri, ANNO, OGGI, ADESSO);
    expect([g.violazioniAperte, g.giorniMedi]).toEqual([2, 50]);
  });

  it("requisiti non conformi e documenti da aggiornare o scaduti", () => {
    const q = vuoto();
    q.stati = { "P-01": "n" };
    q.documenti = [
      { tipo: "Procedura", oggetto: "A", stato: "Da aggiornare", revisioneIl: null },
      { tipo: "Procedura", oggetto: "B", stato: "Adottato", revisioneIl: "2026-01-01" },
      { tipo: "Procedura", oggetto: "C", stato: "Adottato", revisioneIl: "2027-01-01" },
    ];
    expect(con(q, "Requisiti valutati non conformi: 1")).toBe(true);
    expect(con(q, "Documenti da aggiornare o con revisione scaduta: 2")).toBe(true);
  });

  it("indicatori: sanzioni, consensi, cifratura, prova di ripristino", () => {
    const q = vuoto();
    q.misure = { [ANNO]: { sanz: 1, cont: 100, cons_doc: 90, disp: 10, disp_cif: 7, bk_test: 0 } };
    expect(con(q, "Sanzioni o provvedimenti correttivi ricevuti: 1")).toBe(true);
    expect(con(q, "Contatti promozionali senza consenso o base documentata: 10")).toBe(true);
    expect(con(q, "Portatili e dispositivi mobili non cifrati: 3")).toBe(true);
    expect(con(q, "Nessuna prova di ripristino delle copie di sicurezza nel 2026")).toBe(true);
  });

  it("amministratori di sistema presenti e mai verificati nell'esercizio", () => {
    const q = vuoto();
    q.profilo = { ...PROFILO_VUOTO, amministratori: "Sì" };
    expect(con(q, "Verifica annuale degli amministratori di sistema non registrata nel 2026")).toBe(true);
  });
});

describe("il percorso completo", () => {
  function completo(): Quadro {
    const q = vuoto();
    q.profilo = {
      forma: "S.r.l.", sede: "Bari", settore: "Meccanica", ateco: "25.62", dipendenti: "48", legale: "AU", referente: "HSE",
      contatto: "privacy@x.example", amministratori: "Sì", dpoA: "No", dpoB: "No", dpoC: "No", dpoNome: "", dpoComunicatoIl: null,
    };
    q.trattamenti = [TRATTAMENTO, { ...TRATTAMENTO, nome: "Clienti" }, { ...TRATTAMENTO, nome: "Fornitori" }];
    q.fornitori = [FORNITORE];
    q.stati = Object.fromEntries(requisitiCatalogo.map((r) => [r.key, "c" as const]));
    q.dettagli = Object.fromEntries(requisitiCatalogo.map((r) => [r.key, { evidenza: "Documento", azione: "" }]));
    q.politica = { testo: "x".repeat(250), contenuti: politicaCatalogo.contenuti.map((c) => c.key), approvataIl: "2026-01-15" };
    q.documenti = Array.from({ length: 6 }, (_, i) => ({ tipo: "Procedura", oggetto: "Doc " + i, stato: "Adottato" as const, revisioneIl: "2027-12-31" }));
    q.attivita = Array.from({ length: 8 }, (_, i) => ({ attivita: "Attività " + i, mese: i + 1, stato: "Fatto" as const }));
    // Tutti compilati; sanzioni, reclami, ispezioni e contenziosi a zero (un percorso
    // «completo» con una sanzione in corso non sarebbe dimostrabile, ed è giusto così).
    const zero = new Set(["sanz", "recl", "garante", "liti"]);
    q.misure = { [ANNO]: Object.fromEntries(INDICATORI.map((k) => [k, zero.has(k) ? 0 : 1])) };
    q.registri = {
      ...REGISTRI_VUOTI,
      formazione: [{ data: "2026-03-18", partecipanti: 20, ore: 2 }],
      verifiche: [{ data: "2026-05-22", tipo: "Prova di ripristino", stato: "Svolto", rilievi: 0 }],
      verificheAds: [{ data: "2026-06-30" }],
      riesami: [{ data: "2026-09-30" }],
    };
    return q;
  }

  it("avanzamento al 100% e verifica «dimostrabile», senza criticità", () => {
    const q = completo();
    expect(avanzamento(q, ANNO, OGGI, ADESSO).percentuale).toBe(100);
    const v = verifica(q, ANNO, T, CAT);
    expect(v.aperte).toBe(0);
    expect(v.criticita).toBe(0);
    expect(v.dimostrabile).toBe(true);
    expect(segnali(q, ANNO, T)).toEqual([]);
  });

  it("una sola non conformità basta a togliere «dimostrabile»", () => {
    const q = completo();
    q.stati = { ...q.stati, "S-10": "n" };
    q.dettagli = { ...q.dettagli, "S-10": { evidenza: "", azione: "" } };
    const v = verifica(q, ANNO, T, CAT);
    expect(v.dimostrabile).toBe(false);
    expect(v.sezioni.find((s) => s.titolo === "Requisiti da adeguare senza azione definita")?.voci).toEqual(["Sicurezza del trattamento 32 · log"]);
  });

  it("l'obbligo del DPO che ricorre senza designato è una voce della verifica", () => {
    const q = completo();
    q.profilo = { ...q.profilo, dpoB: "Sì" };
    const v = verifica(q, ANNO, T, CAT);
    expect(v.sezioni[0].voci).toEqual(["designazione del responsabile della protezione dei dati"]);
  });
});

describe("aritmetica dei termini, casi di margine", () => {
  it("giorni di riscontro e ore alla notifica: null se manca un capo, mai negativi", () => {
    expect(giorniDiRiscontro({ ricevutaIl: "2026-03-10", proroga: false, riscontroIl: null })).toBeNull();
    expect(giorniDiRiscontro({ ricevutaIl: "2026-03-10", proroga: false, riscontroIl: "2026-03-01" })).toBe(0);
    const v: Violazione = { conoscenzaIl: "2026-07-02T06:15:00.000Z", rischio: "Rischio", notificataIl: "2026-07-04T14:00:00.000Z", comunicataIl: null, chiusaIl: null, interessati: 1 };
    expect(oreAllaNotifica(v)).toBe(56);
    expect(oreAllaNotifica({ ...v, notificataIl: null })).toBeNull();
    expect(statoViolazione({ ...v, conoscenzaIl: null }, ADESSO)).toBeNull();
    expect(annoViolazione({ conoscenzaIl: null })).toBeNull();
    expect(annoViolazione({ conoscenzaIl: "non è una data" })).toBeNull();
    expect(annoDi("31/12/2026")).toBeNull();
    expect(fasciaIndice(95)).toBe("buona");
    expect(fasciaIndice(70)).toBe("media");
    expect(fasciaIndice(10)).toBe("bassa");
  });

  it("il registro con un legittimo interesse bilanciato non chiede niente", () => {
    const s = statoRegistro([{ ...TRATTAMENTO, base: "Legittimo interesse (6.1.f)", bilanciamento: "Sì" }], PARAMETRI_PREDEFINITI);
    expect(s.senzaBilanciamento).toEqual([]);
  });
});
