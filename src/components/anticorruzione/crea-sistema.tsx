"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaSistemaAction } from "@/features/anticorruzione/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Scale } from "lucide-react";

// Lo stato vuoto del modulo.
//
// Non chiede niente. Il prototipo apriva con un'anagrafica di ventitré campi, e
// ventitré campi davanti a chi non ha ancora deciso di usare il modulo sono un muro:
// la ragione sociale si eredita dall'azienda, il resto si compila lavorando.

export function CreaSistema({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaSistemaAction(companyId);
    setInCorso(false);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    // Misurato su build di produzione: la vista compare dopo ~6 secondi. Non e'
    // istantaneo e non e' un difetto di questo componente — vale per ogni
    // `router.refresh()` del prodotto, ed e' il motivo per cui i collaudi di questi
    // moduli attendono con generosita' invece di dare per scontato l'immediato.
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-area-responsabilita text-white">
            <Scale className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia il sistema di prevenzione della corruzione</h2>
            <p className="text-sm text-muted-foreground">UNI ISO 37001 · 91 requisiti · 12 procedure · 47 moduli</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Il sistema è una fotografia corrente che si mantiene e si revisiona, non un esercizio che si
          ricomincia ogni anno. Alla creazione si congela la versione dei contenuti: gli aggiornamenti
          successivi del catalogo non cambiano un sistema già avviato.
        </p>
        <p className="text-sm text-muted-foreground">
          Non serve compilare niente adesso: la ragione sociale arriva dall&apos;anagrafica dell&apos;azienda, e il
          resto si riempie lavorando.
        </p>
        {errore && (
          <p className="text-sm text-destructive" role="alert">
            {errore}
          </p>
        )}
        <Button onClick={crea} disabled={inCorso} data-tour="pc-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione…" : "Avvia il sistema"}
        </Button>
      </CardContent>
    </Card>
  );
}
