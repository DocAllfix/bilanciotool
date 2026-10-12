import { describe, it, expect } from "vitest";
import golden from "./gdpr-golden.json";
import requisitiCatalogo from "@/lib/db/seeds/data/gdpr-requisiti.json";
import indicatoriCatalogo from "@/lib/db/seeds/data/gdpr-indicatori.json";
import politicaCatalogo from "@/lib/db/seeds/data/gdpr-politica.json";
import gruppiCatalogo from "@/lib/db/seeds/data/gdpr-gruppi.json";
import { verifica } from "@/lib/calc/gdpr/verifica";
import { daOraItaliana } from "@/lib/calc/comune/tempo-italia";
import { conformita } from "@/lib/calc/gdpr/conformita";
import { statoRegistro, completezza, numeroCriteri, dpiaNecessaria } from "@/lib/calc/gdpr/registro";
import { livello, statoRischi } from "@/lib/calc/gdpr/rischio";
import { statoFornitori } from "@/lib/calc/gdpr/fornitori";
import { scadenzaRichiesta, statoRichiesta, statoViolazione, notificaDovuta } from "@/lib/calc/gdpr/termini";
import { statoRegistri, type TipoVerifica, type StatoVerifica } from "@/lib/calc/gdpr/registri";
import { derivati } from "@/lib/calc/gdpr/indicatori";
import { segnali } from "@/lib/calc/gdpr/segnali";
import { avanzamento } from "@/lib/calc/gdpr/avanzamento";
import { obbligoDpo, statiDelCatalogo, type Quadro, type StatoDocumento, type StatoAttivita } from "@/lib/calc/gdpr/quadro";
import { PARAMETRI_PREDEFINITI, type Contratto, type EsitoFornitore, type RischioViolazione, type SiNo, type StatoDpia, type StatoRequisito, type Trattamento } from "@/lib/calc/gdpr/tipi";

// Il golden lo produce il PROTOTIPO, eseguito (`scripts/golden-gdpr.mjs`). Qui il suo
// dataset si traduce UNA VOLTA nei nostri tipi, e ogni risultato del nostro motore si
// confronta con quello del prototipo. Dove i due divergono di proposito, il test lo dice
// per nome e verifica entrambi i numeri: una divergenza che nessuno dichiara è un difetto.

type Proto = typeof golden.dataset;
const D: Proto = golden.dataset;
const R = golden.risultati;
const ANNO = golden.anno;
const ADESSO = new Date(golden.adesso);
const OGGI = "2026-10-12";

/** «AAAA-MM-GGThh:mm» del prototipo è ora italiana: diventa un istante. */
const istante = (s: string) => (s ? (daOraItaliana(s.slice(0, 10), s.slice(11, 16))?.toISOString() ?? null) : null);
const numero = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

function trattamento(t: Proto["trattamenti"][number]): Trattamento {
  return {
    nome: t.nome,
    finalita: t.fin,
    base: t.base,
    bilanciamento: t.lia as SiNo,
    interessati: t.int,
    dati: t.dati,
    particolari: t.part === "Sì",
    condizione9: t.b9 ?? "",
    destinatari: t.dest,
    trasferimento: t.extra === "Sì",
    conservazione: t.cons,
    misure: t.mis,
    criteri: Object.entries(t.crit as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k),
    probabilita: numero(t.p),
    gravita: numero(t.g),
    mitigazione: t.misr,
    dpiaStato: t.dpia_stato as StatoDpia,
    dpiaEsito: t.dpia_esito,
  };
}

