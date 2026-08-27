"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBalanceAction } from "@/features/energy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function CreaBilancioEnergetico({ companyId }: { companyId: string }) {
  const router = useRouter();
  const annoScorso = new Date().getFullYear() - 1;
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const f = new FormData(e.currentTarget);
    const anno = Number(f.get("anno"));
    const annoBase = Number(f.get("annoBase"));
    const esito = await createBalanceAction({ companyId, anno, annoBase });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.push(`/aziende/${companyId}/energetico/${anno}`);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo bilancio energetico</h2>
          <p className="text-sm text-muted-foreground">
            Percorso guidato in 8 passi: dai consumi in fattura alla ripartizione sugli usi finali, fino al
            programma di miglioramento. Gli undici usi finali più comuni sono già accesi.
          </p>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={crea} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-anno">Esercizio</Label>
              <Input id="ce-anno" name="anno" type="number" defaultValue={annoScorso} min={1990} max={2100} className="w-32" data-slot="kpi" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-base">Anno di riferimento</Label>
              <Input id="ce-base" name="annoBase" type="number" defaultValue={annoScorso - 1} min={1990} max={2100} className="w-32" data-slot="kpi" />
            </div>
            <Button type="submit" disabled={inCorso}>
              <Plus className="size-4" /> Crea
            </Button>
          </form>
          {errore && <p role="alert" className="mt-3 text-sm text-destructive">{errore}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
