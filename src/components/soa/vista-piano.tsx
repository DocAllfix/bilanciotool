"use client";

import { useState } from "react";
import { setDecisionFieldAction } from "@/features/soa/actions";
import { ETICHETTA_AZIONE, ETICHETTA_STATO, STATI_AZIONE } from "@/features/soa/validation";
import { fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chiave, type PropsVista } from "./types";

// Vista 5 — Piano di attuazione.
//
// La priorità non dipende dai punti recuperabili ma dalla natura del controllo:
// un controllo cardine non attuato è un rilievo quasi certo in audit,
// indipendentemente da quanti decimi di indice valga.

export function VistaPiano({ dichiarazione, catalogo, stato }: PropsVista) {
  const [errore, setErrore] = useState<string | null>(null);
  const [statiLocali, setStatiLocali] = useState<Record<string, string>>(() =>
    Object.fromEntries(stato.piano.filter((v) => v.statoAzione).map((v) => [chiave(v.frameworkKey, v.controlloId), v.statoAzione!])),
  );

  const controlloPer = new Map(catalogo.controlli.map((c) => [chiave(c.frameworkKey, c.controlloId), c]));
  const nomeSezione = new Map(catalogo.sezioni.map((s) => [s.key, s.nome]));

  async function salva(
    frameworkKey: string,
    controlloId: string,
    campo: "responsabile" | "scadenza" | "statoAzione",
    valore: string,
  ) {
    setErrore(null);
    if (campo === "statoAzione") {
      setStatiLocali((s) => ({ ...s, [chiave(frameworkKey, controlloId)]: valore }));
    }
    const esito = await setDecisionFieldAction(dichiarazione.id, { frameworkKey, controlloId, campo, valore });
    if (!esito.ok) setErrore(esito.errore);
  }

  const alta = stato.piano.filter((v) => v.priorita === "alta").length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          I controlli applicabili non ancora attuati. In testa quelli <strong className="text-foreground">cardine</strong>,
          quelli senza stato e quelli dichiarati non attuati: sono i tre casi che un auditor guarda subito,
          a prescindere da quanti punti valgano.
        </p>
        {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
      </div>

      {stato.piano.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun controllo in attesa: tutti gli applicabili risultano attuati o verificati.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardHeader className="flex-row items-baseline justify-between border-b py-4">
            <h2 className="text-[15px] font-semibold tracking-tight">
              {stato.piano.length} controlli da portare avanti
            </h2>
            <p className="text-sm text-muted-foreground">{alta} in priorità alta</p>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table className="min-w-208">
              <TableHeader>
                <TableRow>
                  <TableHead>Controllo</TableHead>
                  <TableHead className="w-28">Priorità</TableHead>
                  <TableHead className="w-40">Stato attuale</TableHead>
                  <TableHead className="w-20 text-right">Punti</TableHead>
                  <TableHead className="w-44">Responsabile</TableHead>
                  <TableHead className="w-36">Entro</TableHead>
                  <TableHead className="w-36">Avanzamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stato.piano.map((v) => {
                  const k = chiave(v.frameworkKey, v.controlloId);
                  const c = controlloPer.get(k);
                  return (
                    <TableRow key={k}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">{v.controlloId}</span>
                          <div className="min-w-0">
                            <p className="font-medium">{c?.titolo}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {nomeSezione.get(v.sectionKey)} · evidenza attesa: {c?.evidenzaAttesa}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.priorita === "alta" ? "default" : "outline"}>
                          {v.priorita === "alta" ? "Alta" : "Media"}
                        </Badge>
                        {v.cardine && <div className="mt-1 text-[11px] text-muted-foreground">cardine</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.stato ? ETICHETTA_STATO[v.stato] : <span className="text-muted-foreground">senza stato</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold" data-slot="kpi">
                        +{fmtNum(v.punti, 1)}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          defaultValue={v.responsabile ?? ""}
                          placeholder="Chi presidia"
                          aria-label={`Responsabile per ${v.controlloId}`}
                          onBlur={(e) => { if (e.target.value !== (v.responsabile ?? "")) salva(v.frameworkKey, v.controlloId, "responsabile", e.target.value); }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          defaultValue={v.scadenza ?? ""}
                          aria-label={`Scadenza per ${v.controlloId}`}
                          onBlur={(e) => { if (e.target.value !== (v.scadenza ?? "")) salva(v.frameworkKey, v.controlloId, "scadenza", e.target.value); }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={statiLocali[k] ?? v.statoAzione ?? ""}
                          onValueChange={(x) => salva(v.frameworkKey, v.controlloId, "statoAzione", x)}
                        >
                          <SelectTrigger className="h-8 w-full" aria-label={`Avanzamento dell'azione ${v.controlloId}`}>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATI_AZIONE.map((s) => <SelectItem key={s} value={s}>{ETICHETTA_AZIONE[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