function quadro(): Quadro {
  const p = D.profilo;
  const misure: Record<number, Record<string, number | null>> = {};
  for (const [anno, valori] of Object.entries(D.dati)) {
    misure[Number(anno)] = Object.fromEntries(Object.entries(valori as Record<string, unknown>).map(([k, v]) => [k, numero(v)]));
  }
  const reg = D.registri;
  return {
    profilo: {
      forma: p.forma, sede: p.sede, settore: p.settore, ateco: p.ateco, dipendenti: p.ndip,
      legale: p.legale, referente: p.ref, contatto: p.contatto, amministratori: p.ads as SiNo,
      dpoA: p.dpo_a as SiNo, dpoB: p.dpo_b as SiNo, dpoC: p.dpo_c as SiNo, dpoNome: p.dpo_nome, dpoComunicatoIl: p.dpo_com || null,
    },
    parametri: { alto: D.param.alto, medio: D.param.medio, sogliaDpia: D.param.dpia_n },
    trattamenti: D.trattamenti.map(trattamento),
    fornitori: D.fornitori.map((f) => ({
      nome: f.nome, qualifica: f.ruolo, contratto: f.dpa as Contratto, garanzia: f.extra, verificatoIl: f.ver || null, esito: f.esito as EsitoFornitore,
    })),
    requisiti: requisitiCatalogo.map((r) => ({ key: r.key, gruppo: r.gruppo })),
    stati: Object.fromEntries(Object.entries(D.gap as Record<string, { st: string }>).map(([k, v]) => [k, (v.st || null) as StatoRequisito | null])),
    dettagli: Object.fromEntries(
      Object.entries(D.gap as Record<string, { ev?: string; az?: string }>).map(([k, v]) => [k, { evidenza: v.ev ?? "", azione: v.az ?? "" }]),
    ),
    politica: {
      testo: D.politica.testo,
      contenuti: Object.entries(D.politica.chk as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k),
      approvataIl: D.politica.data || null,
    },
    contenutiPolitica: politicaCatalogo.contenuti.length,
    documenti: D.docs.map((x) => ({ tipo: x.tipo, oggetto: x.tit, stato: x.stato as StatoDocumento, revisioneIl: x.rev || null })),
    attivita: D.piano.map((x) => ({ attivita: x.att, mese: Number(x.mese), stato: x.stato as StatoAttivita })),
    misure,
    indicatori: indicatoriCatalogo.indicatori.map((k) => k.key),
    registri: {
      richieste: reg.dir.map((r) => ({ ricevutaIl: r.data || null, proroga: r.proroga === "Sì", riscontroIl: r.evasa || null })),
      violazioni: reg.breach.map((r) => ({
        conoscenzaIl: istante(r.data), rischio: r.rischio as RischioViolazione, notificataIl: istante(r.notif),
        comunicataIl: r.comint || null, chiusaIl: r.chiusura || null, interessati: numero(r.nint),
      })),
      formazione: reg.form.map((r) => ({ data: r.data || null, partecipanti: numero(r.part), ore: numero(r.ore) })),
      verifiche: reg.audit.map((r) => ({ data: r.data || null, tipo: r.tipo as TipoVerifica, stato: r.stato as StatoVerifica, rilievi: numero(r.ril) })),
      verificheAds: reg.ads.map((r: { data: string }) => ({ data: r.data || null })),
      riesami: reg.ries.map((r: { data: string }) => ({ data: r.data || null })),
    },
  };
}

const Q = quadro();

