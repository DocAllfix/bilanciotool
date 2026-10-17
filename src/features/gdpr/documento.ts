import { conformita } from "@/lib/calc/gdpr/conformita";
import { statoFornitori } from "@/lib/calc/gdpr/fornitori";
import { derivati, DERIVATI } from "@/lib/calc/gdpr/indicatori";
import { obbligoDpo, statiDelCatalogo } from "@/lib/calc/gdpr/quadro";
import { statoRegistri } from "@/lib/calc/gdpr/registri";
import { completezza, dpiaNecessaria, numeroCriteri, statoRegistro } from "@/lib/calc/gdpr/registro";
import { classe, livello, statoRischi } from "@/lib/calc/gdpr/rischio";
import { segnali, type Tempo } from "@/lib/calc/gdpr/segnali";
import { avanzamento } from "@/lib/calc/gdpr/avanzamento";
import { quadroDa } from "./quadro";
import type { PercorsoGdprAvviato } from "./queries";

// Il contenuto dei sei documenti della protezione dei dati, CONGELATO alla pubblicazione.
//
// ⚠️ Una sola fotografia per tutti e sei: il registro, il modello, la politica, le
// valutazioni d'impatto, il rapporto di conformità e la relazione annuale leggono parti
// diverse dello stesso stato. Sei costruttori sarebbero sei posti da tenere allineati.
//
// ⚠️ I DERIVATI si calcolano QUI e si scrivono nello snapshot: è l'unico punto in cui un
// valore derivato si persiste, e lo fa perché il documento deve dire ciò che era vero il
// giorno in cui è stato firmato, anche se domani le soglie cambiano.
//
// ⚠️ DAI REGISTRI DELLE RICHIESTE E DELLE VIOLAZIONI ENTRANO SOLO CONTEGGI. Il collegamento
// del portale cliente è per azienda e serve tutti i documenti pubblicati: una descrizione
// o una nota libera di una violazione finirebbe lì dentro. È il perimetro dei documenti del
// prototipo, ed è un test (`gdpr-documenti.db`).

