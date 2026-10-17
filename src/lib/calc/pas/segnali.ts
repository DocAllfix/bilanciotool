// I segnali che il percorso ricava dai dati: criticità e punti d'attenzione.
//
// È l'`allarmi` del prototipo, con lo stesso ordine e le stesse frasi, così che il golden le
// possa confrontare una per una. Due differenze, entrambe dichiarate:
//  · il riferimento «Passo 3» diventa «Conformità», perché qui non ci sono passi numerati;
//  · i conteggi vengono dal nostro motore, quindi dove il prototipo sbagliava (un requisito mai
//    valutato ignorato, un indicatore vuoto letto come zero) anche il segnale cambia, nel verso
//    giusto.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { statiDelCatalogo, type Quadro } from "./quadro";
import { statoRegistri } from "./registri";
import { statoRischi } from "./rischio";

export type Livello = "C" | "A";
/** La vista del percorso dove si rimedia. */
export type Vista = "org" | "ctx" | "gap" | "ris" | "pol" | "dati" | "reg";
export type Segnale = { livello: Livello; testo: string; riferimento: string; vista: Vista };

/** Un numero in un testo italiano: virgola decimale. */
const cifra = (x: number) => String(x).replace(".", ",");

/** @param oggi il giorno ITALIANO, `AAAA-MM-GG`, deciso dal server. */
export function segnali(q: Quadro, anno: number, oggi: string): Segnale[] {
  const L: Segnale[] = [];
  const add = (livello: Livello, testo: string, riferimento: string, vista: Vista) => L.push({ livello, testo, riferimento, vista });
  const P = q.parametri;
  const m = q.misure[anno] ?? {};
  const has = (k: string) => typeof m[k] === "number";
  const n = (k: string) => (has(k) ? (m[k] as number) : 0);

  if (has("lav_u15") && n("lav_u15") > 0) add("C", "Minori di 15 anni presenti al lavoro: " + cifra(n("lav_u15")), "A.3 · 1", "dati");
  if (has("re_min") && has("re_ccnl") && n("re_min") < n("re_ccnl"))
    add("C", "La retribuzione più bassa erogata è sotto il minimo contrattuale", "A.8 · 4", "dati");
  if (n("tratt") > 0) add("C", "Trattenute disciplinari applicate sulla retribuzione: " + cifra(n("tratt")), "A.8 · 10", "dati");
  if (n("rit") > 0) add("A", "Mensilità pagate in ritardo: " + cifra(n("rit")), "A.8 · 5", "dati");
  if (has("cop") && has("lav_tot") && n("cop") < n("lav_tot"))
    add("A", "Lavoratori non coperti da contratto collettivo: " + cifra(n("lav_tot") - n("cop")), "A.8 · 4", "dati");
  if (n("ore_max") > P.oreTotali)
    add("C", `Settimana di ${cifra(n("ore_max"))} ore: oltre il limite complessivo di ${cifra(P.oreTotali)}`, "A.9 · 2-3", "dati");
  else if (n("ore_max") > P.oreOrdinarie)
    add(
      "A",
      `Settimana di ${cifra(n("ore_max"))} ore: verifica che l'eccedenza oltre ${cifra(P.oreOrdinarie)} sia straordinario volontario e retribuito`,
      "A.9 · 1",
      "dati",
    );
  if (n("sett_60") > 0) add("C", "Casi di settimana oltre il limite complessivo: " + cifra(n("sett_60")), "A.9 · 3", "dati");
  if (n("riposi") > 0) add("A", "Casi di riposo settimanale non fruito: " + cifra(n("riposi")), "A.9 · 7", "dati");
  if (has("re_lw") && has("re_min") && n("re_lw") > n("re_min"))
    add("A", "Retribuzione minima sotto il salario dignitoso di riferimento: predisponi un piano di avvicinamento", "A.8 · 4 nota", "pol");
  if (n("corr") > 0) add("C", "Episodi di corruzione accertati: " + cifra(n("corr")), "A.11 · 1", "dati");

  const c = conformita(statiDelCatalogo(q));
  if (c.nonConformi) add("C", "Requisiti valutati non conformi: " + c.nonConformi, "Conformità", "gap");
  const rs = statoRischi(q.rischi, P);
  if (rs.altiScoperti.length) add("A", "Rischi alti senza misure definite: " + rs.altiScoperti.length, "6.1.2", "ris");
  const fs = statoFornitori(q.fornitori);
  if (fs.altiMaiVerificati.length) add("A", "Fornitori a rischio alto mai verificati: " + fs.altiMaiVerificati.length, "8.1.3", "ris");
  if (fs.critici) add("C", "Fornitori con esito critico alla verifica: " + fs.critici, "A.1 · 4", "ris");

  const g = statoRegistri(q.registri, anno, oggi, P.giorniReclamo);
  if (g.azioniScadute) add("A", "Azioni correttive scadute e non chiuse: " + g.azioniScadute, "10.2", "reg");
  if (g.reclamiDaSollecitare) add("A", `Reclami aperti da più di ${P.giorniReclamo} giorni: ${g.reclamiDaSollecitare}`, "A.10", "reg");
  if (!g.prove) add("A", "Nessuna prova di emergenza registrata nel " + anno, "8.2", "reg");
  if (!g.comunicazioniInterne) add("A", "Nessuna comunicazione interna sul sistema nel " + anno, "7.4.2", "reg");
  if (!g.comunicazioniEsterne) add("A", "Nessuna comunicazione esterna sul sistema nel " + anno, "7.4.3", "reg");
  if (!g.audit) add("A", "Nessun audit interno svolto nel " + anno, "9.2", "reg");
  if (!g.riesami) add("A", "Riesame della direzione non ancora svolto nel " + anno, "9.3", "reg");
  return L;
}
