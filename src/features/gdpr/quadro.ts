import type { Quadro, StatoAttivita, StatoDocumento } from "@/lib/calc/gdpr/quadro";
import type { TipoVerifica, StatoVerifica } from "@/lib/calc/gdpr/registri";
import type { Contratto, EsitoFornitore, RischioViolazione, SiNo, StatoDpia, StatoRequisito } from "@/lib/calc/gdpr/tipi";
import type { PercorsoGdprAvviato } from "./queries";

// Dalle righe del database ai tipi del motore. UNA traduzione, usata dalla pagina e dai
// documenti: due traduzioni dello stesso dato divergerebbero alla prima colonna nuova, e
// lo schermo e il PDF direbbero due numeri diversi.

const t = (v: string | null | undefined) => v ?? "";
const siNo = (v: string | null | undefined) => (v === "Sì" || v === "No" ? v : "") as SiNo;
const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

export function quadroDa(p: PercorsoGdprAvviato): Quadro {
  const s = p.sistema;
  const r = p.righe;
  const misure: Record<number, Record<string, number>> = {};
  for (const m of r.misure) (misure[m.anno] ??= {})[m.indicatoreKey] = Number(m.valore);

  return {
    profilo: {
      forma: t(s.forma),
      sede: t(s.sede),
      settore: t(s.settore),
      ateco: t(s.ateco),
      dipendenti: t(s.dipendenti),
      legale: t(s.legale),
      referente: t(s.referente),
      contatto: t(s.contatto),
      amministratori: siNo(s.amministratori),
      dpoA: siNo(s.dpoA),
      dpoB: siNo(s.dpoB),
      dpoC: siNo(s.dpoC),
      dpoNome: t(s.dpoNome),
      dpoComunicatoIl: s.dpoComunicatoIl ?? null,
    },
    parametri: { alto: s.paramAlto, medio: s.paramMedio, sogliaDpia: s.paramSogliaDpia },
    trattamenti: r.trattamenti.map((x) => ({
      nome: x.nome,
      finalita: t(x.finalita),
      base: t(x.base),
      bilanciamento: siNo(x.bilanciamento),
      interessati: t(x.interessati),
      dati: t(x.dati),
      particolari: x.particolari,
      condizione9: t(x.condizione9),
      destinatari: t(x.destinatari),
      trasferimento: x.trasferimento,
      conservazione: t(x.conservazione),
      misure: t(x.misure),
      criteri: x.criteri,
      probabilita: x.probabilita,
      gravita: x.gravita,
      mitigazione: t(x.mitigazione),
      dpiaStato: x.dpiaStato as StatoDpia,
      dpiaEsito: t(x.dpiaEsito),
    })),
    fornitori: r.fornitori.map((f) => ({
      nome: f.nome,
      qualifica: f.qualifica,
      contratto: t(f.contratto) as Contratto,
      garanzia: t(f.garanzia),
      verificatoIl: f.verificatoIl ?? null,
      esito: t(f.esito) as EsitoFornitore,
    })),
    requisiti: p.catalogo.requisiti.map((x) => ({ key: x.key, gruppo: x.gruppoKey })),
    stati: Object.fromEntries(r.requisiti.map((x) => [x.requisitoKey, (x.stato ?? null) as StatoRequisito | null])),
    dettagli: Object.fromEntries(r.requisiti.map((x) => [x.requisitoKey, { evidenza: t(x.evidenza), azione: t(x.azione) }])),
    politica: { testo: t(s.politicaTesto), contenuti: s.politicaContenuti, approvataIl: s.politicaApprovataIl ?? null },
    contenutiPolitica: p.catalogo.contenutiPolitica.length,
    documenti: r.documenti.map((d) => ({ tipo: d.tipo, oggetto: d.oggetto, stato: d.stato as StatoDocumento, revisioneIl: d.revisioneIl ?? null })),
    attivita: r.attivita.map((a) => ({ attivita: a.attivita, mese: a.mese, stato: a.stato as StatoAttivita })),
    misure,
    indicatori: p.catalogo.indicatori.map((k) => k.key),
    registri: {
      richieste: r.richieste.map((x) => ({ ricevutaIl: x.ricevutaIl ?? null, proroga: x.proroga, riscontroIl: x.riscontroIl ?? null })),
      violazioni: r.violazioni.map((x) => ({
        conoscenzaIl: x.conoscenzaIl ? new Date(x.conoscenzaIl).toISOString() : null,
        rischio: t(x.rischio) as RischioViolazione,
        notificataIl: x.notificataIl ? new Date(x.notificataIl).toISOString() : null,
        comunicataIl: x.comunicataIl ?? null,
        chiusaIl: x.chiusaIl ?? null,
        interessati: x.interessati,
      })),
      formazione: r.formazione.map((x) => ({ data: x.data ?? null, partecipanti: x.partecipanti, ore: num(x.ore) })),
      verifiche: r.verifiche.map((x) => ({ data: x.data ?? null, tipo: x.tipo as TipoVerifica, stato: x.stato as StatoVerifica, rilievi: x.rilievi })),
      verificheAds: r.verificheAds.map((x) => ({ data: x.data ?? null })),
      riesami: r.riesami.map((x) => ({ data: x.data ?? null })),
    },
  };
}
