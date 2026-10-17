"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { CampoCasella, Intro, type Esito } from "@/components/comune/percorso";
import { EFFETTI_FATTORE, TIPI_FATTORE } from "@/lib/calc/pas/tipi";
import type { ComandiPas, DatiPas } from "./comune";

// Contesto e parti interessate (4.1, 4.2).
//
// ⚠️ Le otto parti interessate arrivano già impostate all'avvio, ma restano del consulente:
// si correggono, si tolgono, se ne aggiungono. Togliere quella dei lavoratori dei fornitori
// è una scelta che l'ente di certificazione chiederà di motivare.

export function VistaContesto({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const [errore, setErrore] = useState<string | null>(null);
  const fai = async (f: () => Promise<Esito>) => {
    setErrore(null);
    const e = await f();
    if (!e.ok) setErrore(e.errore);
  };
  const descritti = dati.fattori.filter((f) => f.descrizione.trim()).length;

  return (
    <div className="space-y-6">
      <Intro titolo="Fattori interni ed esterni (4.1)">
        Ciò che, dentro e fuori l&apos;organizzazione, incide sui risultati sociali: mercato del lavoro, filiera, territorio,
        organizzazione interna. {descritti}{" "}descritti.
      </Intro>
      {errore && (
        <p role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}
      <Button size="sm" onClick={() => fai(() => cmd.crea("fattore"))} data-tour="pas-nuovo-fattore">
        <Plus className="size-3.5" /> Nuovo fattore
      </Button>
      <div className="space-y-2" data-fattori>
        {dati.fattori.map((f, i) => (
          <Card key={f.id} data-fattore={f.id}>
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-6">
              <CampoScelta id={`pas-fat-${f.id}-tipo`} etichetta={`Tipo del fattore ${i + 1}`} valore={f.tipo} opzioni={TIPI_FATTORE} salva={cmd.riga("fattore", f.id, "tipo")} />
              <div className="sm:col-span-3">
                <CampoTesto id={`pas-fat-${f.id}-descrizione`} etichetta="Fattore" valore={f.descrizione} salva={cmd.riga("fattore", f.id, "descrizione")} />
              </div>
              <CampoScelta id={`pas-fat-${f.id}-effetto`} etichetta="Effetto" valore={f.effetto} opzioni={EFFETTI_FATTORE} salva={cmd.riga("fattore", f.id, "effetto")} />
              <div className="flex items-end justify-end">
                <BottoneElimina
                  etichetta={`Elimina il fattore ${i + 1}`}
                  titolo="Eliminare il fattore?"
                  descrizione="Il fattore esce dall'analisi del contesto. I documenti già pubblicati non cambiano."
                  onConferma={() => cmd.elimina("fattore", f.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {dati.fattori.length === 0 && <p className="text-sm text-muted-foreground">Nessun fattore registrato.</p>}
      </div>

      <div className="pt-2">
        <Intro titolo="Parti interessate (4.2)">
          Chi ha esigenze legittime verso le pratiche sociali dell&apos;organizzazione, quali diventano obblighi, e come la si
          coinvolge.
        </Intro>
        <Button size="sm" onClick={() => fai(() => cmd.crea("parte"))}>
          <Plus className="size-3.5" /> Nuova parte interessata
        </Button>
        <div className="mt-3 space-y-2" data-parti>
          {dati.parti.map((p, i) => {
            const salva = (c: string) => cmd.riga("parte", p.id, c);
            const id = (c: string) => `pas-parte-${p.id}-${c}`;
            const titolo = p.nome?.trim() || `Parte interessata ${i + 1}`;
            return (
              <details key={p.id} className="rounded-lg border bg-card" data-parte={p.id}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {p.obbligo ? "obbligo" : "aspettativa"}
                    {p.gestita ? "" : " · non gestita"}
                  </span>
                </summary>
                <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
                  <CampoTesto id={id("nome")} etichetta="Parte interessata" valore={p.nome} salva={salva("nome")} />
                  <CampoTesto id={id("coinvolgimento")} etichetta="Modalità di coinvolgimento" valore={p.coinvolgimento} salva={salva("coinvolgimento")} />
                  <div className="sm:col-span-2">
                    <CampoTesto id={id("esigenze")} etichetta="Esigenze e aspettative" valore={p.esigenze} multiriga salva={salva("esigenze")} />
                  </div>
                  <CampoCasella id={id("obbligo")} etichetta="L'esigenza è o può diventare un obbligo" valore={p.obbligo} salva={salva("obbligo")} />
                  <CampoCasella id={id("gestita")} etichetta="Il sistema la gestisce" valore={p.gestita} salva={salva("gestita")} />
                  <div className="flex justify-end sm:col-span-2">
                    <BottoneElimina
                      etichetta={`Elimina la parte «${titolo}»`}
                      titolo={`Eliminare «${titolo}»?`}
                      descrizione="La parte interessata esce dall'elenco. I documenti già pubblicati non cambiano."
                      onConferma={() => cmd.elimina("parte", p.id)}
                    />
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
