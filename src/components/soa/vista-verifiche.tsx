"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import type { PropsVista } from "./types";

// Vista 4 — Verifiche di coerenza. Sono i rilievi che un organismo di
// certificazione muove per primi, ciascuno con l'elenco dei controlli coinvolti
// e il modo di arrivarci.

export function VistaVerifiche({ catalogo, stato, esito, vai }: PropsVista & { vai: (v: string) => void }) {
  const titoloPer = new Map(catalogo.controlli.map((c) => [c.controlloId, c.titolo]));
  const tutto = stato.rilievi.length === 0 && stato.avvisi.length === 0;

  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Prima di consegnare la Dichiarazione, questi sono i punti su cui un auditor si ferma. Non sono
        obbligatori per pubblicare: sono quello che verrà chiesto.
      </p>

      {tutto ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success text-white">
              <Check className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Nessun rilievo aperto</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              La Dichiarazione è formalmente completa: ogni esclusione è motivata, ogni controllo applicabile ha
              motivazione, stato, presidio e riferimento documentale.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent/40 px-5 py-3 text-sm">
            <span>
              <strong data-slot="kpi">{esito.rilieviAperti}</strong> controlli con un rilievo aperto
            </span>
            <span className="text-muted-foreground">
              su {esito.totale} in ambito
            </span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => vai("controlli")}>
              Vai al registro <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {stato.rilievi.map((r) => (
            <Card key={r.key}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                    <AlertTriangle className="size-4 shrink-0 text-warning" />
                    {r.titolo}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{r.spiegazione}</p>
                </div>
                <Badge variant="outline" data-slot="kpi" className="shrink-0">{r.controlli.length}</Badge>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-1.5">
                  {r.controlli.map((id) => (
                    <li key={id}>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                        title={titoloPer.get(id) ?? id}
                      >
                        <span className="font-mono">{id}</span>
                        <span className="max-w-48 truncate text-muted-foreground">{titoloPer.get(id)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {stato.avvisi.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">Coerenza fra profilo e ambito</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Riguardano le scelte del contesto, non i singoli controlli.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => vai("contesto")}>
                  Contesto <ArrowRight className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {stato.avvisi.map((a) => (
                    <li key={a.key} className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span>{a.messaggio}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
