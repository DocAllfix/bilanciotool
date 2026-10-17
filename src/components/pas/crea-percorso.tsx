"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { avviaSistemaAction } from "@/features/pas/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// L'apertura del sistema di gestione sociale.
//
// ⚠️ La radice nasce SOLO da questo comando, mai aprendo la pagina: un'azienda archiviata
// deve potersi consultare senza che la consultazione scriva qualcosa — e il database lo
// rifiuterebbe, trasformando una lettura in un errore.

export function CreaPercorsoPas({
  companyId,
  aziendaNome,
  requisiti,
  sistema,
  allegato,
  parti,
  rischi,
  archiviata,
}: {
  companyId: string;
  aziendaNome: string;
  requisiti: number;
  sistema: number;
  allegato: number;
  parti: number;
  rischi: number;
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
      <p className="mt-1 text-sm text-muted-foreground">Sistema di gestione sociale · PAS 24000:2022</p>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo sistema di gestione sociale</h2>
          <p className="text-sm text-muted-foreground">
            Si comincia dal campo di applicazione e dai ruoli. Poi il contesto con {parti}{" "}parti interessate già impostate,{" "}
            {requisiti}{" "}requisiti ({sistema}{" "}sulle clausole di sistema, {allegato}{" "}sull&apos;Allegato A, che non ammette
            esclusioni), {rischi}{" "}rischi sociali da valutare dal punto di vista delle persone, la due diligence sui fornitori,
            la politica, gli indicatori e i registri — dai reclami al riesame della direzione.
          </p>
        </CardHeader>
        <CardContent>
          {archiviata ? (
            <p className="text-sm text-muted-foreground">L&apos;azienda è archiviata: non si avviano percorsi nuovi.</p>
          ) : (
            <Button onClick={apri} disabled={inCorso} data-tour="pas-avvia">
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
