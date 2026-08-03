"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction } from "@/features/soa/actions";
import { ETICHETTA_STATO } from "@/features/soa/validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { chiave, COLORE_FASCIA, COLORE_STATO, type PropsVista } from "./types";

// Vista 1 — Quadro di sintesi, con il RACK: una casella per ciascun controllo
// in ambito, colorata per stato.
//
// È il modo più rapido di rispondere alla sola domanda che conta in un riesame
// di direzione: quanto manca. Centoquarantatré numeri in tabella non si
// leggono; centoquarantatré caselle sì.

export function VistaQuadro({
  companyId, dichiarazione, catalogo, stato, esito, vai,
}: PropsVista & { vai: (v: string) => void }) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);

  const decisionePer = new Map(stato.decisioni.map((d) => [chiave(d.frameworkKey, d.controlloId), d]));
  const inAmbito = catalogo.controlli.filter((c) => c.inAmbito);

  async function ricalcola() {
    setInCorso(true);
    await ricalcolaAction(companyId);
    router.refresh();
    setInCorso(false);
  }

  const coloreCasella = (frameworkKey: string, controlloId: string) => {
    const d = decisionePer.get(chiave(frameworkKey, controlloId));
    if (d && !d.applicabile) return "var(--muted)";
    if (!d?.stato) return "var(--border)";
    return COLORE_STATO[d.stato];
  };

  const legenda: [string, string][] = [
    ...Object.keys(ETICHETTA_STATO).map((k) => [COLORE_STATO[k], ETICHETTA_STATO[k]] as [string, string]),
    ["var(--border)", "Senza stato"],
    ["var(--muted)", "Escluso"],
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          {esito.totale} controlli in ambito, {esito.applicabili} applicabili e {esito.esclusi} esclusi.
          Un controllo applicabile <strong className="text-foreground">senza stato pesa zero</strong>: per un
          organismo di certificazione un presidio non dichiarato è un presidio non attuato.
        </p>
        <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
          <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-baseline justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Indice di maturità</h2>
            <p className="text-sm text-muted-foreground">
              obiettivo {dichiarazione.sogliaObiettivo} ·{" "}
              {esito.scartoDallObiettivo >= 0
                ? `superato di ${esito.scartoDallObiettivo} punti`
                : `mancano ${Math.abs(esito.scartoDallObiettivo)} punti`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold tracking-tight" data-slot="kpi">{esito.indice}</span>
            <Badge style={{ background: COLORE_FASCIA[esito.fascia.key], color: "white" }}>{esito.fascia.nome}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${esito.indice}%`, background: COLORE_FASCIA[esito.fascia.key] }}
            />
            <div
              className="absolute -top-1 bottom-[-4px] w-0.5 bg-foreground"
              style={{ left: `${dichiarazione.sogliaObiettivo}%` }}
              aria-hidden
            />
          </div>

          {/* Il rack: una casella per controllo, nell'ordine del catalogo. */}
          <div className="mt-6">
            <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`Stato dei ${inAmbito.length} controlli in ambito`}>
              {inAmbito.map((c) => {
                const d = decisionePer.get(chiave(c.frameworkKey, c.controlloId));
                const st = d && !d.applicabile ? "escluso" : d?.stato ? ETICHETTA_STATO[d.stato] : "senza stato";
                return (
                  <span
                    key={chiave(c.frameworkKey, c.controlloId)}
                    title={`${c.controlloId} — ${c.titolo} · ${st}`}
                    className={cn("size-3.5 rounded-[3px]", c.cardine && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-background")}
                    style={{ background: coloreCasella(c.frameworkKey, c.controlloId) }}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {legenda.map(([colore, nome]) => (
                <span key={nome} className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px]" style={{ background: colore }} aria-hidden />
                  {nome}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-muted ring-1 ring-foreground/40 ring-offset-1 ring-offset-background" aria-hidden />
                Controllo cardine
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold tracking-tight">Maturità per quadro di riferimento</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            {catalogo.quadri
              .filter((q) => esito.perFramework[q.key])
              .map((q) => {
                const a = esito.perFramework[q.key];
                return (
                  <div key={q.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{q.abbreviazione} <span className="text-xs text-muted-foreground">{q.nome.split("—")[1] ?? ""}</span></span>
                      <strong data-slot="kpi">{a.punteggio}</strong>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${a.punteggio}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.applicabili} applicabili su {a.totale}{a.esclusi > 0 ? ` · ${a.esclusi} esclusi` : ""}
                    </p>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Rilievi da chiudere</h2>
              <p className="text-sm text-muted-foreground">Quello che un auditor guarda per primo</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => vai("verifiche")}>
              Verifiche <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {stato.rilievi.length === 0 && stato.avvisi.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessun rilievo aperto: la Dichiarazione è formalmente completa.
              </p>
            ) : (
              <ul className="grid gap-2.5 text-sm">
                {stato.rilievi.map((r) => (
                  <li key={r.key} className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span className="min-w-0 flex-1">{r.titolo}</span>
                    <Badge variant="outline" data-slot="kpi">{r.controlli.length}</Badge>
                  </li>
                ))}
                {stato.avvisi.map((a) => (
                  <li key={a.key} className="flex items-start gap-2.5 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{a.messaggio}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-accent/40 px-5 py-4 sm:grid-cols-4">
        {([
          ["Controlli in ambito", `${esito.totale}`, `${esito.applicabili} applicabili`],
          ["Con stato dichiarato", `${esito.conStato}`, `${esito.pctCompletamento}%`],
          ["Attuati o verificati", `${esito.attuati}`, `su ${esito.applicabili}`],
          ["Rilievi aperti", `${esito.rilieviAperti}`, "da chiudere"],
        ] as const).map(([label, valore, um]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
              {valore} <span className="text-xs font-normal text-muted-foreground">{um}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
