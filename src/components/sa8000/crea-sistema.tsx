"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaSistemaAction } from "@/features/sa8000/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HeartHandshake, Plus } from "lucide-react";

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
            <HeartHandshake className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia il sistema SA8000/2026</h2>
            <p className="text-sm text-muted-foreground">
              112 criteri · 22 procedure · 104 moduli · 10 registri
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Lo Standard si legge in tre sezioni: cinque criteri <strong>fondazionali</strong>, quarantadue di
          <strong> sistema di gestione</strong> e sessantacinque di <strong>prestazione</strong> per il lavoro
          dignitoso.
        </p>
        <p className="text-sm text-muted-foreground">
          Un criterio attuato <strong>parzialmente</strong> pesa zero, non meta&apos;: un criterio sociale
          applicato a meta&apos; non protegge a meta&apos; un lavoratore, e il punteggio non deve suggerire il
          contrario.
        </p>
        {errore && <p className="text-sm text-destructive" role="alert">{errore}</p>}
        <Button onClick={crea} disabled={inCorso} data-tour="sa-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione..." : "Avvia il sistema"}
        </Button>
      </CardContent>
    </Card>
  );
}
