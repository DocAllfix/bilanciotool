"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { CLASSE_NOME, COLORE_LIVELLO, LIVELLI, PRIORITA_NOME, VIA_NOME, type DatiNis2 } from "./types";

// Vista 0 — Il quadro: la sola domanda che conta in un riesame, «a che punto siamo».
//
// ⚠️ La barra dei capi e' un RACK, non una tabella: dodici numeri in colonna non si
// leggono, dodici barre affiancate sì. E' la stessa forma che la SoA usa per 174 controlli.

export function VistaQuadro({ dati, vai }: { dati: DatiNis2; vai: (v: string) => void }) {
  const k = dati.conformita;
  const a = dati.ambito;

  if (!k) {
    return (
      <div className="mt-6 rounded-md border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Comincia dall&apos;ambito: settore, dimensione e criteri specifici decidono quali obblighi
          si applicano.
        </p>
        <button onClick={() => vai("ambito")} className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
          Vai a Ambito e assetto
        </button>
      </div>
    );
  }

  const daValutare = k.applicabili - k.valutati;
  const critici = k.scostamenti.filter((s) => s.critico).length;

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card data-tour="nis2-quadro-conformita">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Conformità</p>
            <p className="mt-1 font-display text-3xl font-semibold" data-slot="kpi">
              {k.percentuale}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              obiettivo {k.obiettivo} · {LIVELLI[k.obiettivo]?.nome}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Istruttoria</p>
            <p className="mt-1 font-display text-3xl font-semibold" data-slot="kpi">
              {k.valutati}/{k.applicabili}
            </p>
            {/* ⚠️ Questa frase e' il motivo per cui la percentuale sopra non e' quella del
                prototipo: i requisiti non valutati contano zero, non vengono ignorati.
                Senza dirlo, un consulente vedrebbe l'8% e penserebbe a un errore. */}
            <p className="mt-1 text-xs text-muted-foreground">
              {daValutare > 0
                ? `${daValutare} da valutare, che pesano zero nella percentuale`
                : "tutti i requisiti applicabili sono valutati"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Scostamenti</p>
            <p className="mt-1 font-display text-3xl font-semibold" data-slot="kpi">
              {k.scostamenti.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {critici ? `${critici} su requisiti a criticità alta` : "nessuno a criticità alta"}
            </p>
          </CardContent>
        </Card>
      </div>

      {a && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight">Ambito soggettivo</h2>
          </CardHeader>
          <CardContent>
            {a.classe ? (
              <p className="text-sm">
                <Badge variant={a.classe === "essenziale" ? "destructive" : "default"}>
                  {CLASSE_NOME[a.classe]}
                </Badge>{" "}
                <span className="text-muted-foreground">— {VIA_NOME[a.via] ?? a.via}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Non determinata: {VIA_NOME[a.via] ?? a.via}.{" "}
                <button onClick={() => vai("ambito")} className="font-medium text-primary underline-offset-4 hover:underline">
                  Completa la scheda
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight">Conformità per capo</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {k.perCapitolo.map((c) => (
            <div key={c.capitolo} className="flex items-center gap-3">
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{c.capitolo}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${c.percentuale}%`,
                    background: COLORE_LIVELLO[Math.min(4, Math.round(c.percentuale / 25))],
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {c.percentuale}%
              </span>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {c.valutati}/{c.attivi}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {k.scostamenti.length > 0 && (
        <Card data-tour="nis2-scostamenti">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">Scostamenti dal livello obiettivo</h2>
              <button
                onClick={() => vai("requisiti")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Vai ai requisiti <ArrowRight className="size-3.5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sono i requisiti VALUTATI sotto l&apos;obiettivo. Quelli non ancora valutati non sono
              scostamenti: sono istruttoria da completare.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {k.scostamenti.map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                  title={`livello ${s.livello} · priorità ${s.priorita ? PRIORITA_NOME[s.priorita] : "—"}`}
                >
                  <span className="font-mono">{s.key}</span>
                  {s.critico && <span className="text-destructive">alta</span>}
                  <span className="text-muted-foreground">{s.priorita ? PRIORITA_NOME[s.priorita] : ""}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
