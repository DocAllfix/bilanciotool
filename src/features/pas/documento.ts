import { conformita } from "@/lib/calc/pas/conformita";
import { statoFornitori } from "@/lib/calc/pas/fornitori";
import { derivati, DERIVATI } from "@/lib/calc/pas/indicatori";
import { statiDelCatalogo } from "@/lib/calc/pas/quadro";
import { riesamiDelVerbale, statoRegistri } from "@/lib/calc/pas/registri";
import { classe, livello, statoRischi } from "@/lib/calc/pas/rischio";
import { segnali } from "@/lib/calc/pas/segnali";
import { avanzamento } from "@/lib/calc/pas/avanzamento";
import { quadroDa } from "./quadro";
import type { PercorsoPasAvviato } from "./queries";

// Il contenuto dei quattro documenti del sistema di gestione sociale, CONGELATO alla
// pubblicazione.
//
// ⚠️ Una sola fotografia per tutti e quattro: il manuale, la politica, il rapporto di
// conformità e il verbale di riesame leggono parti diverse dello stesso stato. Quattro
// costruttori sarebbero quattro posti da tenere allineati.
//
// ⚠️ I DERIVATI si calcolano QUI e si scrivono nello snapshot: è l'unico punto in cui un
// valore derivato si persiste, perché il documento deve dire ciò che era vero il giorno in
// cui è stato firmato.
//
// ⚠️ DAI REGISTRI ENTRANO SOLO CONTEGGI, con un'eccezione. Il collegamento del portale
// cliente è per azienda e serve tutti i documenti pubblicati: l'oggetto di un reclamo o la
// descrizione di una non conformità — che parlano di lavoratori — finirebbero lì dentro.
// L'eccezione sono le DECISIONI del riesame: sono testo dell'alta direzione, ed è il
// contenuto stesso del verbale. È un test (`pas-documenti.db`).

/** Il nome e l'unità di ogni derivato, per i documenti. Il motore conosce solo la chiave. */
export const NOMI_DERIVATI: Record<(typeof DERIVATI)[number]["key"], { nome: string; unita: string }> = {
  ore: { nome: "Ore lavorate", unita: "ore" },
  pctDonne: { nome: "Presenza femminile", unita: "%" },
  pctInd: { nome: "Contratti a tempo indeterminato", unita: "%" },
  pctStran: { nome: "Lavoratori stranieri", unita: "%" },
  pctSomm: { nome: "Lavoratori somministrati o di appaltatori", unita: "%" },
  turnover: { nome: "Tasso di uscita", unita: "%" },
  margCcnl: { nome: "Margine sul minimo contrattuale", unita: "%" },
  gapLw: { nome: "Distanza dal salario dignitoso", unita: "%" },
  payGap: { nome: "Divario retributivo di genere", unita: "%" },
  pctCop: { nome: "Coperti da contratto collettivo", unita: "%" },
  pctStr: { nome: "Incidenza dello straordinario", unita: "% dell'ordinario" },
  oreSett: { nome: "Ore settimanali medie per addetto", unita: "ore" },
  strAdd: { nome: "Straordinario per addetto", unita: "ore" },
  if_: { nome: "Indice di frequenza infortuni", unita: "per 10⁶ ore" },
  ig: { nome: "Indice di gravità", unita: "per 10³ ore" },
  pctSsl: { nome: "Formati sulla sicurezza", unita: "%" },
  oreForm: { nome: "Ore di formazione per addetto", unita: "ore" },
  pctSgs: { nome: "Formati sul sistema di gestione sociale", unita: "%" },
  pctNuovi: { nome: "Neoassunti formati all'ingresso", unita: "%" },
};

