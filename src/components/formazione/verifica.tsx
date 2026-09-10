"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw } from "lucide-react";

import { consegnaVerificaAction } from "@/features/formazione/actions";
import type { Verifica as DatiVerifica } from "@/features/formazione/tipi";
import type { EsitoVerifica } from "@/features/formazione/verifiche";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// La verifica di una sezione.
//
// ⚠️ NON SBLOCCA NIENTE. Il corso d'origine bloccava l'unità successiva finché la
// precedente non era superata: è giusto in un corso obbligatorio, è sbagliato qui, dove chi
// ha già fatto il passo uno deve poter entrare al passo tre — ed è la ragione per cui le
// sezioni hanno id stabili e finiscono nell'indirizzo. La verifica DICE come sei andato.
//
// ⚠️ E la parte che insegna sono le SPIEGAZIONI, non il punteggio. Compaiono dopo la
// consegna, su ogni domanda, giusta o sbagliata che sia: un quiz che dice solo «sbagliato»
// insegna che hai sbagliato.

export function Verifica({
  corso,
  sezione,
  titolo,
  dati,
  esitoIniziale,
}: {
  corso: string;
  sezione: string;
  /** Il titolo della sezione: entra nei nomi accessibili dei comandi. */
  titolo: string;
  dati: DatiVerifica;
  esitoIniziale?: EsitoVerifica;
}) {
  const [scelte, setScelte] = useState<(number | null)[]>(dati.domande.map(() => null));
  const [giuste, setGiuste] = useState<number[] | null>(null);
  const [esito, setEsito] = useState<EsitoVerifica | undefined>(esitoIniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  const risposte = scelte.filter((s) => s !== null).length;
  const consegnata = giuste !== null;

  const consegna = () =>
    avvia(async () => {
      setErrore(null);
      const r = await consegnaVerificaAction({ corso, sezione, scelte });
      if (!r.ok) {
        setErrore(r.errore);
        return;
      }
      setGiuste(r.dati?.giuste ?? null);
      setEsito(r.dati?.esito);
    });

  const riprova = () => {
    setScelte(dati.domande.map(() => null));
    setGiuste(null);
  };

  return (
    <section
      // ⚠️ La MISURA e' quella della lettura, non quella del contenitore. Senza
      // `max-w-prose` il riquadro prende tutta la colonna mentre la prosa sopra sta in
      // sessantacinque battute: un'opzione di tre parole diventa una barra lunga e vuota,
      // e l'occhio deve ripartire da un margine diverso a ogni riga. Si vede solo
      // guardando: tutti i comandi rispondono lo stesso.
      className="mt-8 max-w-prose rounded-xl border bg-card p-5"
      data-verifica={sezione}
      aria-label={`Verifica della sezione ${sezione}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[17px] font-semibold tracking-tight">Verifica</h3>
        <p className="text-[13px] text-muted-foreground">
          {dati.domande.length} domande · ne servono <span data-slot="kpi">{dati.minime}</span> per
          dirsi superata
        </p>
      </div>

      {esito?.superata && !consegnata && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
          <Check className="size-4" /> Già superata — {esito.corrette} su {esito.domande}
        </p>
      )}

      <ol className="mt-4 space-y-5">
        {dati.domande.map((d, i) => {
          const scelta = scelte[i];
          const giusta = giuste?.[i];
          return (
            <li key={i} className="space-y-2" data-domanda={i}>
              <p className="text-[14px] font-medium leading-snug">
                <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                {d.testo}
              </p>
              <div className="space-y-1.5">
                {d.opzioni.map((o, j) => {
                  const scelto = scelta === j;
                  const esatta = consegnata && giusta === j;
                  const sbagliata = consegnata && scelto && giusta !== j;
                  return (
                    <button
                      key={j}
                      type="button"
                      disabled={consegnata}
                      // ⚠️ Il nome accessibile porta il NUMERO della domanda: quattro corsi
                      // con quattro «Sì» producono comandi indistinguibili per un lettore
                      // di schermo, e fermerebbero un collaudo con «resolved to N elements».
                      aria-label={`Domanda ${i + 1}, risposta ${j + 1}: ${o}`}
                      aria-pressed={scelto}
                      onClick={() =>
                        setScelte((prima) => prima.map((s, k) => (k === i ? (s === j ? null : j) : s)))
                      }
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-[13.5px] transition-colors",
                        !consegnata && "hover:bg-accent",
                        scelto && !consegnata && "border-primary bg-primary/5",
                        esatta && "border-primary bg-primary/10",
                        sbagliata && "border-destructive bg-destructive/10",
                      )}
                    >
                      {consegnata && esatta && <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
                      {consegnata && sbagliata && <X className="mt-0.5 size-4 shrink-0 text-destructive" />}
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {consegnata && (
                // La spiegazione compare SEMPRE, anche se hai risposto giusto: è lì che
                // sta il contenuto, non nel punteggio.
                <p
                  data-spiegazione=""
                  className="rounded-md bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground"
                >
                  {d.spiegazione}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!consegnata ? (
          <>
            {/* ⚠️ Il nome accessibile porta il TITOLO della sezione. Un corso ha cinque
                verifiche, quindi cinque «Consegna» identici sulla stessa pagina: per chi
                usa un lettore di schermo sono cinque comandi indistinguibili, e un
                collaudo si ferma con «resolved to 5 elements». È lo stesso difetto dei
                sei requisiti ISO 37001 che citavano tutti il punto 4.5. */}
            <Button
              onClick={consegna}
              disabled={inCorso || risposte === 0}
              aria-label={`Consegna la verifica: ${titolo}`}
            >
              {inCorso ? "Verifico…" : "Consegna"}
            </Button>
            <p className="text-[13px] text-muted-foreground">
              {risposte} di {dati.domande.length} risposte
            </p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "text-[14px] font-medium",
                esito?.superata ? "text-primary" : "text-destructive",
              )}
              data-slot="esito-verifica"
            >
              {esito?.corrette} su {esito?.domande} —{" "}
              {esito && esito.corrette >= dati.minime ? "superata" : "non superata"}
            </p>
            <Button variant="outline" size="sm" onClick={riprova} aria-label={`Riprova la verifica: ${titolo}`}>
              <RotateCcw className="size-3.5" />
              Riprova
            </Button>
            {/* ⚠️ Riprovare non può togliere un superamento già ottenuto: chi rilegge le
                spiegazioni non deve rischiare di «rompere» un esito. Lo garantisce il
                server, che fa l'OR col valore precedente in una sola istruzione. */}
            {esito?.superata && esito.corrette < dati.minime && (
              <p className="text-[13px] text-muted-foreground">
                Il superamento ottenuto in precedenza resta.
              </p>
            )}
          </>
        )}
        {errore && (
          <p role="alert" className="w-full text-[13px] text-destructive">
            {errore}
          </p>
        )}
      </div>
    </section>
  );
}
