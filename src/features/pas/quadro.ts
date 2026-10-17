import type { Quadro } from "@/lib/calc/pas/quadro";
import type { Ambito, StatoRequisito } from "@/lib/calc/pas/tipi";
import type { PercorsoPasAvviato } from "./queries";

// Dalle righe del database ai tipi del motore. UNA traduzione, usata dalla pagina e dai
// documenti: due traduzioni dello stesso dato divergerebbero alla prima colonna nuova, e lo
// schermo e il PDF direbbero due numeri diversi.

const t = (v: string | null | undefined) => v ?? "";
const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

export function quadroDa(p: PercorsoPasAvviato): Quadro {
  const s = p.sistema;
  const r = p.righe;
  const misure: Record<number, Record<string, number>> = {};
  for (const m of r.misure) (misure[m.anno] ??= {})[m.indicatoreKey] = Number(m.valore);

  return {
    profilo: {
      forma: t(s.forma),
      piva: t(s.piva),
      sede: t(s.sede),
      settore: t(s.settore),
      ateco: t(s.ateco),
      ccnl: t(s.ccnl),
      siti: t(s.siti),
      campo: t(s.campo),
      direzione: t(s.direzione),
      responsabile: t(s.responsabile),
      rappresentanti: t(s.rappresentanti),
      contatto: t(s.contatto),
    },
    parametri: {
      oreOrdinarie: s.paramOreOrdinarie,
      oreTotali: s.paramOreTotali,
      settimane: s.paramSettimane,
      alto: s.paramAlto,
      medio: s.paramMedio,
      giorniReclamo: s.paramGiorniReclamo,
    },
    fattori: r.fattori.map((f) => ({ tipo: f.tipo, descrizione: f.descrizione, effetto: f.effetto })),
    parti: r.parti.map((x) => ({ nome: x.nome, esigenze: x.esigenze, obbligo: x.obbligo, gestita: x.gestita, coinvolgimento: x.coinvolgimento })),
    requisiti: p.catalogo.requisiti.map((x) => ({ key: x.key, gruppo: x.gruppoKey })),
    stati: Object.fromEntries(r.requisiti.map((x) => [x.requisitoKey, (x.stato ?? null) as StatoRequisito | null])),
    dettagli: Object.fromEntries(r.requisiti.map((x) => [x.requisitoKey, { evidenza: t(x.evidenza), azione: t(x.azione) }])),
    rischi: r.rischi.map((x) => ({
      area: x.area,
      ambito: x.ambito as Ambito,
      testo: x.testo,
      probabilita: x.probabilita,
      gravita: x.gravita,
      misure: t(x.misure),
      responsabile: t(x.responsabile),
    })),
    fornitori: r.fornitori.map((f) => ({
      nome: f.nome,
      categoria: f.categoria,
      paese: f.paese,
      rischio: t(f.rischio),
      clausola: f.clausola,
      questionario: f.questionario,
      verificatoIl: f.verificatoIl ?? null,
      esito: t(f.esito),
    })),
    politica: { testo: t(s.politicaTesto), contenuti: s.politicaContenuti, approvataIl: s.politicaApprovataIl ?? null, firma: t(s.politicaFirma) },
    contenutiPolitica: p.catalogo.contenutiPolitica.length,
    obiettivi: r.obiettivi.map((o) => ({
      obiettivo: o.obiettivo,
      area: o.area,
      indicatore: t(o.indicatore),
      traguardo: t(o.traguardo),
      scadenza: o.scadenza ?? null,
      responsabile: t(o.responsabile),
      risorse: t(o.risorse),
      stato: o.stato,
    })),
    attivita: r.attivita.map((a) => ({ attivita: a.attivita, mese: a.mese, stato: a.stato })),
    misure,
    indicatori: p.catalogo.indicatori.map((k) => k.key),
    registri: {
      reclami: r.reclami.map((x) => ({ data: x.data ?? null, chiusoIl: x.chiusoIl ?? null })),
      nonConformita: r.nonConformita.map((x) => ({ data: x.data ?? null, scadenza: x.scadenza ?? null, chiusaIl: x.chiusaIl ?? null, efficacia: x.efficacia })),
      formazione: r.formazione.map((x) => ({ data: x.data ?? null, partecipanti: x.partecipanti, ore: num(x.ore) })),
      emergenze: r.emergenze.map((x) => ({ data: x.data ?? null, tipo: x.tipo })),
      comunicazioni: r.comunicazioni.map((x) => ({ data: x.data ?? null, tipo: x.tipo })),
      consultazioni: r.consultazioni.map((x) => ({ data: x.data ?? null })),
      audit: r.audit.map((x) => ({ data: x.data ?? null, stato: x.stato, rilievi: x.rilievi })),
      riesami: r.riesami.map((x) => ({ data: x.data ?? null })),
    },
  };
}
