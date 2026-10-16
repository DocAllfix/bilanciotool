import { conformita } from "@/lib/calc/pas/conformita";
import { statoFornitori } from "@/lib/calc/pas/fornitori";
import { derivati, parteOltreTotale } from "@/lib/calc/pas/indicatori";
import { statiDelCatalogo } from "@/lib/calc/pas/quadro";
import { riesamiDelVerbale, statoRegistri } from "@/lib/calc/pas/registri";
import { classe, livello, statoRischi } from "@/lib/calc/pas/rischio";
import { segnali } from "@/lib/calc/pas/segnali";
import { avanzamento } from "@/lib/calc/pas/avanzamento";
import { verifica } from "@/lib/calc/pas/verifica";
import { giorniA } from "@/lib/calc/segnalazioni/termini";
import { quadroDa } from "./quadro";
import type { PercorsoPasAvviato } from "./queries";

// Ciò che la pagina del percorso mostra, calcolato SUL SERVER.
//
// ⚠️ Il giorno lo decide il server (`oggiIso`), mai il browser: l'età di un reclamo o la
// scadenza di un'azione correttiva calcolate nel fuso del processo sbaglierebbero fra
// mezzanotte e le due, e calcolate nel browser renderebbero due numeri diversi fra server e
// client. Il client riceve i numeri fatti.

/** Il catalogo che la verifica usa per scrivere le sue frasi. */
export function catalogoVerifica(p: Pick<PercorsoPasAvviato, "catalogo">) {
  return {
    gruppi: Object.fromEntries(p.catalogo.gruppi.map((g) => [g.key, g.nome])),
    riferimenti: Object.fromEntries(p.catalogo.requisiti.map((x) => [x.key, x.riferimento])),
    contenutiPolitica: p.catalogo.contenutiPolitica.map((c) => ({ key: c.key, testo: c.testo })),
    indicatori: p.catalogo.indicatori.map((k) => ({ key: k.key, nome: k.nome })),
  };
}

/** @param oggi il giorno ITALIANO, `AAAA-MM-GG`. */
export function datiVistaPas(p: PercorsoPasAvviato, anno: number, oggi: string) {
  const q = quadroDa(p);
  const r = p.righe;
  const par = q.parametri;
  const misure = (a: number) => q.misure[a] ?? {};

  return {
    anno,
    oggi,
    azienda: p.azienda,
    archiviata: p.azienda.stato === "archived",
    sistema: p.sistema,
    catalogo: p.catalogo,
    parametri: par,
    fattori: r.fattori,
    parti: r.parti,
    requisiti: r.requisiti,
    rischi: r.rischi.map((x, i) => {
      const liv = livello(q.rischi[i]);
      return { ...x, livello: liv, classe: classe(liv, par) };
    }),
    fornitori: r.fornitori,
    obiettivi: r.obiettivi,
    attivita: r.attivita,
    misure: { corrente: misure(anno), precedente: misure(anno - 1) },
    derivati: { corrente: derivati(misure(anno), par.settimane), precedente: derivati(misure(anno - 1), par.settimane) },
    oltreTotale: parteOltreTotale(misure(anno)),
    // L'età di un reclamo aperto la conta il server, sul giorno italiano: la stessa regola di
    // `statoRegistri`, riga per riga, così il conteggio del riepilogo e le pastiglie coincidono.
    reclami: r.reclami.map((x) => {
      const eta = !x.chiusoIl && x.data ? giorniA(oggi, x.data) : null;
      return { ...x, daSollecitare: eta !== null && eta > par.giorniReclamo };
    }),
    nonConformita: r.nonConformita.map((x) => ({ ...x, scaduta: !x.chiusaIl && !!x.scadenza && x.scadenza < oggi })),
    formazione: r.formazione,
    emergenze: r.emergenze,
    comunicazioni: r.comunicazioni,
    consultazioni: r.consultazioni,
    audit: r.audit,
    riesami: r.riesami,
    riesameDelVerbale: riesamiDelVerbale(r.riesami, anno),
    conformita: conformita(statiDelCatalogo(q)),
    conformitaGruppi: Object.fromEntries(p.catalogo.gruppi.map((g) => [g.key, conformita(statiDelCatalogo(q, g.key))])),
    statoRischi: statoRischi(q.rischi, par),
    statoFornitori: statoFornitori(q.fornitori),
    registri: statoRegistri(q.registri, anno, oggi, par.giorniReclamo),
    segnali: segnali(q, anno, oggi),
    avanzamento: avanzamento(q, anno),
    verifica: verifica(q, anno, oggi, catalogoVerifica(p)),
  };
}

export type DatiVistaPas = ReturnType<typeof datiVistaPas>;