export function datiDocumentoGdpr(pTutto: PercorsoGdprAvviato, esercizio: number, t: Tempo) {
  // ⚠️ Un trattamento PROPOSTO all'avvio e mai toccato non è un trattamento censito: nel
  // registro consegnato non entra. Si filtra QUI, all'ingresso, perché il quadro e l'elenco
  // si allineano per indice.
  const p = { ...pTutto, righe: { ...pTutto.righe, trattamenti: pTutto.righe.trattamenti.filter((x) => !x.propostaMotivo) } };
  const q = quadroDa(p);
  const s = p.sistema;
  const r = p.righe;
  const par = q.parametri;
  const stato = new Map(r.requisiti.map((x) => [x.requisitoKey, x]));
  const misure = (anno: number) => Object.fromEntries(r.misure.filter((m) => m.anno === anno).map((m) => [m.indicatoreKey, Number(m.valore)]));
  const m = misure(esercizio);
  const mp = misure(esercizio - 1);

  return {
    generatoIl: t.adesso.toISOString(),
    esercizio,
    azienda: { id: p.azienda.id, nome: p.azienda.nome },
    profilo: {
      forma: s.forma, piva: s.piva, sede: s.sede, settore: s.settore, ateco: s.ateco, dipendenti: s.dipendenti, siti: s.siti,
      ruolo: s.ruolo, legale: s.legale, referente: s.referente, contatto: s.contatto, amministratori: s.amministratori,
      dpoNome: s.dpoNome, dpoContatti: s.dpoContatti, dpoComunicatoIl: s.dpoComunicatoIl,
    },
    dpo: obbligoDpo(q.profilo),
    parametri: par,
    politica: { testo: s.politicaTesto ?? "", contenuti: s.politicaContenuti, approvataIl: s.politicaApprovataIl, firma: s.politicaFirma },
    contenutiPolitica: p.catalogo.contenutiPolitica.map((c) => ({ key: c.key, testo: c.testo })),
    criteri: p.catalogo.criteri.map((c) => ({ key: c.key, testo: c.testo })),
    scale: p.catalogo.scale.map((x) => ({ asse: x.asse, valore: x.valore, nome: x.nome, descrizione: x.descrizione })),
    trattamenti: r.trattamenti.map((x, i) => {
      const tr = q.trattamenti[i];
      const liv = livello(tr);
      return {
        nome: x.nome, ruolo: x.ruolo, funzione: x.funzione, finalita: x.finalita, base: x.base, bilanciamento: x.bilanciamento,
        interessati: x.interessati, dati: x.dati, particolari: x.particolari, condizione9: x.condizione9, giudiziari: x.giudiziari,
        destinatari: x.destinatari, trasferimento: x.trasferimento, trasferimentoDettaglio: x.trasferimentoDettaglio,
        conservazione: x.conservazione, sistemi: x.sistemi, misure: x.misure,
        criteri: x.criteri, numeroCriteri: numeroCriteri(tr), dpiaNecessaria: dpiaNecessaria(tr, par),
        probabilita: x.probabilita, gravita: x.gravita, livello: liv, classe: classe(liv, par), mitigazione: x.mitigazione,
        dpiaStato: x.dpiaStato, dpiaData: x.dpiaData, dpiaNecessita: x.dpiaNecessita, dpiaParere: x.dpiaParere, dpiaEsito: x.dpiaEsito,
        completezza: completezza(tr),
      };
    }),
    registro: statoRegistro(q.trattamenti, par),
    rischi: statoRischi(q.trattamenti, par),
    fornitori: r.fornitori.map((f) => ({
      nome: f.nome, servizio: f.servizio, qualifica: f.qualifica, paese: f.paese, contratto: f.contratto, garanzia: f.garanzia,
      verificatoIl: f.verificatoIl, esito: f.esito,
    })),
    statoFornitori: statoFornitori(q.fornitori),
    conformita: conformita(statiDelCatalogo(q)),
    gruppi: p.catalogo.gruppi.map((g) => ({
      key: g.key,
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
    documenti: r.documenti.map((d) => ({ tipo: d.tipo, oggetto: d.oggetto, versione: d.versione, adottatoIl: d.adottatoIl, revisioneIl: d.revisioneIl, stato: d.stato })),
    attivita: r.attivita.map((a) => ({ mese: a.mese, attivita: a.attivita, riferimento: a.riferimento, responsabile: a.responsabile, stato: a.stato })),
    sezioni: p.catalogo.sezioni.map((x) => ({ key: x.key, nome: x.nome, riferimento: x.riferimento })),
    indicatori: p.catalogo.indicatori.map((k) => ({
      key: k.key, sezione: k.sezioneKey, nome: k.nome, unita: k.unita, valore: m[k.key] ?? null, precedente: mp[k.key] ?? null,
    })),
    derivati: { corrente: derivati(m), precedente: derivati(mp), definizioni: DERIVATI.map((d) => ({ key: d.key, unita: d.unita })) },
    // Solo conteggi: nessuna descrizione, nota o riferimento di una richiesta o violazione.
    registri: { corrente: statoRegistri(q.registri, esercizio, t.oggi, t.adesso), precedente: statoRegistri(q.registri, esercizio - 1, t.oggi, t.adesso) },
    riesame: (() => {
      const nell = r.riesami.filter((x) => x.data?.startsWith(String(esercizio)));
      const questo = nell[0] ?? null;
      const precedente = r.riesami.find((x) => x.data && (!questo || x.data < (questo.data ?? ""))) ?? null;
      const riga = (x: (typeof r.riesami)[number] | null) =>
        x && { data: x.data, partecipanti: x.partecipanti, relazione: x.relazione, adeguatezza: x.adeguatezza, miglioramento: x.miglioramento, azioni: x.azioni };
      return { corrente: riga(questo), precedente: riga(precedente) };
    })(),
    segnali: segnali(q, esercizio, t),
    avanzamento: avanzamento(q, esercizio, t.oggi, t.adesso),
  };
}

export type DatiDocumentoGdpr = ReturnType<typeof datiDocumentoGdpr>;
