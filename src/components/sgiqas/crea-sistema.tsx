"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaSistemaAction } from "@/features/sgiqas/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClipboardCheck, Plus } from "lucide-react";

export function CreaSistema({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaSistemaAction(companyId);
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-area-sistemi text-white">
            <ClipboardCheck className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia il sistema integrato</h2>
            <p className="text-sm text-muted-foreground">
              ISO 9001 · ISO 14001 · ISO 45001 — 107 requisiti · 18 procedure · 56 moduli · 16 registri
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Un sistema solo per tre norme: i requisiti che valgono per pi&ugrave; di una si valutano una volta
          sola. Trentatr&eacute; dei 107 valgono per tutte e tre.
        </p>
        <p className="text-sm text-muted-foreground">
          Il <strong>perimetro</strong> si sceglie subito e si cambia quando serve: un&apos;azienda certificata
          solo ISO 9001 vede i suoi 57 requisiti, e l&apos;indice di conformit&agrave; si calcola su quelli.
          Togliere una norma non cancella il lavoro gi&agrave; fatto sui suoi requisiti.
        </p>
        {errore && <p className="text-sm text-destructive" role="alert">{errore}</p>}
        <Button onClick={crea} disabled={inCorso} data-tour="qas-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione…" : "Avvia il sistema"}
        </Button>
      </CardContent>
    </Card>
  );
}
