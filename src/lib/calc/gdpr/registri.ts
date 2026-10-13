// Il quadro dei sei registri in un esercizio: il `regStat` del prototipo.
//
// Le voci si attribuiscono all'esercizio per data. Le scadute e le aperte invece si contano
// su TUTTO l'archivio, come nel prototipo: una richiesta dell'anno scorso ancora senza
// riscontro è un problema di oggi, non dell'anno scorso.

import {
  annoDi,
  annoViolazione,
  giorniDiRiscontro,
  notificaDovuta,
  statoRichiesta,
  statoViolazione,
  rischioDaValutare,
} from "./termini";
import type { Richiesta, Violazione } from "./tipi";

export type Formazione = { data: string | null; partecipanti: number | null; ore: number | null };

export const TIPI_VERIFICA = [
  "Audit interno",
  "Verifica su un responsabile",
  "Verifica tecnica di sicurezza",
  "Prova di ripristino",
  "Verifica del responsabile della protezione dei dati",
] as const;
export type TipoVerifica = (typeof TIPI_VERIFICA)[number];
export const STATI_VERIFICA = ["Pianificato", "Svolto", "Chiuso"] as const;
export type StatoVerifica = (typeof STATI_VERIFICA)[number];

export type Verifica = { data: string | null; tipo: TipoVerifica; stato: StatoVerifica; rilievi: number | null };
export type VerificaAds = { data: string | null };
export type Riesame = { data: string | null };

export type Registri = {
  richieste: readonly Richiesta[];
  violazioni: readonly Violazione[];
  formazione: readonly Formazione[];
  verifiche: readonly Verifica[];
  verificheAds: readonly VerificaAds[];
  riesami: readonly Riesame[];
};

export const REGISTRI_VUOTI: Registri = {
  richieste: [],
  violazioni: [],
  formazione: [],
  verifiche: [],
  verificheAds: [],
  riesami: [],
};

export type StatoRegistri = {
  richieste: number;
  riscontrate: number;
  neiTermini: number;
  fuoriTermine: number;
  /** Su tutto l'archivio. */
  scadute: number;
  /** Su tutto l'archivio. */
  aperte: number;
  /** Media dei giorni di riscontro, arrotondata; `null` se nessuna riscontrata. */
  giorniMedi: number | null;
  violazioni: number;
  aRischio: number;
  notificate: number;
  notificateInTempo: number;
  notificateInRitardo: number;
  /** Su tutto l'archivio. */
  notificheScadute: number;
  /** Su tutto l'archivio. */
  notificheInCorso: number;
  /** Rischio elevato non comunicato agli interessati, su tutto l'archivio. */
  elevateNonComunicate: number;
  /** Violazioni conosciute, non chiuse, col rischio ancora in bianco: le 72 ore corrono. */
  rischioDaValutare: number;
  /** Violazioni senza data di chiusura, su tutto l'archivio. */
  violazioniAperte: number;
  interessatiCoinvolti: number;
  formazioni: number;
  orePersona: number;
  /** Svolte o chiuse; le pianificate non contano come fatte. */
  verifiche: number;
  verifichePianificate: number;
  rilievi: number;
  verificheResponsabili: number;
  proveRipristino: number;
  verificheAds: number;
  riesami: number;
};

/**
 * @param oggi il giorno ITALIANO, `AAAA-MM-GG`, per le richieste;
 * @param adesso l'istante corrente, per le 72 ore.
 */
export function statoRegistri(r: Registri, anno: number, oggi: string, adesso: Date): StatoRegistri {
  const nell = <T extends { data: string | null }>(L: readonly T[]) => L.filter((x) => annoDi(x.data) === anno);

  const rich = r.richieste.filter((x) => annoDi(x.ricevutaIl) === anno);
  const statiRich = (L: readonly Richiesta[]) => L.map((x) => statoRichiesta(x, oggi));
  const statiAnno = statiRich(rich);
  const statiTutte = statiRich(r.richieste);
  const giorni = rich.map(giorniDiRiscontro).filter((g): g is number => g !== null);

  const viol = r.violazioni.filter((x) => annoViolazione(x) === anno);
  const statiViol = viol.map((x) => statoViolazione(x, adesso));
  const statiViolTutte = r.violazioni.map((x) => statoViolazione(x, adesso));

  const svolte = nell(r.verifiche).filter((x) => x.stato !== "Pianificato");
  const n = (v: number | null) => v ?? 0;

  return {
    richieste: rich.length,
    riscontrate: rich.filter((x) => !!x.riscontroIl).length,
    neiTermini: statiAnno.filter((s) => s === "ok").length,
    fuoriTermine: statiAnno.filter((s) => s === "late").length,
    scadute: statiTutte.filter((s) => s === "over").length,
    aperte: statiTutte.filter((s) => s === "open").length,
    giorniMedi: giorni.length ? Math.round(giorni.reduce((a, b) => a + b, 0) / giorni.length) : null,
    violazioni: viol.length,
    aRischio: viol.filter(notificaDovuta).length,
    notificate: viol.filter((x) => !!x.notificataIl).length,
    notificateInTempo: statiViol.filter((s) => s === "ok").length,
    notificateInRitardo: statiViol.filter((s) => s === "late").length,
    notificheScadute: statiViolTutte.filter((s) => s === "over").length,
    notificheInCorso: statiViolTutte.filter((s) => s === "open").length,
    elevateNonComunicate: r.violazioni.filter((x) => x.rischio === "Rischio elevato" && !x.comunicataIl).length,
    violazioniAperte: r.violazioni.filter((x) => !!x.conoscenzaIl && !x.chiusaIl).length,
    rischioDaValutare: r.violazioni.filter((x) => rischioDaValutare(x) && !x.chiusaIl).length,
    interessatiCoinvolti: viol.reduce((s, x) => s + n(x.interessati), 0),
    formazioni: nell(r.formazione).length,
    orePersona: nell(r.formazione).reduce((s, x) => s + n(x.ore) * n(x.partecipanti), 0),
    verifiche: svolte.length,
    verifichePianificate: nell(r.verifiche).length,
    rilievi: svolte.reduce((s, x) => s + n(x.rilievi), 0),
    verificheResponsabili: svolte.filter((x) => x.tipo === "Verifica su un responsabile").length,
    proveRipristino: svolte.filter((x) => x.tipo === "Prova di ripristino").length,
    verificheAds: nell(r.verificheAds).length,
    riesami: nell(r.riesami).length,
  };
}
