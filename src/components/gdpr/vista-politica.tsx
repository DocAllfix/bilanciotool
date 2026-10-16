"use client";

import { useState } from "react";
import { FileText, ListPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SceltaMese } from "@/components/comune/percorso";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import domini from "@/lib/db/seeds/data/gdpr-domini.json";
import { STATI_ATTIVITA } from "@/features/gdpr/validation";
import { CampoCasella, Intro, type ComandiGdpr, type DatiGdpr, type Esito } from "./comune";

// Vista 5 — Politica, documenti e piano annuale.
//
// ⚠️ «Inserisci il modello» SCRIVE il testo della politica, e il campo è non controllato
// (salva sfocandosi): per vedere il modello il campo deve rinascere. La `key` sulla
// lunghezza del testo salvato lo fa rinascere solo quando il testo cambia sul server.
//
// ⚠️ «Carica l'elenco tipo» e «Carica il piano tipo» sono idempotenti: premuti due volte
// non duplicano niente, lo garantisce il database con un vincolo di unicità.


export function VistaPolitica({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const s = dati.sistema;
  const [errore, setErrore] = useState<string | null>(null);
  const id = (c: string) => `gdpr-pol-${c}`;
  const fai = async (f: () => Promise<Esito>) => {
    setErrore(null);
    const e = await f();
    if (!e.ok) setErrore(e.errore);
  };

  return (
    <div className="space-y-6">
      <Intro titolo="Politica per la protezione dei dati">
        Il documento con cui il titolare dichiara i propri impegni (art. 24, par. 2). {s.politicaContenuti.length} dei{" "}
        {dati.catalogo.contenutiPolitica.length}{" "}contenuti attesi segnati come presenti.
      </Intro>
      {errore && (
        <p role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fai(cmd.modelloPolitica)} data-tour="gdpr-modello-politica">
              <FileText className="size-3.5" /> {s.politicaTesto ? "Sostituisci col modello" : "Inserisci il modello"}
            </Button>
          </div>
          <CampoTesto
            key={(s.politicaTesto ?? "").length}
            id={id("testo")}
            etichetta="Testo della politica"
            valore={s.politicaTesto}
            multiriga
            salva={cmd.sistema("politicaTesto")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoData id={id("approvataIl")} etichetta="Approvata il" valore={s.politicaApprovataIl} salva={cmd.sistema("politicaApprovataIl")} />
            <CampoTesto id={id("firma")} etichetta="Approvata da" valore={s.politicaFirma} salva={cmd.sistema("politicaFirma")} />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Contenuti attesi</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {dati.catalogo.contenutiPolitica.map((c) => (
                <CampoCasella
                  key={c.key}
                  id={id(`contenuto-${c.key}`)}
                  etichetta={c.testo}
                  valore={s.politicaContenuti.includes(c.key)}
                  salva={(acceso) => cmd.contenuto(c.key, acceso)}
                />
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Intro titolo="Inventario dei documenti">Le procedure, le informative e gli atti che il sistema deve avere, con versione e revisione.</Intro>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fai(cmd.documentiTipo)}>
            <ListPlus className="size-3.5" /> Carica l&apos;elenco tipo
          </Button>
          <Button size="sm" onClick={() => fai(() => cmd.crea("documento"))}>
            <Plus className="size-3.5" /> Nuovo documento
          </Button>
        </div>
        <div className="space-y-2" data-documenti>
          {dati.documenti.map((d, i) => (
            <Card key={d.id} data-documento={d.id}>
              <CardContent className="grid gap-3 pt-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <CampoScelta id={`gdpr-doc-${d.id}-tipo`} etichetta={`Tipo del documento ${i + 1}`} valore={d.tipo} opzioni={domini.tipiDocumento} salva={cmd.riga("documento", d.id, "tipo")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={`gdpr-doc-${d.id}-oggetto`} etichetta="Oggetto" valore={d.oggetto} salva={cmd.riga("documento", d.id, "oggetto")} />
                </div>
                <CampoTesto id={`gdpr-doc-${d.id}-versione`} etichetta="Versione" valore={d.versione} salva={cmd.riga("documento", d.id, "versione")} />
                <CampoScelta id={`gdpr-doc-${d.id}-stato`} etichetta="Stato" valore={d.stato} opzioni={domini.statiDocumento} salva={cmd.riga("documento", d.id, "stato")} />
                <div className="sm:col-span-2">
                  <CampoData id={`gdpr-doc-${d.id}-adottatoIl`} etichetta="Adottato il" valore={d.adottatoIl} salva={cmd.riga("documento", d.id, "adottatoIl")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoData id={`gdpr-doc-${d.id}-revisioneIl`} etichetta="Prossima revisione" valore={d.revisioneIl} salva={cmd.riga("documento", d.id, "revisioneIl")} />
                </div>
                <div className="flex items-end justify-end sm:col-span-2">
                  <BottoneElimina
                    etichetta={`Elimina il documento ${i + 1}`}
                    titolo="Eliminare il documento dall'inventario?"
                    descrizione="La voce esce dall'inventario. I documenti già pubblicati non cambiano."
                    onConferma={() => cmd.elimina("documento", d.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Intro titolo="Piano annuale">Le attività ricorrenti del sistema, mese per mese.</Intro>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fai(cmd.pianoTipo)}>
            <ListPlus className="size-3.5" /> Carica il piano tipo
          </Button>
          <Button size="sm" onClick={() => fai(() => cmd.crea("attivita"))}>
            <Plus className="size-3.5" /> Nuova attività
          </Button>
        </div>
        <div className="space-y-2" data-piano>
          {dati.attivita.map((a, i) => (
            <Card key={a.id} data-attivita={a.id}>
              <CardContent className="grid gap-3 pt-4 sm:grid-cols-6">
                <SceltaMese id={`gdpr-att-${a.id}-mese`} etichetta={`Mese dell'attività ${i + 1}`} valore={a.mese} salva={cmd.riga("attivita", a.id, "mese")} />
                <div className="sm:col-span-3">
                  <CampoTesto id={`gdpr-att-${a.id}-attivita`} etichetta="Attività" valore={a.attivita} salva={cmd.riga("attivita", a.id, "attivita")} />
                </div>
                <CampoTesto id={`gdpr-att-${a.id}-responsabile`} etichetta="Responsabile" valore={a.responsabile} salva={cmd.riga("attivita", a.id, "responsabile")} />
                <CampoScelta id={`gdpr-att-${a.id}-stato`} etichetta="Stato" valore={a.stato} opzioni={STATI_ATTIVITA} salva={cmd.riga("attivita", a.id, "stato")} />
                <div className="sm:col-span-5">
                  <CampoTesto id={`gdpr-att-${a.id}-riferimento`} etichetta="Riferimento" valore={a.riferimento} salva={cmd.riga("attivita", a.id, "riferimento")} />
                </div>
                <div className="flex items-end justify-end">
                  <BottoneElimina
                    etichetta={`Elimina l'attività ${i + 1}`}
                    titolo="Eliminare l'attività dal piano?"
                    descrizione="L'attività esce dal piano annuale. I documenti già pubblicati non cambiano."
                    onConferma={() => cmd.elimina("attivita", a.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
