"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setKpiValueAction } from "@/features/report/actions";
import { fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CatalogoReport, ProgettoReport, StatoReport } from "./types";

// Passo 3 — Dati e indicatori: ~49 input su doppio anno; i derivati arrivano dal
// server e sono dichiaratamente NON editabili (si calcolano, non si scrivono).

const PILLAR_BADGE: Record<"E" | "S" | "G", string> = { E: "Ambiente", S: "Sociale", G: "Governance" };

// Derivati da mostrare per sezione (chiave motore → etichetta, unità, decimali).
const DERIVATI_PER_SEZIONE: Record<string, [string, string, string, number][]> = {
  ene: [
    ["energiaTotaleKwh", "Energia totale consumata", "kWh", 0],
    ["pctRinnovabile", "Quota da fonti rinnovabili", "%", 1],
    ["scope1", "Emissioni dirette — Scope 1", "tCO₂e", 2],
    ["scope2Loc", "Scope 2 location-based", "tCO₂e", 2],
    ["scope2Mkt", "Scope 2 market-based", "tCO₂e", 2],
    ["intensitaCo2", "Intensità carbonica", "tCO₂e/M€", 2],
    ["energiaPerAddetto", "Consumo per addetto", "kWh", 0],
  ],
  acq: [["acquaPrelevata", "Prelievo idrico totale", "m³", 0]],
  rif: [
    ["rifiutiTotali", "Rifiuti totali prodotti", "t", 2],
    ["pctRecupero", "Quota avviata a recupero", "%", 1],
    ["pctMaterialiRiciclati", "Materiali riciclati sul totale", "%", 1],
  ],
  per: [
    ["pctDonne", "Presenza femminile", "%", 1],
    ["pctIndeterminato", "Tempo indeterminato", "%", 1],
    ["turnoverUscita", "Tasso di uscita", "%", 1],
    ["turnoverIngresso", "Tasso di ingresso", "%", 1],
  ],
  sic: [
    ["indiceFrequenza", "Indice di frequenza", "per 10⁶ ore", 2],
    ["indiceGravita", "Indice di gravità", "per 10³ ore", 2],
  ],
  for: [
    ["oreFormazionePerAddetto", "Ore di formazione per addetto", "ore", 1],
    ["payGapPct", "Divario retributivo di genere", "%", 1],
  ],
  eco: [["pctFornitoriLocali", "Fornitori con sede in Italia", "%", 1]],
  gov: [
    ["pctDonneCda", "Presenza femminile nell'organo amministrativo", "%", 1],
    ["pctFornitoriEsg", "Fornitori valutati su criteri ESG", "%", 1],
  ],
};

export function PassoKpi({
  companyId, progetto, catalogo, stato,
}: {
  companyId: string;
  progetto: ProgettoReport;
  catalogo: CatalogoReport;
  stato: StatoReport;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const anno = progetto.anno;

  async function salva(kpiKey: string, annoValore: number, valore: string) {
    setErrore(null);
    const esito = await setKpiValueAction(companyId, { kpiKey, anno: annoValore, valore: valore.trim() === "" ? null : valore });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Inserisci l&apos;esercizio e l&apos;anno precedente: il confronto è ciò che rende leggibile un bilancio. Gli indicatori evidenziati si calcolano da soli.
        </p>
        {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
      </div>
      {stato.bridge.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {stato.bridge.warnings.map((w) => (
            <div key={w.codice} className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">{w.messaggio}</div>
          ))}
        </div>
      )}
      {catalogo.sezioni.map((sez) => {
        const kpiSezione = catalogo.kpi.filter((k) => k.sectionKey === sez.key);
        const derivati = DERIVATI_PER_SEZIONE[sez.key] ?? [];
        return (
          <Card key={sez.key} className="mb-4 py-0">
            <CardHeader className="flex-row items-baseline justify-between border-b py-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">{sez.nome}</h2>
                <p className="font-mono text-xs text-muted-foreground">{sez.riferimenti}</p>
              </div>
              <Badge variant="outline">{PILLAR_BADGE[sez.pillar]}</Badge>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicatore</TableHead>
                    <TableHead className="w-20">Unità</TableHead>
                    <TableHead className="w-36 text-right">{anno}</TableHead>
                    <TableHead className="w-36 text-right">{anno - 1}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiSezione.map((k) => (
                    <TableRow key={k.key}>
                      <TableCell>
                        <p className="font-medium">{k.nome}</p>
                        {k.hint && <p className="text-xs text-muted-foreground">{k.hint}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.um}</TableCell>
                      <TableCell>
                        <Input
                          className="text-right"
                          data-slot="kpi"
                          defaultValue={stato.kpi.corrente[k.key] ?? ""}
                          aria-label={`${k.nome} ${anno}`}
                          onBlur={(e) => { if (e.target.value !== (stato.kpi.corrente[k.key] ?? "")) salva(k.key, anno, e.target.value); }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="bg-muted/40 text-right"
                          data-slot="kpi"
                          defaultValue={stato.kpi.precedente[k.key] ?? ""}
                          aria-label={`${k.nome} ${anno - 1}`}
                          onBlur={(e) => { if (e.target.value !== (stato.kpi.precedente[k.key] ?? "")) salva(k.key, anno - 1, e.target.value); }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {derivati.length > 0 && (
                <div className="border-t bg-accent/50 px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">Calcolati automaticamente</p>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {derivati.map(([chiave, label, um, dec]) => (
                      <div key={chiave} className="flex items-baseline justify-between gap-3 text-sm">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-semibold" data-slot="kpi">
                          {fmtNum(stato.derivati[chiave], dec)} <span className="text-xs font-normal text-muted-foreground">{um}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
