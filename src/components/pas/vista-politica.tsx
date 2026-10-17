"use client";

import { useState } from "react";
import { FileText, ListPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { CampoCasella, Intro, SceltaMese, type Esito } from "@/components/comune/percorso";
import { STATI_ATTIVITA, STATI_OBIETTIVO } from "@/lib/calc/pas/tipi";
import { SceltaVoce, vociAree, type ComandiPas, type DatiPas } from "./comune";

// Politica sociale, obiettivi e piano di lavoro annuale (5.2, 6.2, 8.1.2).
//
// ⚠️ «Inserisci il modello» SCRIVE il testo della politica, e il campo è non controllato
// (salva sfocandosi): per vedere il modello il campo deve rinascere. La `key` sulla
// lunghezza del testo salvato lo fa rinascere solo quando il testo cambia sul server.
//
// ⚠️ «Carica il piano tipo» è idempotente: premuto due volte non duplica niente, lo
// garantisce il database con un vincolo di unicità.

export function VistaPolitica({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const s = dati.sistema;
  const [errore, setErrore] = useState<string | null>(null);
  const id = (c: string) => `pas-pol-${c}`;
  const fai = async (f: () => Promise<Esito>) => {
    setErrore(null);
    const e = await f();
    if (!e.ok) setErrore(e.errore);
  };

  return (
    <div className="space-y-6">
      <Intro titolo="Politica sociale (5.2)">
        L&apos;impegno della direzione, da rendere disponibile a lavoratori, fornitori e parti interessate.{" "}
        {s.politicaContenuti.length} dei {dati.catalogo.contenutiPolitica.length}{" "}contenuti attesi segnati come presenti.
      </Intro>
      {errore && (
        <p role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fai(cmd.modelloPolitica)} data-tour="pas-modello-politica">
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
        <Intro titolo="Obiettivi (6.2)">Misurabili, con un traguardo, una scadenza e chi li porta. Meglio se collegati ai rischi principali.</Intro>
        <Button size="sm" onClick={() => fai(() => cmd.crea("obiettivo"))}>
          <Plus className="size-3.5" /> Nuovo obiettivo
        </Button>
        <div className="mt-3 space-y-2" data-obiettivi>
          {dati.obiettivi.map((o, i) => {
            const salva = (c: string) => cmd.riga("obiettivo", o.id, c);
            const idO = (c: string) => `pas-ob-${o.id}-${c}`;
            return (
              <Card key={o.id} data-obiettivo={o.id}>
                <CardContent className="grid gap-3 pt-4 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <CampoTesto id={idO("obiettivo")} etichetta={`Obiettivo ${i + 1}`} valore={o.obiettivo} salva={salva("obiettivo")} />
                  </div>
                  <div className="sm:col-span-2">
                    <SceltaVoce id={idO("area")} etichetta="Area" valore={o.area} voci={vociAree(dati, true)} salva={salva("area")} />
                  </div>
                  <div className="sm:col-span-2">
                    <CampoTesto id={idO("indicatore")} etichetta="Indicatore" valore={o.indicatore} salva={salva("indicatore")} />
                  </div>
                  <div className="sm:col-span-2">
                    <CampoTesto id={idO("traguardo")} etichetta="Traguardo" valore={o.traguardo} salva={salva("traguardo")} />
                  </div>
                  <div className="sm:col-span-2">
                    <CampoData id={idO("scadenza")} etichetta="Scadenza" valore={o.scadenza} salva={salva("scadenza")} />
                  </div>
                  <div className="sm:col-span-2">
                    <CampoTesto id={idO("responsabile")} etichetta="Responsabile" valore={o.responsabile} salva={salva("responsabile")} />
                  </div>
                  <div className="sm:col-span-2">
                    <CampoTesto id={idO("risorse")} etichetta="Risorse" valore={o.risorse} salva={salva("risorse")} />
                  </div>
                  <CampoScelta id={idO("stato")} etichetta="Stato" valore={o.stato} opzioni={STATI_OBIETTIVO} salva={salva("stato")} />
                  <div className="flex items-end justify-end">
                    <BottoneElimina
                      etichetta={`Elimina l'obiettivo ${i + 1}`}
                      titolo="Eliminare l'obiettivo?"
                      descrizione="L'obiettivo esce dal piano. I documenti già pubblicati non cambiano."
                      onConferma={() => cmd.elimina("obiettivo", o.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <Intro titolo="Piano di lavoro annuale (8.1.2)">Le attività ricorrenti del sistema, mese per mese.</Intro>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fai(cmd.pianoTipo)} data-tour="pas-piano-tipo">
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
                <SceltaMese id={`pas-att-${a.id}-mese`} etichetta={`Mese dell'attività ${i + 1}`} valore={a.mese} salva={cmd.riga("attivita", a.id, "mese")} />
                <div className="sm:col-span-3">
                  <CampoTesto id={`pas-att-${a.id}-attivita`} etichetta="Attività" valore={a.attivita} salva={cmd.riga("attivita", a.id, "attivita")} />
                </div>
                <CampoTesto id={`pas-att-${a.id}-responsabile`} etichetta="Responsabile" valore={a.responsabile} salva={cmd.riga("attivita", a.id, "responsabile")} />
                <CampoScelta id={`pas-att-${a.id}-stato`} etichetta="Stato" valore={a.stato} opzioni={STATI_ATTIVITA} salva={cmd.riga("attivita", a.id, "stato")} />
                <div className="sm:col-span-5">
                  <CampoTesto id={`pas-att-${a.id}-riferimento`} etichetta="Riferimento" valore={a.riferimento} salva={cmd.riga("attivita", a.id, "riferimento")} />
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
