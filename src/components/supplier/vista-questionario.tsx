"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setAnswerFieldAction } from "@/features/supplier/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";
import { ETICHETTA_RISPOSTA, type PropsVista } from "./types";

// Vista 2 — Questionario, 37 domande su 5 aree.
//
// Le risposte rispondono SUBITO, con stato locale: il salvataggio non rivalida
// la pagina (si compila, non si naviga) e un pulsante che resta immobile per
// qualche secondo si legge come rotto. Il ricalcolo dell'indice è al cambio
// vista o su richiesta esplicita.

const OPZIONI = ["si", "parziale", "no", "na"] as const;

const COLORE_SCELTA: Record<string, string> = {
  si: "bg-success text-white border-success",
  parziale: "bg-warning text-white border-warning",
  no: "bg-destructive text-white border-destructive",
  na: "bg-muted text-muted-foreground border-border",
};

export function VistaQuestionario({ companyId, valutazione, catalogo, stato }: PropsVista) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [areaAperta, setAreaAperta] = useState<string | null>(catalogo.aree[0]?.key ?? null);

  // I salvataggi si accodano: compilando in fretta si possono avere più
  // scritture in volo, e chiedere il ricalcolo mentre l'ultima non è ancora
  // arrivata mostrerebbe un punteggio vecchio. La coda garantisce l'ordine e
  // dà al ricalcolo qualcosa da attendere.
  const coda = useRef<Promise<unknown>>(Promise.resolve());
  const accoda = <T,>(f: () => Promise<T>): Promise<T> => {
    const next = coda.current.then(f, f);
    coda.current = next.catch(() => undefined);
    return next;
  };

  const [risposte, setRisposte] = useState<Record<string, string>>(() =>
    Object.fromEntries(stato.risposte.filter((r) => r.risposta).map((r) => [r.questionKey, r.risposta!])),
  );
  const notaPer = new Map(stato.risposte.map((r) => [r.questionKey, r.nota]));

  async function rispondi(questionKey: string, valore: string) {
    setErrore(null);
    // Ripremere la stessa scelta la annulla: è il modo naturale di correggere
    // un clic sbagliato senza cercare un pulsante "cancella".
    const nuovo = risposte[questionKey] === valore ? "" : valore;
    setRisposte((s) => ({ ...s, [questionKey]: nuovo }));
    const esito = await accoda(() =>
      setAnswerFieldAction(valutazione.id, { questionKey, campo: "risposta", valore: nuovo }),
    );
    if (!esito.ok) {
      setRisposte((s) => ({ ...s, [questionKey]: risposte[questionKey] ?? "" }));
      setErrore(esito.errore);
    }
  }

  async function annota(questionKey: string, valore: string) {
    setErrore(null);
    const esito = await accoda(() =>
      setAnswerFieldAction(valutazione.id, { questionKey, campo: "nota", valore }),
    );
    if (!esito.ok) setErrore(esito.errore);
  }

  async function ricalcola() {
    setInCorso(true);
    // Prima si aspetta che la coda dei salvataggi sia vuota: ricalcolare su
    // scritture non ancora arrivate mostrerebbe un punteggio che non esiste.
    await coda.current;
    await ricalcolaAction(companyId);
    router.refresh();
    setInCorso(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Rispondi solo dove hai un&apos;evidenza documentale da esibire: è quello che il committente potrà
          chiedere. «Non applicabile» è una risposta legittima e non abbassa il punteggio, ma va motivata nella nota.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
            <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      {catalogo.aree.map((area) => {
        const domande = catalogo.domande.filter((q) => q.areaKey === area.key);
        const risposteArea = domande.filter((q) => risposte[q.key]).length;
        const aperta = areaAperta === area.key;
        return (
          <Card key={area.key} className="py-0">
            <CardHeader className="flex-row items-center justify-between gap-4 border-b py-4">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setAreaAperta(aperta ? null : area.key)}
                aria-expanded={aperta}
                aria-label={`${aperta ? "Chiudi" : "Apri"} l'area ${area.nome}`}
              >
                <h2 className="text-[15px] font-semibold tracking-tight">{area.nome}</h2>
                <p className="text-sm text-muted-foreground">
                  peso {area.peso}% sull&apos;indice · {risposteArea} di {domande.length} valutate
                </p>
              </button>
              <Badge variant="outline" data-slot="kpi">{risposteArea}/{domande.length}</Badge>
            </CardHeader>
            {aperta && (
              <CardContent className="grid gap-0 px-0">
                {domande.map((q) => (
                  <div key={q.key} className="border-b px-5 py-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">{q.key}</span>
                          {q.testo}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {q.riferimento} · evidenza attesa: {q.evidenzaAttesa} · peso {q.peso}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1" role="group" aria-label={`Risposta a ${q.key}`}>
                        {OPZIONI.map((o) => {
                          const scelta = risposte[q.key] === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => rispondi(q.key, o)}
                              aria-pressed={scelta}
                              aria-label={`${q.key}: ${ETICHETTA_RISPOSTA[o]}`}
                              className={cn(
                                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                scelta ? COLORE_SCELTA[o] : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                            >
                              {ETICHETTA_RISPOSTA[o]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Textarea
                      rows={2}
                      className="mt-3 text-sm"
                      placeholder="Nota: dove si trova l'evidenza, o perché la domanda non si applica"
                      defaultValue={notaPer.get(q.key) ?? ""}
                      aria-label={`Nota per ${q.key}`}
                      onBlur={(e) => { if (e.target.value !== (notaPer.get(q.key) ?? "")) annota(q.key, e.target.value); }}
                    />
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
