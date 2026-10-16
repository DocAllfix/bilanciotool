// Il quadro degli otto registri in un esercizio: il `regStat` del prototipo.
//
// Le voci si attribuiscono all'esercizio per data. Le aperte, le scadute e i reclami da
// sollecitare si contano invece su TUTTO l'archivio, come nel prototipo: un reclamo dell'anno
// scorso ancora aperto è un problema di oggi.
//
// ⚠️ I giorni si contano sulle DATE, non sugli istanti: `giorniA` lavora in UTC sul calendario,
// e `oggi` è il giorno ITALIANO deciso dal server. Il prototipo usava `toISOString()`, che fra
// mezzanotte e le due restituisce ieri.

import { giorniA } from "@/lib/calc/segnalazioni/termini";

export const annoDi = (data: string | null | undefined) => (data && /^\d{4}-/.test(data) ? Number(data.slice(0, 4)) : null);

export type Reclamo = { data: string | null; chiusoIl: string | null };
export type NonConformita = { data: string | null; scadenza: string | null; chiusaIl: string | null; efficacia: string };
export type Formazione = { data: string | null; partecipanti: number | null; ore: number | null };
export type Emergenza = { data: string | null; tipo: string };
export type Comunicazione = { data: string | null; tipo: string };
export type Consultazione = { data: string | null };
export type Audit = { data: string | null; stato: string; rilievi: number | null };
export type Riesame = { data: string | null };

export type Registri = {
  reclami: readonly Reclamo[];
  nonConformita: readonly NonConformita[];
  formazione: readonly Formazione[];
  emergenze: readonly Emergenza[];
  comunicazioni: readonly Comunicazione[];
  consultazioni: readonly Consultazione[];
  audit: readonly Audit[];
  riesami: readonly Riesame[];
};

export const REGISTRI_VUOTI: Registri = {
  reclami: [],
  nonConformita: [],
  formazione: [],
  emergenze: [],
  comunicazioni: [],
  consultazioni: [],
  audit: [],
  riesami: [],
};

/** Le chiavi dei registri, nell'ordine del prototipo: servono all'avanzamento. */
export const CHIAVI_REGISTRI = ["reclami", "nonConformita", "formazione", "emergenze", "comunicazioni", "consultazioni", "audit", "riesami"] as const;

export type StatoRegistri = {
  reclami: number;
  reclamiChiusi: number;
  /** Media dei giorni fra ricezione e chiusura, sui reclami chiusi dell'esercizio; `null` se nessuno. */
  giorniMediChiusura: number | null;
  /** Aperti da più dei giorni impostati, su tutto l'archivio. */
  reclamiDaSollecitare: number;
  nonConformita: number;
  nonConformitaChiuse: number;
  /** Su tutto l'archivio. */
  nonConformitaAperte: number;
  /** Aperte con la scadenza passata, su tutto l'archivio. */
  azioniScadute: number;
  efficaci: number;
  formazioni: number;
  orePersona: number;
  /** Prove ed esercitazioni: le verifiche dei presidi e le emergenze reali non contano. */
  prove: number;
  emergenze: number;
  comunicazioniInterne: number;
  comunicazioniEsterne: number;
  consultazioni: number;
  /** Svolti o chiusi: un audit pianificato non è un audit fatto. */
  audit: number;
  auditPianificati: number;
  rilievi: number;
  riesami: number;
};

/** @param oggi il giorno ITALIANO, `AAAA-MM-GG`. */
export function statoRegistri(r: Registri, anno: number, oggi: string, giorniReclamo: number): StatoRegistri {
  const nell = <T extends { data: string | null }>(L: readonly T[]) => L.filter((x) => annoDi(x.data) === anno);
  const n = (v: number | null) => v ?? 0;

  const recl = nell(r.reclami);
  const chiusi = recl.filter((x) => !!x.chiusoIl);
  // `giorniA(a, b)` è a − b in giorni di calendario: chiusura − ricezione.
  const durate = chiusi.map((x) => Math.max(0, giorniA(x.chiusoIl, x.data) ?? 0));

  const nc = nell(r.nonConformita);
  const audit = nell(r.audit);
  const svolti = audit.filter((x) => x.stato !== "Pianificato");

  return {
    reclami: recl.length,
    reclamiChiusi: chiusi.length,
    giorniMediChiusura: durate.length ? Math.round(durate.reduce((a, b) => a + b, 0) / durate.length) : null,
    reclamiDaSollecitare: r.reclami.filter((x) => {
      if (!x.data || x.chiusoIl) return false;
      const eta = giorniA(oggi, x.data);
      return eta !== null && eta > giorniReclamo;
    }).length,
    nonConformita: nc.length,
    nonConformitaChiuse: nc.filter((x) => !!x.chiusaIl).length,
    nonConformitaAperte: r.nonConformita.filter((x) => !x.chiusaIl).length,
    azioniScadute: r.nonConformita.filter((x) => !x.chiusaIl && !!x.scadenza && x.scadenza < oggi).length,
    efficaci: nc.filter((x) => x.efficacia === "Efficace").length,
    formazioni: nell(r.formazione).length,
    orePersona: nell(r.formazione).reduce((s, x) => s + n(x.ore) * n(x.partecipanti), 0),
    prove: nell(r.emergenze).filter((x) => /^Prova|^Esercitazione/.test(x.tipo)).length,
    emergenze: nell(r.emergenze).length,
    comunicazioniInterne: nell(r.comunicazioni).filter((x) => x.tipo === "Interna").length,
    comunicazioniEsterne: nell(r.comunicazioni).filter((x) => x.tipo === "Esterna").length,
    consultazioni: nell(r.consultazioni).length,
    audit: svolti.length,
    auditPianificati: audit.length,
    rilievi: svolti.reduce((s, x) => s + n(x.rilievi), 0),
    riesami: nell(r.riesami).length,
  };
}

/**
 * Il riesame dell'esercizio e quello che lo precede, per il verbale.
 *
 * ⚠️ DIVERGE DAL PROTOTIPO. Senza un riesame dell'esercizio, il prototipo prendeva come
 * «precedente» il più recente in ASSOLUTO, anche se successivo all'esercizio: nel verbale del
 * 2025 sarebbero comparse come «azioni dei riesami precedenti» quelle decise nel 2026. Qui il
 * precedente è sempre il più recente PRIMA del riesame dell'esercizio, o prima dell'inizio
 * dell'esercizio se il riesame non c'è ancora.
 */
export function riesamiDelVerbale<T extends Riesame>(riesami: readonly T[], anno: number): { corrente: T | null; precedente: T | null } {
  const datati = riesami.filter((x) => !!x.data).slice().sort((a, b) => (a.data! < b.data! ? 1 : a.data! > b.data! ? -1 : 0));
  const corrente = datati.find((x) => annoDi(x.data) === anno) ?? null;
  const soglia = corrente ? corrente.data! : `${anno}-01-01`;
  const precedente = datati.find((x) => x.data! < soglia) ?? null;
  return { corrente, precedente };
}
