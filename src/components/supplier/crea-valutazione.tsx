"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssessmentAction } from "@/features/supplier/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function CreaValutazione({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const soglia = Number(new FormData(e.currentTarget).get("soglia"));
    const esito = await createAssessmentAction({ companyId, sogliaRichiesta: soglia });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.push(`/aziende/${companyId}/fornitore`);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuova autovalutazione</h2>
          <p className="text-sm text-muted-foreground">
            37 domande su 5 aree, con l&apos;evidenza documentale che ciascuna presuppone. Alla fine produce un
            attestato da consegnare al committente, con l&apos;indice di prontezza e la fascia di giudizio.
          </p>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={crea} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sr-crea-soglia">Soglia richiesta</Label>
              <Input
                id="sr-crea-soglia"
                name="soglia"
                type="number"
                defaultValue={60}
                min={0}
                max={100}
                className="w-28"
                data-slot="kpi"
              />
            </div>
            <Button type="submit" disabled={inCorso}>
              <Plus className="size-4" /> Avvia
            </Button>
            <p className="max-w-sm pb-2 text-xs text-muted-foreground">
              È il punteggio minimo che il committente chiede. Si può cambiare in qualunque momento.
            </p>
          </form>
          {errore && <p role="alert" className="mt-3 text-sm text-destructive">{errore}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
