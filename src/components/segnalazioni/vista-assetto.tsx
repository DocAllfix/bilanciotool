"use client";

import { aggiornaProfiloAction } from "@/features/segnalazioni/actions";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { CONFIGURAZIONI_GESTORE, SI_NO, TITOLI_OBBLIGO } from "@/features/segnalazioni/validation";
import type { DatiSegnalazioni } from "./types";

// L'assetto: chi è obbligato, chi gestisce, da quando.
//
// Alimenta i segnaposto delle 12 procedure e dei 34 moduli del corpus: ciò che resta
// vuoto qui resta evidenziato là.

export function VistaAssetto({ companyId, dati }: { companyId: string; dati: DatiSegnalazioni }) {
  const a = dati.assetto;
  const salva = (campo: string) => (valore: string | null) =>
    aggiornaProfiloAction(companyId, a.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="wb-assetto">
      <p className="text-sm text-muted-foreground">
        Questi dati alimentano i segnaposto delle 12 procedure e dei 34 moduli. Ciò che resta vuoto qui resta
        evidenziato nei documenti: è un promemoria, non un errore.
      </p>

      <Gruppo titolo="Identificazione">
        <CampoTesto id="wb-ragione" etichetta="Ragione sociale" valore={a.ragione} salva={salva("ragione")}
          aiuto="Sostituisce [Nome Organizzazione] nel corpus documentale" />
        <CampoTesto id="wb-forma" etichetta="Forma giuridica" valore={a.formaGiuridica} salva={salva("formaGiuridica")} />
        <CampoTesto id="wb-piva" etichetta="Partita IVA / C.F." valore={a.piva} salva={salva("piva")} />
        <CampoTesto id="wb-sede" etichetta="Sede legale" valore={a.sede} salva={salva("sede")} />
        <CampoTesto id="wb-settore" etichetta="Settore di attività" valore={a.settore} salva={salva("settore")} />
        <CampoTesto id="wb-addetti" etichetta="Media dei lavoratori subordinati nell'ultimo anno"
          valore={a.addetti} salva={salva("addetti")}
          aiuto="Decide anche se il canale può essere condiviso con altri enti: ammesso fino a 249" />
      </Gruppo>

      <Gruppo titolo="Titolo dell'obbligo">
        <CampoScelta id="wb-obbligo" etichetta="Da che cosa nasce l'obbligo" valore={a.obbligo}
          opzioni={TITOLI_OBBLIGO} salva={salva("obbligo")}
          aiuto="L'obbligo sorge anche per il solo fatto di aver adottato il modello 231, e a prescindere da esso" />
        <CampoScelta id="wb-mog" etichetta="Modello 231 adottato" valore={a.mogAdottato} opzioni={SI_NO}
          salva={salva("mogAdottato")} />
        <CampoScelta id="wb-condiviso" etichetta="Canale condiviso con altri enti" valore={a.canaleCondiviso}
          opzioni={SI_NO} salva={salva("canaleCondiviso")}
          aiuto="Ammesso per gli enti fino a 249 lavoratori; la condivisione va formalizzata" />
      </Gruppo>

      <Gruppo titolo="Soggetto gestore">
        <CampoScelta id="wb-gestore-tipo" etichetta="Configurazione" valore={a.gestoreTipo}
          opzioni={CONFIGURAZIONI_GESTORE} salva={salva("gestoreTipo")} />
        <CampoTesto id="wb-gestore" etichetta="Gestore" valore={a.gestore} salva={salva("gestore")}
          aiuto="Sostituisce [Gestore] nel corpus" />
        <CampoTesto id="wb-sostituto" etichetta="Sostituto per i casi di astensione" valore={a.sostituto}
          salva={salva("sostituto")}
          aiuto="Serve quando il gestore è in conflitto sul singolo caso: senza, l'istruttoria si ferma" />
        <CampoData id="wb-nomina" etichetta="Data di nomina" valore={a.nomina} salva={salva("nomina")} />
        <CampoTesto id="wb-organo" etichetta="Organo di indirizzo" valore={a.organoIndirizzo}
          salva={salva("organoIndirizzo")} />
        <CampoTesto id="wb-controllo" etichetta="Organo di controllo" valore={a.organoControllo}
          salva={salva("organoControllo")}
          aiuto="Destinatario della relazione periodica; se i fatti riguardano l'organo di indirizzo, è a lui che si riferisce" />
        <CampoTesto id="wb-dpo" etichetta="Responsabile della protezione dei dati" valore={a.dpo}
          salva={salva("dpo")} />
      </Gruppo>

      <Gruppo titolo="Adozione">
        <CampoData id="wb-sindacale" etichetta="Consultazione sindacale effettuata il"
          valore={a.consultazioneSindacale} salva={salva("consultazioneSindacale")}
          aiuto="Precede l'attivazione del canale: l'omissione è contestabile (art. 4 c. 1)" />
        <CampoData id="wb-adozione" etichetta="Data di adozione della procedura" valore={a.dataAdozione}
          salva={salva("dataAdozione")} />
        <CampoTesto id="wb-revisione" etichetta="Revisione corrente" valore={a.revisione} salva={salva("revisione")} />
        <CampoTesto id="wb-note" etichetta="Note" valore={a.note} multiriga salva={salva("note")} />
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
