"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CatalogoReport, StatoReport } from "./types";

// Passo 6 — Verifica: cosa manca prima di pubblicare. Nessuna voce è
// obbligatoria in assoluto, ma ogni assenza va motivata nella nota metodologica.

export function PassoVerificaBilancio({
  catalogo, stato, vai,
}: {
  catalogo: CatalogoReport;
  stato: StatoReport;
  vai: (passo: number) => void;
}) {
  const g = stato.gap;
  const nomiKpi = new Map(catalogo.kpi.map((k) => [k.key, k.nome]));
  const nomiTemi = new Map(catalogo.temi.map((t) => [t.key, t.nome]));
  const nomiCapitoli = new Map(catalogo.capitoli.map((c) => [c.key, c.nome]));

  const blocco = (titolo: string, voci: string[], passo: number, etichetta?: (v: string) => string) => (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{titolo}</h2>
          <p className="text-xs text-muted-foreground">{voci.length === 0 ? "completo" : `${voci.length} voci da sistemare`}</p>
        </div>
        {voci.length ? (
          <Button variant="outline" size="sm" onClick={() => vai(passo)}>Vai al passo {passo}</Button>
        ) : (
          <Badge>ok</Badge>
        )}
      </CardHeader>
      {voci.length > 0 && (
        <CardContent className="pt-0 text-sm leading-relaxed text-muted-foreground">
          {voci.slice(0, 14).map(etichetta ?? ((v) => v)).join(" · ")}
          {voci.length > 14 && <i> · e altre {voci.length - 14}</i>}
        </CardContent>
      )}
    </Card>
  );

  const giudizio =
    g.readyPct >= 90
      ? "Il documento è consegnabile: rileggi la nota metodologica e procedi alla pubblicazione."
      : g.readyPct >= 60
        ? "Buon punto di avanzamento: chiudi le voci qui sotto in ordine di elenco."
        : "Il documento non è ancora rappresentativo: mancano dati o temi di gestione.";

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-5 py-5">
          <div data-slot="kpi">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pronto a pubblicare</p>
            <p className="text-4xl font-semibold tracking-tight">{g.readyPct}%</p>
          </div>
          <div className="min-w-56 flex-1">
            <Progress value={g.readyPct} aria-label={`Pronto al ${g.readyPct}%`} />
            <p className="mt-2 text-sm text-muted-foreground">{giudizio}</p>
          </div>
        </CardContent>
      </Card>

      {blocco("Anagrafica e profilo", g.profiloMancanti, 1)}
      {blocco("Dati dell'esercizio", g.kpiMancanti, 3, (k) => nomiKpi.get(k) ?? k)}
      {blocco("Confronto con l'anno precedente", g.kpiSenzaConfronto, 3, (k) => nomiKpi.get(k) ?? k)}
      {blocco("Politiche sui temi materiali", g.gestioneMancante, 4, (k) => nomiTemi.get(k) ?? k)}
      {blocco("Capitoli narrativi", g.capitoliDaCompletare, 5, (k) => nomiCapitoli.get(k) ?? k)}

      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Apparato visivo</h2>
            <p className="text-xs text-muted-foreground" data-slot="kpi">{g.mediaTotali} tra fotografie e diagrammi</p>
          </div>
          {g.mediaTotali < 3 ? (
            <Button variant="outline" size="sm" onClick={() => vai(5)}>Aggiungi</Button>
          ) : (
            <Badge>ok</Badge>
          )}
        </CardHeader>
        {g.mediaTotali < 3 && (
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Un bilancio con meno di tre elementi visivi risulta ostico da leggere. I diagrammi dai dati sono gratuiti: bastano due clic al passo 5.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
