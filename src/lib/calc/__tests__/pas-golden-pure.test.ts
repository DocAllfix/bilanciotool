import { describe, it, expect } from "vitest";
import golden from "./pas-golden.json";
import requisitiCatalogo from "@/lib/db/seeds/data/pas-requisiti.json";
import indicatoriCatalogo from "@/lib/db/seeds/data/pas-indicatori.json";
import politicaCatalogo from "@/lib/db/seeds/data/pas-politica.json";
import gruppiCatalogo from "@/lib/db/seeds/data/pas-gruppi.json";
import { conformita } from "@/lib/calc/pas/conformita";
import { livello, statoRischi } from "@/lib/calc/pas/rischio";
import { statoFornitori } from "@/lib/calc/pas/fornitori";
import { statoRegistri } from "@/lib/calc/pas/registri";
import { derivati } from "@/lib/calc/pas/indicatori";
import { segnali } from "@/lib/calc/pas/segnali";
import { avanzamento } from "@/lib/calc/pas/avanzamento";
import { verifica } from "@/lib/calc/pas/verifica";
import { statiDelCatalogo, type Quadro } from "@/lib/calc/pas/quadro";
import { PARAMETRI_PREDEFINITI, type Ambito, type StatoRequisito } from "@/lib/calc/pas/tipi";

// Il golden lo produce il PROTOTIPO, eseguito (`scripts/golden-pas.mjs`). Qui il suo dataset
// si traduce UNA VOLTA nei nostri tipi, e ogni risultato del nostro motore si confronta con
// quello del prototipo. Dove i due divergono di proposito, il test lo dice per nome e verifica
// entrambi i numeri: una divergenza che nessuno dichiara è un difetto.

type Proto = typeof golden.dataset;
const D: Proto = golden.dataset;
const R = golden.risultati;
const ANNO = golden.anno;
const OGGI = "2026-10-12";

const numero = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
const data = (v: unknown) => (typeof v === "string" && v ? v : null);
type Riga = Record<string, unknown>;

function quadro(): Quadro {
  const p = D.profilo;
  const misure: Record<number, Record<string, number | null>> = {};
  for (const [anno, valori] of Object.entries(D.dati)) {
    misure[Number(anno)] = Object.fromEntries(Object.entries(valori as Record<string, unknown>).map(([k, v]) => [k, numero(v)]));
  }
  const reg = D.registri as unknown as Record<string, Riga[]>;
  return {
    profilo: {
      forma: p.forma, piva: p.piva, sede: p.sede, settore: p.settore, ateco: p.ateco, ccnl: p.ccnl, siti: p.siti, campo: p.campo,
      direzione: p.dir, responsabile: p.rsgs, rappresentanti: p.rlav, contatto: p.contatto,
    },
    parametri: {
      oreOrdinarie: D.param.ore_ord, oreTotali: D.param.ore_tot, settimane: D.param.sett,
      alto: D.param.alto, medio: D.param.medio, giorniReclamo: D.param.gg_recl,
    },
    fattori: D.contesto.fattori.map((f) => ({ tipo: f.tipo, descrizione: f.desc, effetto: f.eff })),
    parti: D.contesto.parti.map((x) => ({ nome: x.nome, esigenze: x.esig, obbligo: x.obb === "Sì", gestita: x.sgs === "Sì", coinvolgimento: x.mod })),
    requisiti: requisitiCatalogo.map((r) => ({ key: r.key, gruppo: r.gruppo })),
    stati: Object.fromEntries(Object.entries(D.gap as Record<string, { st: string }>).map(([k, v]) => [k, (v.st || null) as StatoRequisito | null])),
    dettagli: Object.fromEntries(
      Object.entries(D.gap as Record<string, { ev?: string; az?: string }>).map(([k, v]) => [k, { evidenza: v.ev ?? "", azione: v.az ?? "" }]),
    ),
    rischi: D.rischi.map((r) => ({
      area: r.a, ambito: r.amb as Ambito, testo: r.t, probabilita: numero(r.p), gravita: numero(r.g), misure: r.mis, responsabile: r.resp,
    })),
    fornitori: D.fornitori.map((f) => ({
      nome: f.nome, categoria: f.cat, paese: f.paese, rischio: f.rischio, clausola: f.claus === "Sì", questionario: f.quest === "Sì",
      verificatoIl: data(f.ver), esito: f.esito,
    })),
    politica: {
      testo: D.politica.testo,
      contenuti: Object.entries(D.politica.chk as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k),
      approvataIl: data(D.politica.data),
      firma: D.politica.firma,
    },
    contenutiPolitica: politicaCatalogo.contenuti.length,
    obiettivi: D.obiettivi.map((o) => ({
      obiettivo: o.ob, area: o.area, indicatore: o.ind, traguardo: o.target, scadenza: data(o.scad), responsabile: o.resp, risorse: o.ris, stato: o.stato,
    })),
    attivita: D.piano.map((x) => ({ attivita: x.att, mese: Number(x.mese), stato: x.stato })),
    misure,
    indicatori: indicatoriCatalogo.indicatori.map((k) => k.key),
    registri: {
      reclami: reg.recl.map((r) => ({ data: data(r.data), chiusoIl: data(r.chiusura) })),
      nonConformita: reg.nc.map((r) => ({ data: data(r.data), scadenza: data(r.scad), chiusaIl: data(r.chiusura), efficacia: String(r.eff ?? "") })),
      formazione: reg.form.map((r) => ({ data: data(r.data), partecipanti: numero(r.part), ore: numero(r.ore) })),
      emergenze: reg.emer.map((r) => ({ data: data(r.data), tipo: String(r.tipo ?? "") })),
      comunicazioni: reg.com.map((r) => ({ data: data(r.data), tipo: String(r.tipo ?? "") })),
      consultazioni: reg.cons.map((r) => ({ data: data(r.data) })),
      audit: reg.audit.map((r) => ({ data: data(r.data), stato: String(r.stato ?? ""), rilievi: numero(r.ril) })),
      riesami: reg.ries.map((r) => ({ data: data(r.data) })),
    },
  };
}

