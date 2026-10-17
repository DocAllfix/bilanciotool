// La verifica: che cosa manca prima dell'audit di certificazione.
//
// È il blocco «Verifica» del prototipo, sezione per sezione e nello stesso ordine. Due
// differenze dichiarate:
//  · i requisiti si nominano col gruppo e il riferimento («Lavoro forzato A.2 · 9»), non col
//    solo riferimento: «4.1» da solo, in un elenco lungo, non dice niente a chi lo legge;
//  · i testi dei rischi e degli obiettivi non si tagliano a 50 e 40 caratteri come nel
//    prototipo: tagliare una frase a metà in un elenco di cose da fare la rende ambigua. Se
//    serve, accorcia la vista.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { avanzamento, ATTIVITA_ATTESE, FATTORI_ATTESI, OBIETTIVI_ATTESI, TESTO_POLITICA_MINIMO } from "./avanzamento";
import { CAMPI_PROFILO, statiDelCatalogo, type Quadro } from "./quadro";
import { statoRegistri } from "./registri";
import { livello } from "./rischio";
import { segnali, type Vista } from "./segnali";

export type SezioneVerifica = { titolo: string; voci: string[]; vista: Vista };

export type CatalogoVerifica = {
  gruppi: Readonly<Record<string, string>>;
  riferimenti: Readonly<Record<string, string>>;
  contenutiPolitica: readonly { key: string; testo: string }[];
  indicatori: readonly { key: string; nome: string }[];
};

/** @param oggi il giorno ITALIANO, `AAAA-MM-GG`. */
export function verifica(q: Quadro, anno: number, oggi: string, cat: CatalogoVerifica) {
  const p = q.profilo;
  const fs = statoFornitori(q.fornitori);
  const g = statoRegistri(q.registri, anno, oggi, q.parametri.giorniReclamo);
  const req = (key: string) => `${cat.gruppi[q.requisiti.find((r) => r.key === key)?.gruppo ?? ""] ?? ""} ${cat.riferimenti[key] ?? key}`.trim();
  const misure = q.misure[anno] ?? {};
  const daValutare = q.rischi.filter((r) => livello(r) === null).length;

  const sezioni: SezioneVerifica[] = [
    {
      titolo: "Organizzazione e campo di applicazione",
      vista: "org",
      voci: (Object.keys(CAMPI_PROFILO) as (keyof typeof CAMPI_PROFILO)[]).filter((k) => !String(p[k] ?? "").trim()).map((k) => CAMPI_PROFILO[k]),
    },
    {
      titolo: "Contesto e parti interessate",
      vista: "ctx",
      voci: [
        ...(q.fattori.filter((f) => f.descrizione.trim()).length < FATTORI_ATTESI ? ["meno di quattro fattori di contesto"] : []),
        ...q.parti.filter((x) => x.nome.trim() && !x.esigenze.trim()).map((x) => "esigenze di: " + x.nome),
      ],
    },
    {
      titolo: "Requisiti da valutare",
      vista: "gap",
      voci: q.requisiti.filter((r) => !q.stati[r.key]).map((r) => req(r.key)),
    },
    {
      titolo: "Requisiti da adeguare senza azione definita",
      vista: "gap",
      voci: q.requisiti
        .filter((r) => (q.stati[r.key] === "p" || q.stati[r.key] === "n") && !q.dettagli[r.key]?.azione.trim())
        .map((r) => req(r.key)),
    },
    {
      titolo: "Requisiti conformi senza evidenza",
      vista: "gap",
      voci: q.requisiti.filter((r) => q.stati[r.key] === "c" && !q.dettagli[r.key]?.evidenza.trim()).map((r) => req(r.key)),
    },
    {
      titolo: "Rischi e fornitori",
      vista: "ris",
      voci: [
        ...(daValutare ? [`${daValutare} ${daValutare === 1 ? "rischio" : "rischi"} da valutare`] : []),
        ...q.rischi
          .filter((r) => {
            const l = livello(r);
            return l !== null && l >= q.parametri.alto && !r.misure.trim();
          })
          .map((r) => "senza misure: " + r.testo),
        ...(!fs.fornitori ? ["nessun fornitore censito"] : []),
        ...(fs.fornitori - fs.valutati
          ? [`${fs.fornitori - fs.valutati} ${fs.fornitori - fs.valutati === 1 ? "fornitore" : "fornitori"} senza livello di rischio`]
          : []),
      ],
    },
    {
      titolo: "Politica, obiettivi e piano",
      vista: "pol",
      voci: [
        ...(q.politica.testo.trim().length <= TESTO_POLITICA_MINIMO ? ["testo della politica"] : []),
        ...cat.contenutiPolitica.filter((c) => !q.politica.contenuti.includes(c.key)).map((c) => "politica: " + c.testo.toLowerCase()),
        ...(!q.politica.approvataIl ? ["data di approvazione della politica"] : []),
        ...(q.obiettivi.filter((o) => o.obiettivo.trim()).length < OBIETTIVI_ATTESI ? ["meno di tre obiettivi"] : []),
        ...q.obiettivi
          .filter((o) => o.obiettivo.trim() && (!o.indicatore.trim() || !o.scadenza || !o.responsabile.trim()))
          .map((o) => "obiettivo incompleto: " + o.obiettivo),
        ...(q.attivita.filter((x) => x.attivita.trim()).length < ATTIVITA_ATTESE ? ["piano annuale con meno di otto attività"] : []),
      ],
    },
    {
      titolo: "Indicatori dell'esercizio " + anno,
      vista: "dati",
      voci: cat.indicatori.filter((k) => typeof misure[k.key] !== "number").map((k) => k.nome),
    },
    {
      titolo: "Registrazioni minime dell'esercizio " + anno,
      vista: "reg",
      voci: [
        ...(!g.prove ? ["prova di emergenza (8.2)"] : []),
        ...(!g.comunicazioniInterne ? ["comunicazione interna (7.4.2)"] : []),
        ...(!g.comunicazioniEsterne ? ["comunicazione esterna (7.4.3)"] : []),
        ...(!g.consultazioni ? ["consultazione dei lavoratori (5.4)"] : []),
        ...(!g.formazioni ? ["formazione (7.2)"] : []),
        ...(!g.audit ? ["audit interno svolto (9.2)"] : []),
        ...(!g.riesami ? ["riesame della direzione (9.3)"] : []),
      ],
    },
  ];

  const s = segnali(q, anno, oggi);
  const criticita = s.filter((x) => x.livello === "C").length;
  const c = conformita(statiDelCatalogo(q));
  const a = avanzamento(q, anno);
  const registrazioni = sezioni[sezioni.length - 1].voci.length;
  // «Presentabile»: nessuna criticità, tutto valutato senza non conformità, registrazioni
  // dell'esercizio complete e avanzamento almeno all'85%. La soglia del prototipo.
  const presentabile = criticita === 0 && c.daValutare === 0 && c.nonConformi === 0 && registrazioni === 0 && a.percentuale >= 85;
  return { sezioni, aperte: sezioni.reduce((n, x) => n + x.voci.length, 0), criticita, presentabile };
}
