"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pct, type DatiGdpr } from "./comune";

// Il quadro: quanto manca, che cosa è urgente, dove si rimedia.
//
// ⚠️ L'indice di conformità è `—` finché niente è valutato, non zero: «tutto non
// conforme» di un sistema di cui non si sa ancora niente sarebbe una conclusione falsa.

const PARTI = [
  ["organizzazione", "Organizzazione"],
  ["trattamenti", "Registro dei trattamenti"],
  ["conformita", "Conformità"],
  ["rischi", "Rischi e responsabili"],
  ["politica", "Politica e piano"],
  ["indicatori", "Indicatori"],
  ["registri", "Registri"],
] as const;

export function VistaQuadro({ dati, vai }: { dati: DatiGdpr; vai: (v: string) => void }) {
  const a = dati.avanzamento;
  const k = dati.conformita;
  const critiche = dati.segnali.filter((s) => s.livello === "C");
  const attenzioni = dati.segnali.filter((s) => s.livello === "A");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card data-tour="gdpr-avanzamento">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Avanzamento del percorso</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-display text-3xl font-semibold tabular-nums text-foreground" data-avanzamento>
              {a.percentuale}%
            </span>{" "}
            sulle sette parti del lavoro
          </p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {PARTI.map(([chiave, nome]) => (
            <div key={chiave} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span>{nome}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(a[chiave] * 100)}%</span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(a[chiave] * 100)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-tour="gdpr-conformita">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Conformità</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-display text-3xl font-semibold tabular-nums text-foreground" data-indice>
              {pct(k.indice)}
            </span>{" "}
            {k.valutati} valutati su {k.totale}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {dati.catalogo.gruppi.map((g) => {
            const c = dati.conformitaGruppi[g.key];
            return (
              <div key={g.key} className="grid grid-cols-[2.2rem_1fr_3rem] items-center gap-2 text-sm">
                <span className="font-mono text-[12px] text-muted-foreground">{g.key}</span>
                <span className="truncate" title={g.nome}>
                  {g.nome}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{pct(c.indice)}</span>
              </div>
            );
          })}
          <p className="pt-2 text-[12px] text-muted-foreground">
            Conforme vale 100, parziale 50, non conforme 0. Un requisito non valutato pesa zero e resta nel conto; i non
            pertinenti ne escono.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2" data-tour="gdpr-segnali">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Segnali per l&apos;esercizio {dati.anno}</h2>
          <p className="text-sm text-muted-foreground">
            {critiche.length} criticità · {attenzioni.length}{" "}attenzioni. Ogni segnale porta alla vista in cui si rimedia.
          </p>
        </CardHeader>
        <CardContent>
          {dati.segnali.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun segnale.</p>
          ) : (
            <ul className="divide-y" data-segnali>
              {[...critiche, ...attenzioni].map((s, i) => (
                <li key={i} className="flex items-start gap-3 py-2 text-sm">
                  <Badge variant={s.livello === "C" ? "destructive" : "secondary"} className="mt-0.5 shrink-0">
                    {s.livello === "C" ? "Criticità" : "Attenzione"}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    {s.testo} <span className="text-[12px] text-muted-foreground">{s.riferimento}</span>
                  </span>
                  <button className="shrink-0 text-[12px] text-primary underline-offset-4 hover:underline" onClick={() => vai(s.vista)}>
                    Vai
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
