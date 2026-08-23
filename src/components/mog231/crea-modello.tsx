"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaModelloAction } from "@/features/mog231/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Gavel, Plus } from "lucide-react";

export function CreaModello({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaModelloAction(companyId);
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-area-responsabilita text-white">
            <Gavel className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia il Modello 231</h2>
            <p className="text-sm text-muted-foreground">
              D.Lgs. 231/2001 · 25 reati presupposto · 81 presidi · 18 procedure
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Il Modello è una fotografia che si revisiona, non un esercizio che si ricomincia ogni anno. Alla
          creazione si congela la versione dei contenuti: gli aggiornamenti successivi del catalogo non
          cambiano un Modello già adottato.
        </p>
        <p className="text-sm text-muted-foreground">
          Il lavoro vero è la <strong>mappatura</strong>: quali reati riguardano l&apos;ente, e in quali
          processi possono essere commessi. Da lì discendono il rischio e i presidi.
        </p>
        {errore && <p className="text-sm text-destructive" role="alert">{errore}</p>}
        <Button onClick={crea} disabled={inCorso} data-tour="mog-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione…" : "Avvia il Modello"}
        </Button>
      </CardContent>
    </Card>
  );
}
