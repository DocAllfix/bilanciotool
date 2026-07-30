"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSourceStateAction } from "@/features/ghg/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Catalogo, Inventario, StatoWizard } from "./types";

// Passo 2 — Registro delle sorgenti: tutte le 25 sorgenti valutate una per una.
// L'esclusione senza motivazione è il rilievo d'audit più frequente: il server
// la blocca, qui la chiediamo contestualmente.

const STATI = [
  { v: "in", label: "Inclusa" },
  { v: "out", label: "Esclusa" },
  { v: "na", label: "Non applicabile" },
] as const;

export function PassoSorgenti({
  companyId,
  inventario,
  catalogo,
  stato,
}: {
  companyId: string;
  inventario: Inventario;
  catalogo: Catalogo;
  stato: StatoWizard;
}) {
  const router = useRouter();
  const statoPer = new Map(stato.sorgenti.map((s) => [s.sourceTypeKey, s]));
  const vociPer = new Map<string, number>();
  for (const r of stato.righe) vociPer.set(r.sourceTypeKey, (vociPer.get(r.sourceTypeKey) ?? 0) + 1);
  const [attesaMotivazione, setAttesaMotivazione] = useState<Record<string, "out" | "na">>({});
  const [errore, setErrore] = useState<string | null>(null);

  const valutate = stato.sorgenti.length;
  const totale = catalogo.sorgenti.length;

  async function imposta(sourceTypeKey: string, nuovo: "in" | "out" | "na", motivazione?: string) {
    setErrore(null);
    if ((nuovo === "out" || nuovo === "na") && !motivazione?.trim()) {
      // La motivazione si scrive prima di poter confermare l'esclusione.
      setAttesaMotivazione((m) => ({ ...m, [sourceTypeKey]: nuovo }));
      return;
    }
    const esito = await setSourceStateAction(companyId, inventario.id, { sourceTypeKey, stato: nuovo, motivazione });
    if (!esito.ok) return setErrore(esito.errore);
    setAttesaMotivazione(({ [sourceTypeKey]: _via, ...resto }) => resto);
    router.refresh();
  }

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sorgenti valutate</p>
            <Progress className="mt-2" value={(valutate / totale) * 100} aria-label={`${valutate} su ${totale}`} />
          </div>
          <span className="text-sm font-medium" data-slot="kpi">{valutate} / {totale}</span>
        </CardContent>
      </Card>
      {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}

      {catalogo.categorie.map((cat) => (
        <Card key={cat.key} className="mb-4">
          <CardHeader>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight">Categoria {cat.key} — {cat.nome}</h2>
              <Badge variant="outline">Scope {cat.scope}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{cat.descrizione}</p>
          </CardHeader>
          <CardContent className="divide-y">
            {catalogo.sorgenti.filter((s) => s.categoryKey === cat.key).map((s) => {
              const st = statoPer.get(s.key);
              const voci = vociPer.get(s.key) ?? 0;
              const pendente = attesaMotivazione[s.key];
              return (
                <div key={s.key} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {s.nome}{" "}
                      {voci > 0 && <Badge variant="secondary" className="ml-1">{voci} {voci === 1 ? "voce" : "voci"}</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.descrizione}</p>
                    {(pendente || st?.stato === "out" || st?.stato === "na") && (
                      <div className="mt-2 max-w-lg">
                        <Input
                          defaultValue={st?.motivazione ?? ""}
                          placeholder="Motivazione dell'esclusione — richiesta dalla norma"
                          aria-label={`Motivazione per ${s.nome}`}
                          onBlur={(e) => {
                            const statoDaSalvare = pendente ?? (st?.stato as "out" | "na");
                            if (e.target.value.trim()) imposta(s.key, statoDaSalvare, e.target.value);
                          }}
                        />
                        {pendente && <p className="mt-1 text-xs text-warning">Scrivi la motivazione per confermare l&apos;esclusione.</p>}
                      </div>
                    )}
                  </div>
                  <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label={`Stato di ${s.nome}`}>
                    {STATI.map((x) => {
                      const attivo = pendente ? pendente === x.v : st?.stato === x.v;
                      return (
                        <button
                          key={x.v}
                          type="button"
                          onClick={() => imposta(s.key, x.v, st?.motivazione ?? undefined)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium transition-colors not-first:border-l",
                            attivo
                              ? x.v === "in"
                                ? "bg-primary text-primary-foreground"
                                : x.v === "out"
                                  ? "bg-destructive text-white"
                                  : "bg-muted-foreground text-background"
                              : "bg-card hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          {x.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