const Q = quadro();

describe("PAS 24000: il motore contro il prototipo eseguito", () => {
  it("il golden è quello atteso: l'esempio del prototipo, nel 2026", () => {
    expect(ANNO).toBe(2026);
    expect(Q.requisiti).toHaveLength(98);
    expect(Q.rischi).toHaveLength(20);
    expect(Q.fornitori).toHaveLength(6);
    expect(Q.parametri).toEqual(PARAMETRI_PREDEFINITI);
  });

  it("conformità: i conteggi coincidono, l'indice DIVERGE di proposito (93 → 89)", () => {
    const c = conformita(statiDelCatalogo(Q));
    const g = R.conf;
    expect([c.totale, c.valutati, c.conformi, c.parziali, c.nonConformi, c.nonPertinenti, c.daValutare]).toEqual([g.tot, g.val, g.c, g.p, g.n, g.na, g.da]);
    // Il prototipo media i soli valutati: (77 + 10 × 0,5) ÷ 88 = 93.
    expect(g.pct).toBe(93);
    // Qui i quattro mai valutati pesano zero: (77 × 100 + 10 × 50) ÷ 92 = 89.
    expect(c.indice).toBe(89);
  });

  it("conformità per gruppo: conteggi uguali in tutti e diciotto i gruppi", () => {
    expect(Object.keys(R.confPerGruppo)).toHaveLength(18);
    for (const [gruppo, g] of Object.entries(R.confPerGruppo)) {
      const c = conformita(statiDelCatalogo(Q, gruppo));
      expect([c.totale, c.conformi, c.parziali, c.nonConformi, c.nonPertinenti, c.daValutare], gruppo).toEqual([g.tot, g.c, g.p, g.n, g.na, g.da]);
    }
  });

  it("conformità per gruppo: un gruppo mai valutato è «—» nel prototipo, zero qui solo se c'è qualcosa da pesare", () => {
    // C10 e A11 non sono mai stati valutati nell'esempio: il prototipo li mostra come «—».
    expect(R.confPerGruppo.C10.val).toBe(0);
    expect(conformita(statiDelCatalogo(Q, "C10")).indice).toBeNull();
  });

  it("rischi: livelli, classi e alti scoperti", () => {
    Q.rischi.forEach((r, i) => expect(livello(r) ?? 0, r.testo).toBe(R.livelli[i]));
    const s = statoRischi(Q.rischi, Q.parametri);
    const g = R.rischiStat;
    expect([s.totale, s.valutati, s.alti, s.medi, s.bassi]).toEqual([g.tot, g.val, g.alti, g.medi, g.bassi]);
    expect(s.altiScoperti).toEqual(g.scoperti);
  });

  it("fornitori: clausole, questionari, verifiche, quote", () => {
    const s = statoFornitori(Q.fornitori);
    const g = R.fornStat;
    expect([s.fornitori, s.conClausola, s.conQuestionario, s.alti, s.valutati, s.critici]).toEqual([g.n, g.claus, g.quest, g.alti, g.val, g.critici]);
    expect(s.altiMaiVerificati).toEqual(g.scoperti);
    expect([s.quotaClausola, s.quotaQuestionario, s.quotaVerificati]).toEqual([g.pClaus, g.pQuest, g.pVer]);
  });

  it("registri dell'esercizio e del precedente", () => {
    for (const [anno, g] of [[ANNO, R.regStat], [ANNO - 1, R.regStatPrec]] as const) {
      const s = statoRegistri(Q.registri, anno, OGGI, Q.parametri.giorniReclamo);
      expect(
        [s.reclami, s.reclamiChiusi, s.giorniMediChiusura ?? 0, s.reclamiDaSollecitare, s.nonConformita, s.nonConformitaChiuse,
         s.nonConformitaAperte, s.azioniScadute, s.efficaci, s.formazioni, s.orePersona, s.prove, s.emergenze,
         s.comunicazioniInterne, s.comunicazioniEsterne, s.consultazioni, s.audit, s.auditPianificati, s.rilievi, s.riesami],
        String(anno),
      ).toEqual([
        g.recl, g.reclChiusi, g.reclTm, g.reclVecchi, g.nc, g.ncChiuse, g.ncAperte, g.ncScadute, g.ncEff, g.form, g.formOre,
        g.prove, g.emer, g.comInt, g.comEst, g.cons, g.audit, g.auditPian, g.rilievi, g.ries,
      ]);
    }
  });

  it("indicatori derivati: identici quando gli ingressi ci sono tutti, nei due esercizi", () => {
    for (const [anno, g] of [[ANNO, R.derive], [ANNO - 1, R.derivePrec]] as const) {
      const d = derivati(Q.misure[anno], Q.parametri.settimane);
      for (const [k, v] of Object.entries(g)) expect(d[k as keyof typeof d], `${anno} ${k}`).toBe(v);
      expect(d.incoerenze).toEqual([]);
    }
  });

  it("segnali: stesse frasi, stesso ordine; «Passo 3» diventa «Conformità»", () => {
    const s = segnali(Q, ANNO, OGGI);
    expect(s.map((x) => [x.livello, x.testo])).toEqual(R.allarmi.map((a) => [a.lv, a.t]));
    expect(s.map((x) => x.riferimento)).toEqual(R.allarmi.map((a) => (a.r === "Passo 3" ? "Conformità" : a.r)));
    expect(s.map((x) => x.vista)).toEqual(R.allarmi.map((a) => a.go));
  });

  it("avanzamento: le sette parti e il totale", () => {
    const a = avanzamento(Q, ANNO);
    const g = R.stato;
    expect([a.organizzazione, a.contesto, a.conformita, a.rischi, a.politica, a.indicatori, a.registri]).toEqual([g.s1, g.s2, g.s3, g.s4, g.s5, g.s6, g.s7]);
    expect(a.complessivo).toBeCloseTo(g.s8, 12);
    expect(a.percentuale).toBe(g.tot);
  });

  it("verifica: le voci aperte dell'esempio, e il giudizio «non presentabile»", () => {
    const v = verifica(Q, ANNO, OGGI, {
      gruppi: Object.fromEntries(gruppiCatalogo.map((g) => [g.key, g.nome])),
      riferimenti: Object.fromEntries(requisitiCatalogo.map((r) => [r.key, r.riferimento])),
      contenutiPolitica: politicaCatalogo.contenuti,
      indicatori: indicatoriCatalogo.indicatori,
    });
    expect(v.sezioni.map((x) => x.titolo)).toHaveLength(9);
    // Quattro requisiti da valutare (C10 e A11), una criticità (il requisito non conforme).
    expect(v.sezioni[2].voci).toHaveLength(4);
    expect(v.criticita).toBe(1);
    expect(v.presentabile).toBe(false);
    // Le registrazioni minime mancanti dell'esempio: comunicazione esterna, audit svolto, riesame.
    expect(v.sezioni[8].voci).toEqual(["comunicazione esterna (7.4.3)", "audit interno svolto (9.2)", "riesame della direzione (9.3)"]);
  });
});
