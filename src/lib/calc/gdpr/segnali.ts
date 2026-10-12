// I segnali che il percorso ricava dai dati: criticità e punti d'attenzione.
//
// È l'`allarmi` del prototipo, con lo stesso ordine e le stesse frasi, così che il golden
// le possa confrontare una per una. Due differenze, entrambe dichiarate:
//  · il riferimento «Passo 3» diventa «Conformità», perché qui non ci sono passi numerati;
//  · i conteggi vengono dal nostro motore, quindi dove il prototipo sbagliava (un
//    responsabile con contratto «Non dovuto», un indicatore vuoto letto come zero) anche
//    il segnale cambia, nel verso giusto.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { obbligoDpo, statiDelCatalogo, type Quadro } from "./quadro";
import { statoRegistri } from "./registri";
import { statoRegistro } from "./registro";
import { statoRischi } from "./rischio";

export type Livello = "C" | "A";
/** La vista del percorso dove si rimedia. */
export type Vista = "org" | "trat" | "gap" | "ris" | "pol" | "dati" | "reg";
export type Segnale = { livello: Livello; testo: string; riferimento: string; vista: Vista };

export type Tempo = { oggi: string; adesso: Date };

export function segnali(q: Quadro, anno: number, t: Tempo): Segnale[] {
  const L: Segnale[] = [];
  const add = (livello: Livello, testo: string, riferimento: string, vista: Vista) =>
    L.push({ livello, testo, riferimento, vista });
  const ts = statoRegistro(q.trattamenti, q.parametri);
  const rs = statoRischi(q.trattamenti, q.parametri);
  const fs = statoFornitori(q.fornitori);
  const g = statoRegistri(q.registri, anno, t.oggi, t.adesso);
  const d = obbligoDpo(q.profilo);
  const c = conformita(statiDelCatalogo(q));
  const m = q.misure[anno] ?? {};
  const has = (k: string) => typeof m[k] === "number";
  const n = (k: string) => (m[k] as number | undefined) ?? 0;

  if (!ts.trattamenti) add("C", "Registro dei trattamenti vuoto", "Art. 30", "trat");
  if (ts.senzaBase.length) add("C", "Trattamenti senza base giuridica: " + ts.senzaBase.length, "Art. 6", "trat");
  if (ts.senzaCondizione9.length)
    add("C", "Categorie particolari di dati senza condizione dell'art. 9.2: " + ts.senzaCondizione9.length, "Art. 9", "trat");
  if (ts.senzaConservazione.length)
    add("A", "Trattamenti senza termine di conservazione: " + ts.senzaConservazione.length, "Art. 5.1.e", "trat");
  if (ts.senzaBilanciamento.length)
    add("A", "Legittimo interesse senza bilanciamento documentato: " + ts.senzaBilanciamento.length, "Art. 6.1.f", "trat");
  if (ts.dpiaMancanti.length)
    add("C", "Valutazioni d'impatto necessarie e non concluse: " + ts.dpiaMancanti.length, "Art. 35", "ris");
  if (ts.consultazionePreventiva.length) {
    const k = ts.consultazionePreventiva.length;
    add("A", `Rischio residuo elevato: consultazione preventiva del Garante per ${k} trattament${k === 1 ? "o" : "i"}`, "Art. 36", "ris");
  }
  if (rs.altiScoperti.length) add("A", "Rischi alti senza misure di mitigazione: " + rs.altiScoperti.length, "Art. 32", "ris");
  if (fs.senzaContratto.length)
    add("C", "Responsabili senza contratto ai sensi dell'art. 28: " + fs.senzaContratto.length, "Art. 28.3", "ris");
  if (fs.garanziaDaDefinire.length)
    add("C", "Trasferimenti fuori dallo Spazio economico europeo senza garanzia definita: " + fs.garanziaDaDefinire.length, "Art. 44", "ris");
  if (fs.inDeroga) add("A", "Trasferimenti fondati su una deroga: verifica che siano occasionali (" + fs.inDeroga + ")", "Art. 49", "ris");
  if (fs.critici) add("C", "Responsabili con esito critico alla verifica: " + fs.critici, "Art. 28.1", "ris");
  if (!d.valutato) add("A", "Obbligo di designare il responsabile della protezione dei dati non ancora valutato", "Art. 37", "org");
  else if (d.obbligatorio && !d.designato)
    add("C", "Responsabile della protezione dei dati obbligatorio e non designato", "Art. 37.1", "org");
  else if (d.designato && !d.comunicato)
    add("A", "Dati di contatto del responsabile della protezione dei dati non comunicati al Garante", "Art. 37.7", "org");
  if (g.scadute) add("C", "Richieste degli interessati scadute senza riscontro: " + g.scadute, "Art. 12.3", "reg");
  if (g.fuoriTermine) add("A", `Richieste riscontrate oltre il termine nel ${anno}: ${g.fuoriTermine}`, "Art. 12.3", "reg");
  if (g.notificheScadute) add("C", "Violazioni a rischio non notificate entro 72 ore: " + g.notificheScadute, "Art. 33.1", "reg");
  if (g.notificheInCorso) add("A", "Violazioni da notificare al Garante con termine in corso: " + g.notificheInCorso, "Art. 33.1", "reg");
  if (g.notificateInRitardo)
    add("A", `Violazioni notificate oltre le 72 ore nel ${anno}: il ritardo va motivato (${g.notificateInRitardo})`, "Art. 33.1", "reg");
  if (g.elevateNonComunicate)
    add("C", "Violazioni a rischio elevato non comunicate agli interessati: " + g.elevateNonComunicate, "Art. 34", "reg");
  if (c.nonConformi) add("C", "Requisiti valutati non conformi: " + c.nonConformi, "Conformità", "gap");
  const daAggiornare = q.documenti.filter(
    (x) => x.stato === "Da aggiornare" || (!!x.revisioneIl && x.revisioneIl < t.oggi && x.stato === "Adottato"),
  ).length;
  if (daAggiornare) add("A", "Documenti da aggiornare o con revisione scaduta: " + daAggiornare, "Art. 24.1", "pol");
  if (n("sanz") > 0) add("C", "Sanzioni o provvedimenti correttivi ricevuti: " + n("sanz"), "Art. 83", "dati");
  if (has("cont") && has("cons_doc") && n("cons_doc") < n("cont"))
    add("A", "Contatti promozionali senza consenso o base documentata: " + (n("cont") - n("cons_doc")), "Art. 7.1", "dati");
  if (has("disp") && has("disp_cif") && n("disp_cif") < n("disp"))
    add("A", "Portatili e dispositivi mobili non cifrati: " + (n("disp") - n("disp_cif")), "Art. 32.1.a", "dati");
  if (has("bk_test") && n("bk_test") === 0 && !g.proveRipristino)
    add("A", "Nessuna prova di ripristino delle copie di sicurezza nel " + anno, "Art. 32.1.d", "dati");
  if (!g.formazioni) add("A", "Nessuna formazione registrata nel " + anno, "Art. 29", "reg");
  if (!g.verifiche) add("A", "Nessun audit o verifica svolti nel " + anno, "Art. 24.1", "reg");
  if (q.profilo.amministratori === "Sì" && !g.verificheAds)
    add("A", "Verifica annuale degli amministratori di sistema non registrata nel " + anno, "Provv. Garante", "reg");
  if (!g.riesami) add("A", "Riesame annuale non ancora svolto nel " + anno, "Art. 24.1", "reg");
  return L;
}
