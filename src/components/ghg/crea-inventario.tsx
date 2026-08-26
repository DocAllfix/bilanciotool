"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInventoryAction, importGhgAction } from "@/features/ghg/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Plus } from "lucide-react";

// Primo inventario dell'azienda: creazione da zero o import dal prototipo.
export function CreaInventario({ companyId }: { companyId: string }) {
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
    const esito = await createInventoryAction({ companyId, anno });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.push(`/aziende/${companyId}/ghg/${anno}`);
    router.refresh();
  }

  async function importa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setInCorso(true);
    try {
      const json = JSON.parse(await file.text());
      const esito = await importGhgAction(companyId, json);
      setInCorso(false);
      if (!esito.ok) return setErrore(esito.errore);
      const ultimo = esito.dati!.inventari.at(-1)!;
      router.push(`/aziende/${companyId}/ghg/${ultimo.anno}`);
      router.refresh();
    } catch {
      setInCorso(false);
      setErrore("File non leggibile: atteso l'export JSON del prototipo GHG.");
    }
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo inventario</h2>
          <p className="text-sm text-muted-foreground">Parti dal percorso guidato in 8 passi.</p>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={crea} className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ci-anno">Periodo di rendicontazione</Label>
              <Input id="ci-anno" name="anno" type="number" defaultValue={annoScorso} min={1990} max={2100} className="w-32" data-slot="kpi" />
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
          <p className="text-sm text-muted-foreground">
            Hai già un archivio JSON esportato dallo strumento precedente? Migra tutto: voci, sorgenti, fattori, obiettivi.
          </p>
        </CardHeader>
        <CardContent>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
            <FileUp className="size-4" /> Scegli file JSON
            <input type="file" accept="application/json,.json" className="sr-only" onChange={importa} disabled={inCorso} />
          </label>
        </CardContent>
      </Card>
      {errore && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">{errore}</p>
      )}
    </div>
  );
}
