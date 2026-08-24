"use client";

import { aggiornaProfiloAction } from "@/features/filiera/actions";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import type { DatiFilieraPieno } from "./types";

// L'anagrafica del programma: chi risponde, verso chi, con quale politica e perimetro.

export function VistaProgramma({ companyId, dati }: { companyId: string; dati: DatiFilieraPieno }) {
  const p = dati.programma;
  const salva = (campo: string) => (valore: string | null) =>
    aggiornaProfiloAction(companyId, p.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="fil-programma">
      <p className="text-sm text-muted-foreground">
        L&apos;anagrafica alimenta i segnaposto delle 14 procedure e dei 56 moduli: cio&apos; che resta vuoto
        qui resta evidenziato nei documenti.
      </p>

      <Gruppo titolo="Identificazione">
        <CampoTesto id="fil-ragione" etichetta="Ragione sociale" valore={p.ragione} salva={salva("ragione")} />
        <CampoTesto id="fil-forma" etichetta="Forma giuridica" valore={p.forma} salva={salva("forma")} />
        <CampoTesto id="fil-piva" etichetta="Partita IVA / C.F." valore={p.piva} salva={salva("piva")} />
        <CampoTesto id="fil-sede" etichetta="Sede legale" valore={p.sede} salva={salva("sede")} />
        <CampoTesto id="fil-settore" etichetta="Settore di attivita'" valore={p.settore} salva={salva("settore")} />
        <CampoTesto id="fil-addetti" etichetta="Numero di addetti" valore={p.addetti} salva={salva("addetti")} />
      </Gruppo>

      <Gruppo titolo="Governo del processo">
        <CampoTesto id="fil-direzione" etichetta="Alta direzione" valore={p.direzione} salva={salva("direzione")}
          aiuto="Chi adotta le procedure e le firma: e' il segnaposto che compare nella loro testata" />
        <CampoTesto id="fil-resp" etichetta="Responsabile della due diligence" valore={p.responsabile} salva={salva("responsabile")} />
        <CampoTesto id="fil-organo" etichetta="Organo a cui riferisce" valore={p.organo} salva={salva("organo")}
          aiuto="Non e' sempre l'alta direzione: chi firma le procedure e chi riceve la relazione possono essere due" />
        <CampoTesto id="fil-reclami" etichetta="Canale di reclamo" valore={p.reclamiCanale} salva={salva("reclamiCanale")}
          aiuto="La direttiva lo pretende accessibile lungo tutta la filiera, non solo ai propri dipendenti" />
      </Gruppo>

      <Gruppo titolo="Politica e perimetro">
        <CampoTesto id="fil-politica" etichetta="Politica di due diligence" valore={p.politica} multiriga salva={salva("politica")} />
        <CampoTesto id="fil-perimetro" etichetta="Perimetro" valore={p.perimetro} multiriga salva={salva("perimetro")} />
        <CampoTesto id="fil-esclusioni" etichetta="Esclusioni motivate" valore={p.esclusioni} multiriga salva={salva("esclusioni")} />
      </Gruppo>

      <Gruppo titolo="Riesame">
        <CampoData id="fil-riesame" etichetta="Data dell'ultimo riesame" valore={p.riesameData} salva={salva("riesameData")}
          aiuto="E' la quarta fase del ciclo OCSE: senza, il processo non si chiude" />
        <CampoTesto id="fil-riesame-esito" etichetta="Esito del riesame" valore={p.riesameEsito} multiriga salva={salva("riesameEsito")} />
      </Gruppo>

      <Gruppo titolo="Adozione">
        <CampoData id="fil-adozione" etichetta="Data di adozione" valore={p.dataAdozione} salva={salva("dataAdozione")} />
        <CampoTesto id="fil-revisione" etichetta="Revisione corrente" valore={p.revisione} salva={salva("revisione")} />
        <CampoTesto id="fil-note" etichetta="Note" valore={p.note} multiriga salva={salva("note")} />
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
