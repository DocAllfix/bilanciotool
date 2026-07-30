"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setChecklistStateAction } from "@/features/ghg/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Catalogo, Inventario, StatoWizard } from "./types";

// Passo 7 — Verifica: i requisiti che un verificatore accreditato esamina per
// primi. Ogni nota diventa un riferimento per il fascicolo di audit.

const STATI = [
  { v: "ok", label: "Soddisfatto" },
  { v: "par", label: "Parziale" },
  { v: "no", label: "Da fare" },
] as const;

export function PassoVerifica({
  companyId, inventario, catalogo, stato,
}: {
  companyId: string;
  inventario: Inventario;
  catalogo: Catalogo;
  stato: StatoWizard;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const per = new Map(stato.checklist.map((c) => [c.requirementKey, c]));
  const ok = stato.checklist.filter((c) => c.stato === "ok").length;
  const daFare = stato.checklist.filter((c) => c.stato === "no").length;

  async function imposta(requirementKey: string, nuovo: "ok" | "par" | "no", nota?: string) {
    setErrore(null);
    const esito = await setChecklistStateAction(companyId, inventario.id, { requirementKey, stato: nuovo, nota });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card data-slot="kpi">
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requisiti soddisfatti</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{ok}<span className="text-base text-muted-foreground">/{catalogo.requisiti.length}</span></p>
            <Progress className="mt-2" value={(ok / catalogo.requisiti.length) * 100} />
          </CardContent>
        </Card>
        <Card data-slot="kpi">
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ancora da fare</p>
            <p className={cn("mt-1 text-3xl font-semibold tracking-tight", daFare > 0 && "text-destructive")}>{daFare}</p>
            <p className="mt-1 text-xs text-muted-foreground">requisiti aperti</p>
          </CardContent>
        </Card>
        <Card data-slot="kpi">
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stato di verifica</p>
            <p className="mt-2 text-sm font-medium">{inventario.boundaries.verifica || "Nessuna verifica di parte terza"}</p>
            <p className="mt-1 text-xs text-muted-foreground">dichiarato nei confini (passo 1)</p>
          </CardContent>
        </Card>
      </div>
      {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}

      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            Ogni requisito rimanda al paragrafo della norma. Le voci annotate si trasformano in riferimenti per il fascicolo di audit.
          </p>
        </CardHeader>
        <CardContent className="divide-y">
          {catalogo.requisiti.map((req) => {
            const st = per.get(req.key);
            return (
              <div key={req.key} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {req.nome} <Badge variant="outline" className="ml-1 font-mono">{req.clausola}</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{req.descrizione}</p>
                  <div className="mt-2 max-w-lg">
                    <Input
                      defaultValue={st?.nota ?? ""}
                      placeholder="Evidenza, documento di riferimento, azione da completare"
                      aria-label={`Nota per ${req.nome}`}
                      onBlur={(e) => { if (st && e.target.value !== (st.nota ?? "")) imposta(req.key, st.stato, e.target.value); }}
                    />
                  </div>
                </div>
                <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label={`Stato ${req.nome}`}>
                  {STATI.map((x) => (
                    <button
                      key={x.v}
                      type="button"
                      onClick={() => imposta(req.key, x.v, st?.nota ?? undefined)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors not-first:border-l",
                        st?.stato === x.v
                          ? x.v === "ok"
                            ? "bg-success text-white"
                            : x.v === "par"
                              ? "bg-warning text-white"
                              : "bg-destructive text-white"
                          : "bg-card hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
