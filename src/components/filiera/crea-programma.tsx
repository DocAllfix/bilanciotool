"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaProgrammaAction } from "@/features/filiera/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Network, Plus } from "lucide-react";

export function CreaProgramma({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaProgrammaAction(companyId);
    setInCorso(false);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-area-compliance text-white">
            <Network className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Avvia la due diligence di filiera</h2>
            <p className="text-sm text-muted-foreground">
              14 procedure · 56 moduli · 7 registri · sei fasi del ciclo OCSE
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ogni partner si legge su <strong>due assi</strong>: il rischio <strong>inerente</strong>, che
          dipende dal contesto e che il partner non puo&apos; cambiare (paese, settore, prodotto, modello di
          approvvigionamento), e la <strong>maturita&apos;</strong>, che dipende da cio&apos; che ha messo in
          piedi. L&apos;incrocio dei due da&apos; il rischio residuo, e dal residuo discende ogni quanto lo si
          verifica.
        </p>
        <p className="text-sm text-muted-foreground">
          Tre aree non ammettono silenzi: <strong>lavoro minorile</strong>, <strong>lavoro forzato</strong> e{" "}
          <strong>salute e sicurezza</strong>. Lasciarle in bianco non fa salire la maturita&apos;: la
          limita.
        </p>
        {errore && (
          <p className="text-sm text-destructive" role="alert">
            {errore}
          </p>
        )}
        <Button onClick={crea} disabled={inCorso} data-tour="fil-crea">
          <Plus className="size-4" /> {inCorso ? "Creazione..." : "Avvia il programma"}
        </Button>
      </CardContent>
    </Card>
  );
}
