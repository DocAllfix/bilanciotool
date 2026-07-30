"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReportProjectAction, importBilancioAction } from "@/features/report/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Plus } from "lucide-react";

export function CreaBilancio({ companyId }: { companyId: string }) {
  const router = useRouter();
  const annoScorso = new Date().getFullYear() - 1;
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const anno = Number(new FormData(e.currentTarget).get("anno"));
    const esito = await createReportProjectAction({ companyId, anno });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.push(`/aziende/${companyId}/bilancio/${anno}`);
    router.refresh();
  }

  async function importa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setInCorso(true);
    try {
      const json = JSON.parse(await file.text());
      const esito = await importBilancioAction(companyId, json);
      setInCorso(false);
      if (!esito.ok) return setErrore(esito.errore);
      router.push(`/aziende/${companyId}/bilancio/${esito.dati!.anno}`);
      router.refresh();
    } catch {
      setInCorso(false);
      setErrore("File non leggibile: atteso l'export JSON del prototipo Bilancio.");
    }
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo bilancio</h2>
          <p className="text-sm text-muted-foreground">Percorso guidato in 7 passi, dal profilo al documento.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={crea} className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cb-anno">Esercizio</Label>
              <Input id="cb-anno" name="anno" type="number" defaultValue={annoScorso} min={1990} max={2100} className="w-32" data-slot="kpi" />
            </div>
            <Button type="submit" disabled={inCorso}>
              <Plus className="size-4" /> Crea
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Importa dal prototipo</h2>
          <p className="text-sm text-muted-foreground">Migra materialità, indicatori, capitoli e immagini dall&apos;archivio JSON.</p>
        </CardHeader>
        <CardContent>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
            <FileUp className="size-4" /> Scegli file JSON
            <input type="file" accept="application/json,.json" className="sr-only" onChange={importa} disabled={inCorso} />
          </label>
        </CardContent>
      </Card>
      {errore && <p role="alert" className="text-sm text-destructive sm:col-span-2">{errore}</p>}
    </div>
  );
}
