"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { avviaSistemaAction } from "@/features/gdpr/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// L'apertura del percorso Protezione dei dati.
//
// ⚠️ La radice nasce SOLO da questo comando, mai aprendo la pagina: un'azienda archiviata
// deve potersi consultare senza che la consultazione scriva qualcosa — e il database lo
// rifiuterebbe, trasformando una lettura in un errore.

export function CreaPercorsoGdpr({
  companyId,
  aziendaNome,
  requisiti,
  gruppi,
  archiviata,
}: {
  companyId: string;
  aziendaNome: string;
  requisiti: number;
  gruppi: number;
  archiviata: boolean;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function apri() {
    setErrore(null);
    setInCorso(true);
    const esito = await avviaSistemaAction(companyId);
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{aziendaNome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Protezione dei dati personali · Reg. (UE) 2016/679 · D.Lgs. 196/2003</p>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo percorso sulla protezione dei dati</h2>
          <p className="text-sm text-muted-foreground">
            Si comincia dall&apos;organizzazione e dal registro dei trattamenti. Poi {requisiti} requisiti in {gruppi} gruppi,
            i rischi per gli interessati con il vaglio della valutazione d&apos;impatto, i responsabili esterni, la politica,
            gli indicatori e i registri — con le scadenze delle richieste e le 72 ore delle violazioni calcolate da sole.
          </p>
        </CardHeader>
        <CardContent>
          {archiviata ? (
            <p className="text-sm text-muted-foreground">L&apos;azienda è archiviata: non si avviano percorsi nuovi.</p>
          ) : (
            <Button onClick={apri} disabled={inCorso} data-tour="gdpr-avvia">
              <Plus className="size-4" />
              {inCorso ? "Apertura…" : "Avvia il percorso"}
            </Button>
          )}
          {errore && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errore}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
