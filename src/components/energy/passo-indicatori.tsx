"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setDriverValueAction } from "@/features/energy/actions";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import type { PropsPasso } from "./types";

// Passo 4 — Indicatori di prestazione. Un consumo assoluto dice quanto il sito
// ha prodotto, non se lavora bene: sono i rapporti a dirlo.
//
// Un indicatore senza denominatore vale `null`, non zero: uno zero si leggerebbe
// come "consumo specifico nullo", cioè un risultato eccellente, mentre il dato
// semplicemente manca.

export function PassoIndicatori({ companyId, bilancio, catalogo, stato, risultati }: PropsPasso) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inRicalcolo, setInRicalcolo] = useState(false);

  const valorePer = new Map(risultati.indicatori.map((i) => [i.key, i.valore]));
  const confrontoPer = new Map(risultati.confronto.map((c) => [c.key, c]));

  async function salvaDriver(anno: number, driverKey: string, valore: string) {
    setErrore(null);
    const esito = await setDriverValueAction(companyId, { anno, driverKey, valore });
    if (!esito.ok) setErrore(esito.errore);
  }

  async function ricalcola() {
    setInRicalcolo(true);
    await ricalcolaAction(companyId, bilancio.anno);
    router.refresh();
    setInRicalcolo(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Le variabili di riferimento sono i denominatori: senza produzione non esiste un consumo specifico,
          senza superficie non esiste un consumo per metro quadro. Compila anche il {bilancio.annoBase} per ottenere il confronto.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inRicalcolo}>
            <RefreshCw className={cn("size-3.5", inRicalcolo && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Variabili di riferimento</h2>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variabile</TableHead>
                <TableHead className="w-24">Unità</TableHead>
                <TableHead className="w-36 text-right">{bilancio.anno}</TableHead>
                <TableHead className="w-36 text-right">{bilancio.annoBase}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogo.driver.map((d) => {
                const corrente = stato.driver.corrente[d.key as keyof typeof stato.driver.corrente] ?? "";
                const base = stato.driver.base[d.key as keyof typeof stato.driver.base] ?? "";
                return (
                  <TableRow key={d.key}>
                    <TableCell>
                      <p className="font-medium">{d.nome}</p>
                      {d.hint && <p className="text-xs text-muted-foreground">{d.hint}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.um}</TableCell>
                    <TableCell>
                      <Input
                        className="text-right"
                        data-slot="kpi"
                        defaultValue={corrente}
                        aria-label={`${d.nome} ${bilancio.anno}`}
                        onBlur={(e) => { if (e.target.value !== corrente) salvaDriver(bilancio.anno, d.key, e.target.value); }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="bg-muted/40 text-right"
                        data-slot="kpi"
                        defaultValue={base}
                        aria-label={`${d.nome} ${bilancio.annoBase}`}
                        onBlur={(e) => { if (e.target.value !== base) salvaDriver(bilancio.annoBase, d.key, e.target.value); }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Indicatori calcolati</h2>
          <p className="text-sm text-muted-foreground">
            Si calcolano, non si scrivono. Tutti sono &quot;minore è meglio&quot;: una variazione in discesa è un miglioramento.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicatore</TableHead>
                <TableHead className="w-28">Unità</TableHead>
                <TableHead className="w-32 text-right">{bilancio.anno}</TableHead>
                <TableHead className="w-32 text-right">{bilancio.annoBase}</TableHead>
                <TableHead className="w-36 text-right">Variazione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogo.indicatori.map((i) => {
                const v = valorePer.get(i.key) ?? null;
                const c = confrontoPer.get(i.key);
                return (
                  <TableRow key={i.key}>
                    <TableCell>
                      <p className="font-medium">{i.nome}</p>
                      {i.hint && <p className="text-xs text-muted-foreground">{i.hint}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.um}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold" data-slot="kpi">
                      {v === null ? <span className="font-normal text-muted-foreground">non calcolabile</span> : fmtNum(v, i.decimali)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground" data-slot="kpi">
                      {c ? fmtNum(c.valoreBase, i.decimali) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                            c.migliorato ? "text-success" : "text-warning",
                          )}
                          data-slot="kpi"
                        >
                          {c.migliorato ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                          {fmtNum(Math.abs(Number(c.variazionePct)), 1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">nessun confronto</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
