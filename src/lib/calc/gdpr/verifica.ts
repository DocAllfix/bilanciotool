// La verifica: che cosa oggi non si potrebbe mostrare a un'ispezione.
//
// È il blocco «Verifica» del prototipo, sezione per sezione e nello stesso ordine. Le voci
// nominano la cosa da sistemare; per i requisiti si usa il nome del gruppo e il
// riferimento normativo, come nel prototipo.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { obbligoDpo, statiDelCatalogo, type Quadro } from "./quadro";
import { statoRegistri } from "./registri";
import { completezza, statoRegistro } from "./registro";
import { livello } from "./rischio";
import { segnali, type Tempo, type Vista } from "./segnali";
import { avanzamento } from "./avanzamento";

export type SezioneVerifica = { titolo: string; voci: string[]; vista: Vista };

const ETICHETTE_PROFILO = {
  forma: "forma giuridica",
  sede: "sede",
  settore: "settore",
  ateco: "codice ATECO",
  dipendenti: "numero di dipendenti",
  legale: "legale rappresentante",
  referente: "referente interno",
  contatto: "recapito per gli interessati",
  amministratori: "presenza di amministratori di sistema",
} as const;

/** Contenuti attesi della politica, per chiave, con il loro testo. */
export type CatalogoVerifica = {
  gruppi: Readonly<Record<string, string>>;
  riferimenti: Readonly<Record<string, string>>;
  contenutiPolitica: readonly { key: string; testo: string }[];
  indicatori: readonly { key: string; nome: string }[];
};

const DOCUMENTI_ATTESI = 6;
const ATTIVITA_ATTESE = 8;
const TESTO_POLITICA_MINIMO = 200;

export function verifica(q: Quadro, anno: number, t: Tempo, cat: CatalogoVerifica) {
  const p = q.profilo;
  const d = obbligoDpo(p);
  const ts = statoRegistro(q.trattamenti, q.parametri);
  const fs = statoFornitori(q.fornitori);
  const g = statoRegistri(q.registri, anno, t.oggi, t.adesso);
  const nome = (n: string) => n || "senza nome";
  const req = (key: string) => `${cat.gruppi[q.requisiti.find((r) => r.key === key)?.gruppo ?? ""] ?? ""} ${cat.riferimenti[key] ?? key}`.trim();
  const misure = q.misure[anno] ?? {};

  const sezioni: SezioneVerifica[] = [
    {
      titolo: "Organizzazione e ruoli",
      vista: "org",
      voci: [
        ...(Object.keys(ETICHETTE_PROFILO) as (keyof typeof ETICHETTE_PROFILO)[])
          .filter((k) => !String(p[k] ?? "").trim())
          .map((k) => ETICHETTE_PROFILO[k]),
        ...(!d.valutato
          ? ["valutazione dell'obbligo di designare il responsabile della protezione dei dati"]
          : d.obbligatorio && !d.designato
            ? ["designazione del responsabile della protezione dei dati"]
            : []),
      ],
    },
    {
      titolo: "Registro dei trattamenti",
      vista: "trat",
      voci: [
        ...(!ts.trattamenti ? ["nessun trattamento censito"] : []),
        ...q.trattamenti.filter((x) => completezza(x) < 1).map((x) => "campi mancanti: " + nome(x.nome)),
        ...ts.senzaCondizione9.map((n) => "condizione dell'art. 9.2: " + nome(n)),
        ...ts.senzaBilanciamento.map((n) => "bilanciamento degli interessi: " + nome(n)),
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
      titolo: "Rischi e valutazioni d'impatto",
      vista: "ris",
      voci: [
        ...q.trattamenti.filter((x) => livello(x) === null).map((x) => "rischio da valutare: " + nome(x.nome)),
        ...ts.dpiaMancanti.map((n) => "valutazione d'impatto da concludere: " + nome(n)),
        ...q.trattamenti
          .filter((x) => {
            const l = livello(x);
            return l !== null && l >= q.parametri.alto && !x.mitigazione.trim();
          })
          .map((x) => "misure di mitigazione: " + nome(x.nome)),
      ],
    },
    {
      titolo: "Responsabili e trasferimenti",
      vista: "ris",
      voci: [
        ...(!fs.fornitori ? ["nessun fornitore censito"] : []),
        ...q.fornitori.filter((f) => !f.contratto || !f.garanzia).map((f) => "contratto o trasferimento da indicare: " + nome(f.nome)),
        ...q.fornitori
          .filter((f) => f.contratto && f.contratto !== "Sì" && fs.senzaContratto.includes(f.nome))
          .map((f) => "contratto art. 28: " + nome(f.nome)),
        ...fs.garanziaDaDefinire.map((n) => "garanzia per il trasferimento: " + nome(n)),
      ],
    },
    {
      titolo: "Politica, documenti e piano",
      vista: "pol",
      voci: [
        ...(q.politica.testo.trim().length <= TESTO_POLITICA_MINIMO ? ["testo della politica"] : []),
        ...cat.contenutiPolitica.filter((c) => !q.politica.contenuti.includes(c.key)).map((c) => "politica: " + c.testo.toLowerCase()),
        ...(!q.politica.approvataIl ? ["data di approvazione della politica"] : []),
        ...(q.documenti.filter((x) => x.oggetto.trim()).length < DOCUMENTI_ATTESI ? ["meno di sei documenti in elenco"] : []),
        ...q.documenti.filter((x) => x.oggetto.trim() && x.stato !== "Adottato").map((x) => x.stato.toLowerCase() + ": " + x.oggetto),
        ...(q.attivita.filter((x) => x.attivita.trim()).length < ATTIVITA_ATTESE ? ["piano annuale con meno di otto attività"] : []),
      ],
    },
    {
      titolo: "Indicatori dell'esercizio " + anno,
      vista: "dati",
      voci: cat.indicatori.filter((k) => typeof misure[k.key] !== "number").map((k) => k.nome),
    },
    {
      titolo: "Registrazioni dell'esercizio " + anno,
      vista: "reg",
      voci: [
        ...(!g.formazioni ? ["formazione (art. 29)"] : []),
        ...(!g.verifiche ? ["audit o verifica (art. 24)"] : []),
        ...(p.amministratori === "Sì" && !g.verificheAds ? ["verifica degli amministratori di sistema"] : []),
        ...(!g.riesami ? ["riesame annuale"] : []),
        ...(g.scadute ? [g.scadute + " richieste scadute"] : []),
        ...(g.violazioniAperte ? [g.violazioniAperte + " violazioni non chiuse"] : []),
      ],
    },
  ];

  const s = segnali(q, anno, t);
  const criticita = s.filter((x) => x.livello === "C").length;
  const c = conformita(statiDelCatalogo(q));
  const a = avanzamento(q, anno, t.oggi, t.adesso);
  const registrazioni = sezioni[sezioni.length - 1].voci.length;
  // «Dimostrabile»: nessuna criticità, registro non vuoto, tutto valutato senza non
  // conformità, registrazioni dell'esercizio complete e avanzamento almeno all'85%.
  const dimostrabile =
    criticita === 0 && ts.trattamenti > 0 && c.daValutare === 0 && c.nonConformi === 0 && registrazioni === 0 && a.percentuale >= 85;
  return { sezioni, aperte: sezioni.reduce((n, x) => n + x.voci.length, 0), criticita, dimostrabile };
}
