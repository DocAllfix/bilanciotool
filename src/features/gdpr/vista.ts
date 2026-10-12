import { conformita } from "@/lib/calc/gdpr/conformita";
import { statoFornitori, contrattoIncoerente } from "@/lib/calc/gdpr/fornitori";
import { derivati } from "@/lib/calc/gdpr/indicatori";
import { obbligoDpo, statiDelCatalogo } from "@/lib/calc/gdpr/quadro";
import { statoRegistri } from "@/lib/calc/gdpr/registri";
import { completezza, dpiaNecessaria, numeroCriteri, statoRegistro } from "@/lib/calc/gdpr/registro";
import { classe, livello, statoRischi } from "@/lib/calc/gdpr/rischio";
import { segnali, type Tempo } from "@/lib/calc/gdpr/segnali";
import { avanzamento } from "@/lib/calc/gdpr/avanzamento";
import { verifica } from "@/lib/calc/gdpr/verifica";
import { limiteNotifica, scadenzaRichiesta, statoRichiesta, statoViolazione } from "@/lib/calc/gdpr/termini";
import { giornoItaliano, oraItaliana } from "@/lib/calc/comune/tempo-italia";
import { quadroDa } from "./quadro";
import type { PercorsoGdprAvviato } from "./queries";

// Ciò che la pagina del percorso mostra, calcolato SUL SERVER.
//
// ⚠️ Il giorno e l'istante li decide il server (`oggiIso`, `new Date()`), mai il browser:
// la scadenza di una richiesta o le 72 ore di una violazione calcolate nel fuso del
// processo sbaglierebbero di due ore su Vercel, e calcolate nel browser renderebbero due
// numeri diversi fra server e client. Il client riceve i numeri fatti.
//
// ⚠️ Gli istanti delle violazioni arrivano al client già in ORA ITALIANA, nel formato del
// campo `datetime-local` (`AAAA-MM-GGThh:mm`): il campo lo rimanda così com'è, e il server
// lo riconverte con le regole italiane dell'ora legale.

const inCampo = (d: Date | string | null) => {
  if (!d) return null;
  const x = new Date(d);
  return `${giornoItaliano(x)}T${oraItaliana(x)}`;
};
const leggibile = (iso: string | null) => (iso ? inCampo(iso)!.replace("T", " ") : null);

export function datiVistaGdpr(p: PercorsoGdprAvviato, anno: number, t: Tempo) {
  const q = quadroDa(p);
  const r = p.righe;
  const par = q.parametri;
  const misure = (a: number) =>
    Object.fromEntries(r.misure.filter((m) => m.anno === a).map((m) => [m.indicatoreKey, Number(m.valore)]));

  return {
    anno,
    oggi: t.oggi,
    azienda: p.azienda,
    archiviata: p.azienda.stato === "archived",
    sistema: p.sistema,
    catalogo: p.catalogo,
    dpo: obbligoDpo(q.profilo),
    parametri: par,
    trattamenti: r.trattamenti.map((x, i) => {
      const tr = q.trattamenti[i];
      const liv = livello(tr);
      return { ...x, livello: liv, classe: classe(liv, par), dpiaNecessaria: dpiaNecessaria(tr, par), numeroCriteri: numeroCriteri(tr), completezza: completezza(tr) };
    }),
    requisiti: r.requisiti,
    fornitori: r.fornitori.map((f, i) => ({ ...f, incoerente: contrattoIncoerente(q.fornitori[i]) })),
    documenti: r.documenti,
    attivita: r.attivita,
    misure: { corrente: misure(anno), precedente: misure(anno - 1) },
    derivati: { corrente: derivati(misure(anno)), precedente: derivati(misure(anno - 1)) },
    richieste: r.richieste.map((x, i) => ({
      ...x,
      scadenza: scadenzaRichiesta(q.registri.richieste[i]),
      termine: statoRichiesta(q.registri.richieste[i], t.oggi),
    })),
    violazioni: r.violazioni.map((x, i) => {
      const v = q.registri.violazioni[i];
      return {
        ...x,
        conoscenzaIl: inCampo(x.conoscenzaIl),
        notificataIl: inCampo(x.notificataIl),
        limite: leggibile(limiteNotifica(v)),
        termine: statoViolazione(v, t.adesso),
      };
    }),
    formazione: r.formazione,
    verifiche: r.verifiche,
    verificheAds: r.verificheAds,
    riesami: r.riesami,
    conformita: conformita(statiDelCatalogo(q)),
    conformitaGruppi: Object.fromEntries(p.catalogo.gruppi.map((g) => [g.key, conformita(statiDelCatalogo(q, g.key))])),
    registro: statoRegistro(q.trattamenti, par),
    rischi: statoRischi(q.trattamenti, par),
    statoFornitori: statoFornitori(q.fornitori),
    registri: statoRegistri(q.registri, anno, t.oggi, t.adesso),
    segnali: segnali(q, anno, t),
    avanzamento: avanzamento(q, anno, t.oggi, t.adesso),
    verifica: verifica(q, anno, t, {
      gruppi: Object.fromEntries(p.catalogo.gruppi.map((g) => [g.key, g.nome])),
      riferimenti: Object.fromEntries(p.catalogo.requisiti.map((x) => [x.key, x.riferimento])),
      contenutiPolitica: p.catalogo.contenutiPolitica.map((c) => ({ key: c.key, testo: c.testo })),
      indicatori: p.catalogo.indicatori.map((k) => ({ key: k.key, nome: k.nome })),
    }),
  };
}

export type DatiVistaGdpr = ReturnType<typeof datiVistaGdpr>;