/** @param oggi il giorno ITALIANO della firma, `AAAA-MM-GG`. */
export function datiDocumentoPas(p: PercorsoPasAvviato, esercizio: number, oggi: string, generatoIl: Date) {
  const q = quadroDa(p);
  const s = p.sistema;
  const r = p.righe;
  const par = q.parametri;
  const stato = new Map(r.requisiti.map((x) => [x.requisitoKey, x]));
  const m = q.misure[esercizio] ?? {};
  const mp = q.misure[esercizio - 1] ?? {};
  const { corrente, precedente } = riesamiDelVerbale(r.riesami, esercizio);
  const riesame = (x: (typeof r.riesami)[number] | null) =>
    x && {
      data: x.data,
      partecipanti: x.partecipanti,
      comunicatoIl: x.comunicatoIl,
      risorse: x.risorse,
      idoneita: x.idoneita,
      miglioramento: x.miglioramento,
      modifiche: x.modifiche,
      azioni: x.azioni,
    };

  return {
    generatoIl: generatoIl.toISOString(),
    esercizio,
    azienda: { id: p.azienda.id, nome: p.azienda.nome },
    profilo: {
      forma: s.forma, piva: s.piva, sede: s.sede, settore: s.settore, ateco: s.ateco, ccnl: s.ccnl, siti: s.siti,
      campo: s.campo, direzione: s.direzione, responsabile: s.responsabile, rappresentanti: s.rappresentanti, contatto: s.contatto,
    },
    parametri: par,
    politica: { testo: s.politicaTesto ?? "", contenuti: s.politicaContenuti, approvataIl: s.politicaApprovataIl, firma: s.politicaFirma },
    contenutiPolitica: p.catalogo.contenutiPolitica.map((c) => ({ key: c.key, testo: c.testo })),
    fattori: r.fattori.filter((f) => f.descrizione.trim()).map((f) => ({ tipo: f.tipo, descrizione: f.descrizione, effetto: f.effetto })),
    parti: r.parti.filter((x) => x.nome.trim()).map((x) => ({ nome: x.nome, esigenze: x.esigenze, obbligo: x.obbligo, gestita: x.gestita, coinvolgimento: x.coinvolgimento })),
    scale: p.catalogo.scale.map((x) => ({ asse: x.asse, valore: x.valore, nome: x.nome })),
    rischi: r.rischi.map((x, i) => {
      const liv = livello(q.rischi[i]);
      return { area: x.area, ambito: x.ambito, testo: x.testo, probabilita: x.probabilita, gravita: x.gravita, livello: liv, classe: classe(liv, par), misure: x.misure, responsabile: x.responsabile };
    }),
    statoRischi: statoRischi(q.rischi, par),
    fornitori: r.fornitori.map((f) => ({
      nome: f.nome, categoria: f.categoria, paese: f.paese, rischio: f.rischio, clausola: f.clausola, questionario: f.questionario,
      verificatoIl: f.verificatoIl, esito: f.esito,
    })),
    statoFornitori: statoFornitori(q.fornitori),
    conformita: conformita(statiDelCatalogo(q)),
    gruppi: p.catalogo.gruppi.map((g) => ({
      key: g.key,
      natura: g.natura,
      nome: g.nome,
      riferimento: g.riferimento,
      conformita: conformita(statiDelCatalogo(q, g.key)),
      requisiti: p.catalogo.requisiti
        .filter((x) => x.gruppoKey === g.key)
        .map((x) => {
          const st = stato.get(x.key);
          return {
            key: x.key, riferimento: x.riferimento, testo: x.testo, stato: st?.stato ?? null, evidenza: st?.evidenza ?? null,
            azione: st?.azione ?? null, responsabile: st?.responsabile ?? null, scadenza: st?.scadenza ?? null,
          };
        }),
    })),
    obiettivi: r.obiettivi
      .filter((o) => o.obiettivo.trim())
      .map((o) => ({ obiettivo: o.obiettivo, area: o.area, indicatore: o.indicatore, traguardo: o.traguardo, scadenza: o.scadenza, responsabile: o.responsabile, risorse: o.risorse, stato: o.stato })),
    attivita: r.attivita
      .filter((a) => a.attivita.trim())
      .map((a) => ({ mese: a.mese, attivita: a.attivita, riferimento: a.riferimento, responsabile: a.responsabile, stato: a.stato })),
    sezioni: p.catalogo.sezioni.map((x) => ({ key: x.key, nome: x.nome, riferimento: x.riferimento })),
    indicatori: p.catalogo.indicatori.map((k) => ({
      key: k.key, sezione: k.sezioneKey, nome: k.nome, unita: k.unita, valore: m[k.key] ?? null, precedente: mp[k.key] ?? null,
    })),
    derivati: { corrente: derivati(m, par.settimane), precedente: derivati(mp, par.settimane) },
    // Solo conteggi: nessun oggetto, descrizione o istruttoria di un reclamo o di una non conformità.
    registri: {
      corrente: statoRegistri(q.registri, esercizio, oggi, par.giorniReclamo),
      precedente: statoRegistri(q.registri, esercizio - 1, oggi, par.giorniReclamo),
    },
    riesame: { corrente: riesame(corrente), precedente: riesame(precedente) },
    segnali: segnali(q, esercizio, oggi),
    avanzamento: avanzamento(q, esercizio),
  };
}

export type DatiDocumentoPas = ReturnType<typeof datiDocumentoPas>;
