"use client";

import { aggiornaProfiloAction } from "@/features/sa8000/actions";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import type { DatiSa8000 } from "./types";

// L'anagrafica del sistema. Vale il 15% del completamento: sono dodici campi, e sono
// quelli che il corpus usa nei segnaposto.

export function VistaAnagrafica({ companyId, dati }: { companyId: string; dati: DatiSa8000 }) {
  const s = dati.sistema;
  const salva = (campo: string) => (valore: string | null) =>
    aggiornaProfiloAction(companyId, s.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="sa-anagrafica">
      <p className="text-sm text-muted-foreground">
        Dodici campi obbligatori, {dati.dettaglio.anagraficaCompilati} compilati. Alimentano i segnaposto delle
        22 procedure e dei 104 moduli: cio&apos; che resta vuoto qui resta evidenziato nei documenti.
      </p>

      <Gruppo titolo="Identificazione">
        <CampoTesto id="sa-ragione" etichetta="Ragione sociale" valore={s.ragione} salva={salva("ragione")} />
        <CampoTesto id="sa-forma" etichetta="Forma giuridica" valore={s.forma} salva={salva("forma")} />
        <CampoTesto id="sa-piva" etichetta="Partita IVA / C.F." valore={s.piva} salva={salva("piva")} />
        <CampoTesto id="sa-sede" etichetta="Sede legale" valore={s.sede} salva={salva("sede")} />
        <CampoTesto id="sa-settore" etichetta="Settore di attivita'" valore={s.settore} salva={salva("settore")} />
        <CampoTesto id="sa-addetti" etichetta="Numero di addetti" valore={s.addetti} salva={salva("addetti")} />
      </Gruppo>

      <Gruppo titolo="Rappresentanza e canale di reclamo">
        <CampoTesto id="sa-ccnl" etichetta="Contratto collettivo applicato" valore={s.ccnl} salva={salva("ccnl")}
          aiuto="E' il riferimento di ogni criterio su orario, retribuzione e contratti: senza, quei criteri non si possono valutare" />
        <CampoTesto id="sa-direzione" etichetta="Rappresentante della direzione" valore={s.direzione} salva={salva("direzione")} />
        <CampoTesto id="sa-resp" etichetta="Rappresentante SA8000 dei lavoratori" valore={s.respSa} salva={salva("respSa")}
          aiuto="Eletto dai lavoratori, non nominato dalla direzione: lo Standard lo pretende" />
        <CampoTesto id="sa-reclami" etichetta="Canale di reclamo" valore={s.reclamiEmail} salva={salva("reclamiEmail")}
          aiuto="Deve essere raggiungibile da chi lavora, anche da chi non ha una postazione" />
        <CampoTesto id="sa-sito" etichetta="Sito dove la politica e' pubblicata" valore={s.sitoWeb} salva={salva("sitoWeb")}
          aiuto="Lo Standard chiede che la politica sia accessibile: qui va l'indirizzo dove chiunque puo' leggerla" />
      </Gruppo>

      <Gruppo titolo="Campo di applicazione">
        <CampoTesto id="sa-scopo" etichetta="Campo di applicazione" valore={s.scopo} multiriga salva={salva("scopo")} />
        <CampoTesto id="sa-siti" etichetta="Siti inclusi" valore={s.siti} multiriga salva={salva("siti")} />
      </Gruppo>

      <Gruppo titolo="Adozione">
        <CampoData id="sa-adozione" etichetta="Data di adozione" valore={s.dataAdozione} salva={salva("dataAdozione")} />
        <CampoTesto id="sa-revisione" etichetta="Revisione corrente" valore={s.revisione} salva={salva("revisione")} />
        <CampoTesto id="sa-note" etichetta="Note" valore={s.note} multiriga salva={salva("note")} />
      </Gruppo>
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h2>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
