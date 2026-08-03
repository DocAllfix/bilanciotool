"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setAnswerFieldAction } from "@/features/supplier/actions";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { ETICHETTA_AZIONE, type PropsVista } from "./types";

// Vista 3 — Piano di adeguamento.
//
// L'ordine non è per gravità ma per RENDIMENTO: punti di indice guadagnati per
// giornata di lavoro. Una domanda leggera che si chiude in tre giorni può
// valere più di una pesante che ne chiede dieci, e l'elenco lo rende evidente
// senza che nessuno debba fare il conto.

const STATI = ["da_avviare", "in_corso", "completata"] as const;

export function VistaPiano({ companyId, valutazione, catalogo, stato, esito }: PropsVista) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [statoLocale, setStatoLocale] = useState<Record<string, string>>(() =>
    Object.fromEntries(stato.piano.filter((v) => v.statoAzione).map((v) => [v.key, v.statoAzione!])),
  );

  const testoPer = new Map(catalogo.domande.map((q) => [q.key, q.testo]));
  const nomeArea = new Map(catalogo.aree.map((a) => [a.key, a.nome]));

  async function salva(questionKey: string, campo: "responsabile" | "scadenza" | "statoAzione", valore: string) {
    setErrore(null);
    if (campo === "statoAzione") setStatoLocale((s) => ({ ...s, [questionKey]: valore }));
    const e = await setAnswerFieldAction(valutazione.id, { questionKey, campo, valore });
    if (!e.ok) setErrore(e.errore);
  }

  async function ricalcola() {
    setInCorso(true);
    await ricalcolaAction(companyId);
    router.refresh();
    setInCorso(false);
  }

  const completate = stato.piano.filter((v) => (statoLocale[v.key] ?? v.statoAzione) === "completata").length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Le lacune dichiarate, ordinate per punti guadagnati per giornata di lavoro. Chiudendole tutte
          l&apos;indice salirebbe di circa {fmtNum(esito.puntiRecuperabili, 1)} punti, con un impegno stimato di{" "}
          {esito.giornateStimate} giornate.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
            <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      {stato.piano.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna lacuna dichiarata. Il piano elenca le sole domande a cui hai risposto «no» o «in parte»:
              quelle ancora senza risposta non sono una mancanza accertata.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardHeader className="flex-row items-baseline justify-between border-b py-4">
            <h2 className="text-[15px] font-semibold tracking-tight">
              {stato.piano.length} azioni · {completate} completate
            </h2>
            <p className="text-sm text-muted-foreground">i primi in elenco rendono di più</p>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table className="min-w-208">
              <TableHeader>
                <TableRow>
                  <TableHead>Azione</TableHead>
                  <TableHead className="w-20 text-right">Punti</TableHead>
                  <TableHead className="w-20 text-right">Giorni</TableHead>
                  <TableHead className="w-44">Responsabile</TableHead>
                  <TableHead className="w-36">Entro</TableHead>
                  <TableHead className="w-36">Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stato.piano.map((v) => (
                  <TableRow key={v.key}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" data-slot="kpi" className="mt-0.5 shrink-0">{v.key}</Badge>
                        <div className="min-w-0">
                          <p className="font-medium">{v.azione}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {nomeArea.get(v.areaKey)} · {testoPer.get(v.key)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold" data-slot="kpi">
                      +{fmtNum(v.punti, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground" data-slot="kpi">{v.giorni}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        defaultValue={v.responsabile ?? ""}
                        placeholder="Chi se ne occupa"
                        aria-label={`Responsabile per ${v.key}`}
                        onBlur={(e) => { if (e.target.value !== (v.responsabile ?? "")) salva(v.key, "responsabile", e.target.value); }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        defaultValue={v.scadenza ?? ""}
                        aria-label={`Scadenza per ${v.key}`}
                        onBlur={(e) => { if (e.target.value !== (v.scadenza ?? "")) salva(v.key, "scadenza", e.target.value); }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={statoLocale[v.key] ?? v.statoAzione ?? ""}
                        onValueChange={(x) => salva(v.key, "statoAzione", x)}
                      >
                        <SelectTrigger className="h-8 w-full" aria-label={`Stato dell'azione ${v.key}`}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATI.map((s) => <SelectItem key={s} value={s}>{ETICHETTA_AZIONE[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
