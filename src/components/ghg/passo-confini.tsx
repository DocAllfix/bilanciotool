"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateBoundariesAction, updatePeriodMetaAction } from "@/features/ghg/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Inventario } from "./types";

// Passo 1 — Confini e perimetro. Autosave sul blur campo per campo: quello che
// scrivi qui finisce nel rapporto e viene chiesto in verifica.

const CONSOLIDAMENTI = ["Controllo operativo", "Controllo finanziario", "Quota di partecipazione"];
const VERIFICHE = [
  "Nessuna verifica di parte terza",
  "Verifica in corso",
  "Verificato con livello di garanzia limitato",
  "Verificato con livello di garanzia ragionevole",
];

export function PassoConfini({ companyId, inventario }: { companyId: string; inventario: Inventario }) {
  const router = useRouter();
  const [salvataggio, setSalvataggio] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const b = inventario.boundaries;

  async function salva(patch: Record<string, string>) {
    setSalvataggio("saving");
    const esito = await updateBoundariesAction(companyId, inventario.id, patch);
    setSalvataggio(esito.ok ? "saved" : "error");
    if (esito.ok) {
      router.refresh();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSalvataggio("idle"), 1800);
    }
  }

  async function salvaMeta(patch: { ricavi?: string; fte?: string; produzione?: string; umProduzione?: string }) {
    setSalvataggio("saving");
    const esito = await updatePeriodMetaAction(companyId, inventario.id, patch);
    setSalvataggio(esito.ok ? "saved" : "error");
    if (esito.ok) router.refresh();
  }

  const campo = (k: string, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`b-${k}`}>{label}</Label>
      <Input id={`b-${k}`} defaultValue={b[k] ?? ""} onBlur={(e) => { if (e.target.value !== (b[k] ?? "")) salva({ [k]: e.target.value }); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const area = (k: string, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`b-${k}`}>{label}</Label>
      <Textarea id={`b-${k}`} defaultValue={b[k] ?? ""} className="min-h-20" onBlur={(e) => { if (e.target.value !== (b[k] ?? "")) salva({ [k]: e.target.value }); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="max-w-3xl text-sm text-muted-foreground">
          La norma chiede di dichiarare quali unità entrano nell&apos;inventario e con quale criterio, prima ancora di contare una tonnellata.
        </p>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {salvataggio === "saving" ? "Salvataggio…" : salvataggio === "saved" ? "Salvato ✓" : salvataggio === "error" ? "Errore di salvataggio" : ""}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identificazione</h2></CardHeader>
          <CardContent className="space-y-4">
            {campo("forma", "Denominazione e forma giuridica")}
            <div className="grid grid-cols-2 gap-3">
              {campo("piva", "Partita IVA / CF")}
              {campo("ateco", "Codice ATECO")}
            </div>
            {campo("sede", "Sede legale")}
            {campo("settore", "Settore di attività")}
            <div className="grid grid-cols-2 gap-3">
              {campo("dipendenti", "Organico medio (FTE)")}
              {campo("responsabile", "Responsabile inventario")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Confini organizzativi</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Approccio di consolidamento</Label>
              <Select defaultValue={b.consolidamento || CONSOLIDAMENTI[0]} onValueChange={(v) => salva({ consolidamento: v })}>
                <SelectTrigger aria-label="Approccio di consolidamento"><SelectValue /></SelectTrigger>
                <SelectContent>{CONSOLIDAMENTI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Il criterio scelto va applicato in modo uniforme a tutte le unità e mantenuto negli anni.</p>
            </div>
            {area("perimetroOrg", "Unità comprese nel perimetro", "Società, stabilimenti e filiali incluse — e le escluse, con motivazione.")}
            {area("siti", "Siti operativi", "Indirizzi e destinazione d'uso dei siti considerati.")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Confini di rendicontazione</h2></CardHeader>
          <CardContent className="space-y-4">
            {area("perimetroOp", "Descrizione dei confini di rendicontazione", "Quali categorie di emissioni indirette sono incluse e perché.")}
            {area("significativita", "Criteri di significatività", "Come sono state selezionate le emissioni indirette significative.")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Periodo e metodo</h2></CardHeader>
          <CardContent className="space-y-4">
            {campo("periodo", "Periodo di rendicontazione")}
            {area("metodologia", "Metodologia di quantificazione", "Dati di attività × fattori di emissione; indica le eccezioni e le fonti dei fattori.")}
            <div className="space-y-1.5">
              <Label>Stato della verifica</Label>
              <Select defaultValue={b.verifica || VERIFICHE[0]} onValueChange={(v) => salva({ verifica: v })}>
                <SelectTrigger aria-label="Stato della verifica"><SelectValue /></SelectTrigger>
                <SelectContent>{VERIFICHE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dati del periodo {inventario.anno}</h2>
            <p className="text-sm text-muted-foreground">Servono per le intensità di emissione richieste dalla norma.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-ricavi">Ricavi netti (€)</Label>
              <Input id="m-ricavi" data-slot="kpi" defaultValue={inventario.ricavi ?? ""} onBlur={(e) => salvaMeta({ ricavi: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-fte">Organico medio (FTE)</Label>
              <Input id="m-fte" data-slot="kpi" defaultValue={inventario.fte ?? ""} onBlur={(e) => salvaMeta({ fte: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-prod">Produzione</Label>
              <Input id="m-prod" data-slot="kpi" defaultValue={inventario.produzione ?? ""} onBlur={(e) => salvaMeta({ produzione: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-um">Unità di produzione</Label>
              <Input id="m-um" placeholder="t, pezzi, m²" defaultValue={inventario.umProduzione ?? ""} onBlur={(e) => salvaMeta({ umProduzione: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
