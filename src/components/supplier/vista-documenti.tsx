"use client";

import { useState } from "react";
import { setAnswerFieldAction } from "@/features/supplier/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETICHETTA_DOCUMENTO, type PropsVista } from "./types";

// Vista 5 — Evidenze documentali.
//
// Ogni domanda attende un documento preciso: è quello che il committente può
// chiedere di vedere. Questa vista è la lista della spesa, e serve a sapere
// cosa esiste davvero prima di dichiararlo nel questionario.

const STATI = ["disponibile", "da_aggiornare", "assente"] as const;

const COLORE: Record<string, string> = {
  disponibile: "bg-success text-white border-success",
  da_aggiornare: "bg-warning text-white border-warning",
  assente: "bg-destructive text-white border-destructive",
};

export function VistaDocumenti({ valutazione, catalogo, stato }: PropsVista) {
  const [errore, setErrore] = useState<string | null>(null);
  const [locali, setLocali] = useState<Record<string, string>>(() =>
    Object.fromEntries(stato.risposte.filter((r) => r.statoDocumento).map((r) => [r.questionKey, r.statoDocumento!])),
  );

  const nomeArea = new Map(catalogo.aree.map((a) => [a.key, a.nome]));

  async function segna(questionKey: string, valore: string) {
    setErrore(null);
    const nuovo = locali[questionKey] === valore ? "" : valore;
    setLocali((s) => ({ ...s, [questionKey]: nuovo }));
    const esito = await setAnswerFieldAction(valutazione.id, { questionKey, campo: "statoDocumento", valore: nuovo });
    if (!esito.ok) {
      setLocali((s) => ({ ...s, [questionKey]: locali[questionKey] ?? "" }));
      setErrore(esito.errore);
    }
  }

  const conta = (s: string) => Object.values(locali).filter((v) => v === s).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Le evidenze che ogni domanda presuppone. Segnare qui cosa esiste evita di dichiarare nel questionario
          una conformità che poi non si riesce a documentare: è la prima cosa che un committente verifica.
        </p>
        {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
      </div>

      <dl className="grid grid-cols-3 gap-x-6 gap-y-3 rounded-lg border bg-accent/40 px-5 py-4">
        {STATI.map((s) => (
          <div key={s}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{ETICHETTA_DOCUMENTO[s]}</dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
              {conta(s)} <span className="text-xs font-normal text-muted-foreground">su {catalogo.domande.length}</span>
            </dd>
          </div>
        ))}
      </dl>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Evidenze attese</h2>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead className="w-44">Area</TableHead>
                <TableHead className="w-72">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogo.domande.map((q) => (
                <TableRow key={q.key}>
                  <TableCell>
                    <p className="font-medium">{q.evidenzaAttesa}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{q.key}</span> · {q.riferimento}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{nomeArea.get(q.areaKey)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" role="group" aria-label={`Stato del documento per ${q.key}`}>
                      {STATI.map((s) => {
                        const scelto = locali[q.key] === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => segna(q.key, s)}
                            aria-pressed={scelto}
                            aria-label={`${q.key}: ${ETICHETTA_DOCUMENTO[s]}`}
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                              scelto ? COLORE[s] : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                          >
                            {ETICHETTA_DOCUMENTO[s]}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Badge variant="outline">Nota</Badge> Lo stato del documento non entra nel punteggio: l&apos;indice
        misura le risposte del questionario. Serve a te, per sapere cosa hai in mano prima di consegnare.
      </p>
    </div>
  );
}