describe("GDPR: il motore contro il prototipo eseguito", () => {
  it("il golden è quello atteso: l'esempio del prototipo, nel 2026", () => {
    expect(ANNO).toBe(2026);
    expect(Q.trattamenti).toHaveLength(9);
    expect(Q.fornitori).toHaveLength(8);
    expect(Q.parametri).toEqual(PARAMETRI_PREDEFINITI);
  });

  it("conformità: i conteggi coincidono, l'indice DIVERGE di proposito (89 → 83)", () => {
    const c = conformita(statiDelCatalogo(Q));
    const g = R.conf;
    expect([c.totale, c.valutati, c.conformi, c.parziali, c.nonConformi, c.nonPertinenti, c.daValutare]).toEqual([g.tot, g.val, g.c, g.p, g.n, g.na, g.da]);
    // Il prototipo media i soli valutati: (63 + 15 × 0,5) ÷ 79 = 89.
    expect(g.pct).toBe(89);
    // Qui i sei mai valutati pesano zero: (63 × 100 + 15 × 50) ÷ 85 = 83.
    expect(c.indice).toBe(83);
  });

  it("conformità per gruppo: conteggi uguali in tutti e dodici i gruppi", () => {
    for (const [gruppo, g] of Object.entries(R.confPerGruppo)) {
      const c = conformita(statiDelCatalogo(Q, gruppo));
      expect([c.totale, c.conformi, c.parziali, c.nonConformi, c.nonPertinenti, c.daValutare], gruppo).toEqual([g.tot, g.c, g.p, g.n, g.na, g.da]);
    }
  });

  it("registro dei trattamenti: completezza, vaglio e lacune per nome", () => {
    const s = statoRegistro(Q.trattamenti, Q.parametri);
    const g = R.tratStat;
    expect(s.trattamenti).toBe(g.n);
    expect(s.conParticolari).toBe(g.part);
    expect(s.conTrasferimento).toBe(g.extra);
    expect(s.completezza).toBeCloseTo(g.comp, 10);
    expect(s.senzaBase).toEqual(g.noBase);
    expect(s.senzaCondizione9).toEqual(g.noB9);
    expect(s.senzaConservazione).toEqual(g.noCons);
    expect(s.senzaBilanciamento).toEqual(g.noLia);
    expect(s.dpiaNecessarie).toEqual(g.dpia);
    expect(s.dpiaConcluse).toEqual(g.dpiaOk);
    expect(s.dpiaMancanti).toEqual(g.dpiaNo);
    expect(s.consultazionePreventiva).toEqual(g.cons36);
    for (const t of Q.trattamenti) {
      expect(completezza(t), t.nome).toBeCloseTo(R.completezza[t.nome as keyof typeof R.completezza], 10);
      const v = R.vaglio[t.nome as keyof typeof R.vaglio];
      expect([numeroCriteri(t), dpiaNecessaria(t, Q.parametri)], t.nome).toEqual([v.criteri, v.necessaria]);
      expect(livello(t), t.nome).toBe(R.livelli[t.nome as keyof typeof R.livelli]);
    }
  });

  it("rischi: classi e alti scoperti", () => {
    const s = statoRischi(Q.trattamenti, Q.parametri);
    const g = R.rischiStat;
    expect([s.trattamenti, s.valutati, s.alti, s.medi, s.bassi]).toEqual([g.tot, g.val, g.alti, g.medi, g.bassi]);
    expect(s.altiScoperti).toEqual(g.scoperti);
  });

  it("fornitori: contratti, trasferimenti, verifiche", () => {
    const s = statoFornitori(Q.fornitori);
    const g = R.fornStat;
    expect([s.fornitori, s.conContratto, s.completi, s.conTrasferimento, s.inDeroga, s.critici, s.verificati]).toEqual([g.n, g.resp, g.val, g.extra, g.deroga, g.critici, g.verif]);
    expect(s.senzaContratto).toEqual(g.noDpa);
    expect(s.garanziaDaDefinire).toEqual(g.noGar);
    expect([s.quotaContratti, s.quotaVerificati]).toEqual([g.pDpa, g.pVer]);
  });

  it("obbligo del responsabile della protezione dei dati", () => {
    const d = obbligoDpo(Q.profilo);
    expect([d.valutato, d.obbligatorio, d.designato, d.comunicato]).toEqual([R.dpo.val, R.dpo.obbl, R.dpo.nom, R.dpo.com]);
  });

  it("richieste: scadenze e stati identici", () => {
    Q.registri.richieste.forEach((r, i) => {
      const g = R.richieste[i];
      expect(scadenzaRichiesta(r), g.rif).toBe(g.scadenza);
      expect(statoRichiesta(r, OGGI), g.rif).toBe(g.stato);
    });
  });

  it("violazioni: notifica dovuta e stato identici sull'esempio", () => {
    Q.registri.violazioni.forEach((v, i) => {
      const g = R.violazioni[i];
      expect(notificaDovuta(v), g.data).toBe(g.dovuta);
      expect(statoViolazione(v, ADESSO) ?? "", g.data).toBe(g.stato);
    });
  });

  it("registri dell'esercizio e del precedente", () => {
    for (const [anno, g] of [[ANNO, R.regStat], [ANNO - 1, R.regStatPrec]] as const) {
      const s = statoRegistri(Q.registri, anno, OGGI, ADESSO);
      expect(
        [s.richieste, s.riscontrate, s.neiTermini, s.fuoriTermine, s.scadute, s.aperte, s.giorniMedi ?? 0,
         s.violazioni, s.aRischio, s.notificate, s.notificateInTempo, s.notificateInRitardo, s.notificheScadute, s.notificheInCorso,
         s.elevateNonComunicate, s.violazioniAperte, s.interessatiCoinvolti, s.formazioni, s.orePersona,
         s.verifiche, s.verifichePianificate, s.rilievi, s.verificheResponsabili, s.proveRipristino, s.verificheAds, s.riesami],
        String(anno),
      ).toEqual([g.dir, g.dirEv, g.dirOk, g.dirLate, g.dirOver, g.dirOpen, g.dirTm,
        g.br, g.brRis, g.brNot, g.brOk, g.brLate, g.brOver, g.brOpen,
        g.brElev, g.brAperte, g.brInt, g.form, g.formOre,
        g.audit, g.auditPian, g.rilievi, g.verResp, g.ripr, g.ads, g.ries]);
    }
  });

  it("indicatori derivati: uguali quando tutti i numeri ci sono", () => {
    for (const [anno, g] of [[ANNO, R.derive], [ANNO - 1, R.derivePrec]] as const) {
      const d = derivati(Q.misure[anno]);
      expect(d.incoerenze, String(anno)).toEqual([]);
      for (const [k, v] of Object.entries(g)) expect(d[k as keyof typeof g], `${anno} ${k}`).toBe(v);
    }
  });

  it("segnali: stesso elenco, stesso ordine; solo «Passo 3» diventa «Conformità»", () => {
    const s = segnali(Q, ANNO, { oggi: OGGI, adesso: ADESSO });
    expect(s.map((x) => [x.livello, x.testo, x.vista])).toEqual(R.allarmi.map((a) => [a.lv, a.t, a.go]));
    expect(s.map((x) => x.riferimento)).toEqual(R.allarmi.map((a) => (a.r === "Passo 3" ? "Conformità" : a.r)));
  });

  it("verifica: le dieci sezioni del prototipo, con le voci giuste", () => {
    const gruppi = Object.fromEntries(gruppiCatalogo.map((g) => [g.key, g.nome]));
    const riferimenti = Object.fromEntries(requisitiCatalogo.map((r) => [r.key, r.riferimento]));
    const v = verifica(Q, ANNO, { oggi: OGGI, adesso: ADESSO }, {
      gruppi,
      riferimenti,
      contenutiPolitica: politicaCatalogo.contenuti,
      indicatori: indicatoriCatalogo.indicatori,
    });
    const per = Object.fromEntries(v.sezioni.map((s) => [s.titolo, s.voci]));
    expect(v.sezioni).toHaveLength(10);
    // L'esempio lascia apposta da valutare il gruppo dei trasferimenti (sei requisiti).
    expect(per["Requisiti da valutare"]).toHaveLength(6);
    expect(per["Requisiti da valutare"].every((x) => x.startsWith("Trasferimenti verso paesi terzi"))).toBe(true);
    // Ogni requisito da adeguare dell'esempio ha la sua azione.
    expect(per["Requisiti da adeguare senza azione definita"]).toEqual([]);
    // I conformi senza evidenza si leggono dal dataset del prototipo, non dalla nostra formula.
    const senzaEv = Object.entries(D.gap as Record<string, { st: string; ev?: string }>).filter(([, x]) => x.st === "c" && !x.ev).length;
    expect(per["Requisiti conformi senza evidenza"]).toHaveLength(senzaEv);
    expect(per[`Registrazioni dell'esercizio ${ANNO}`]).toEqual(["verifica degli amministratori di sistema", "riesame annuale"]);
    expect(per["Responsabili e trasferimenti"]).toEqual([
      "contratto art. 28: Assistenza informatica Esempio",
      "garanzia per il trasferimento: Newsletter Esempio LLC",
    ]);
    expect(v.criticita).toBe(R.allarmi.filter((a) => a.lv === "C").length);
    expect(v.dimostrabile).toBe(false);
  });

  it("avanzamento: le sette parti e il complessivo", () => {
    const a = avanzamento(Q, ANNO, OGGI, ADESSO);
    const g = R.stato;
    const parti = [a.organizzazione, a.trattamenti, a.conformita, a.rischi, a.politica, a.indicatori, a.registri];
    [g.s1, g.s2, g.s3, g.s4, g.s5, g.s6, g.s7].forEach((v, i) => expect(parti[i], `s${i + 1}`).toBeCloseTo(v, 10));
    expect(a.percentuale).toBe(g.tot);
  });
});
