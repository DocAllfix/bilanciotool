"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaAssettoAction } from "@/features/segnalazioni/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Megaphone, Plus } from "lucide-react";

export function CreaAssetto({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaAssettoAction(companyId);
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-area-responsabilita text-white">
            <Megaphone className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia la gestione delle segnalazioni</h2>
            <p className="text-sm text-muted-foreground">
              D.Lgs. 24/2023 · 82 requisiti · 12 procedure · 34 moduli
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Il modulo serve a <strong>governare</strong> il canale interno: censirne le modalità, tenere il
          fascicolo di ogni segnalazione, presidiare i termini di legge e rendere la relazione all&apos;organo di
          controllo.
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>Non è il canale.</strong> Le segnalazioni continuano ad arrivare dove arrivano oggi — la
          piattaforma, la casella dedicata, il telefono — e il legame fra il codice di collegamento e la persona
          resta custodito dal gestore, fuori da questo strumento. Qui non si registra mai un nominativo.
        </p>
        <p className="text-sm text-muted-foreground">
          L&apos;obbligo non nasce solo dal Modello 231: bastano cinquanta lavoratori subordinati, o
          l&apos;appartenenza a un settore indicato dalla legge.
        </p>
        {errore && <p className="text-sm text-destructive" role="alert">{errore}</p>}
        <Button onClick={crea} disabled={inCorso} data-tour="wb-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione…" : "Avvia la gestione"}
        </Button>
      </CardContent>
    </Card>
  );
}
