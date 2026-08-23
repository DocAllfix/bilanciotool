"use client";

import { aggiornaProfiloAction } from "@/features/mog231/actions";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import type { DatiMog231 } from "./types";

// L'anagrafica dell'ente e la governance del Modello.
//
// Alimenta i segnaposto delle 18 procedure e dei 54 moduli del corpus: ciò che resta
// vuoto qui resta evidenziato là.

export function VistaEnte({ companyId, dati }: { companyId: string; dati: DatiMog231 }) {
  const m = dati.modello;
  const salva = (campo: string) => (valore: string | null) =>
    aggiornaProfiloAction(companyId, m.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="mog-ente">
      <p className="text-sm text-muted-foreground">
        Questi dati alimentano i segnaposto delle 18 procedure e dei 54 moduli del Modello. Ciò che resta vuoto
        qui resta evidenziato nei documenti: è un promemoria, non un errore.
      </p>

      <Gruppo titolo="Identificazione dell'ente">
        <CampoTesto id="mog-ragione" etichetta="Ragione sociale" valore={m.ragione} salva={salva("ragione")}
          aiuto="Sostituisce [Nome Organizzazione] nel corpus documentale" />
        <CampoTesto id="mog-forma" etichetta="Forma giuridica" valore={m.forma} salva={salva("forma")} />
        <CampoTesto id="mog-piva" etichetta="Partita IVA / C.F." valore={m.piva} salva={salva("piva")} />
        <CampoTesto id="mog-sede" etichetta="Sede legale" valore={m.sede} salva={salva("sede")} />
        <CampoTesto id="mog-settore" etichetta="Settore di attività" valore={m.settore} salva={salva("settore")} />
        <CampoTesto id="mog-addetti" etichetta="Numero di addetti" valore={m.addetti} salva={salva("addetti")} />
      </Gruppo>

      <Gruppo titolo="Adozione e governance">
        <CampoTesto id="mog-organo" etichetta="Organo amministrativo" valore={m.organoAmministrativo}
          salva={salva("organoAmministrativo")} aiuto="È l'organo che delibera l'adozione del Modello" />
        <CampoData id="mog-delibera" etichetta="Data della delibera di adozione" valore={m.dataDelibera}
          salva={salva("dataDelibera")}
          aiuto="Deve essere di data certa e anteriore ai fatti eventualmente rilevanti (art. 6 c. 1)" />
        <CampoData id="mog-adozione" etichetta="Data di adozione del Modello" valore={m.dataAdozione}
          salva={salva("dataAdozione")} />
        <CampoTesto id="mog-revisione" etichetta="Revisione corrente" valore={m.revisione} salva={salva("revisione")} />
      </Gruppo>

      <Gruppo titolo="Organismo di Vigilanza">
        <CampoTesto id="mog-odv" etichetta="Composizione dell'Organismo" valore={m.odvComposizione} multiriga
          salva={salva("odvComposizione")}
          aiuto="Autonomia, indipendenza e continuità d'azione sono i requisiti che un giudice verifica" />
        <CampoData id="mog-odv-nomina" etichetta="Data di nomina" valore={m.odvNomina} salva={salva("odvNomina")} />
        <CampoTesto id="mog-canale" etichetta="Canale di segnalazione" valore={m.canaleSegnalazione} multiriga
          salva={salva("canaleSegnalazione")}
          aiuto="Art. 6 c. 2-quater, come modificato dal D.Lgs. 24/2023" />
      </Gruppo>

      <Gruppo titolo="Campo di applicazione">
        <CampoTesto id="mog-scopo" etichetta="Perimetro del Modello" valore={m.scopo} multiriga
          salva={salva("scopo")} aiuto="Sedi, attività e società incluse" />
        <CampoTesto id="mog-esclusioni" etichetta="Esclusioni e motivazione" valore={m.esclusioni} multiriga
          salva={salva("esclusioni")} />
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
