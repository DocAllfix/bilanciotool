"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCompanyImageAction, updateImpostazioniAction, updateProfiloAction } from "@/features/report/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Trash2 } from "lucide-react";
import type { AziendaReport, ProgettoReport } from "./types";
import { fileADataUrl } from "@/lib/immagini-client";

// Passo 1 — Organizzazione: profilo, standard, perimetro, logo e copertina
// (compaiono sulla prima pagina del documento).

const STANDARDS = [
  "GRI 2021 — opzione con riferimento",
  "GRI 2021 — in conformità",
  "ESRS (VSME) volontario",
  "GRI 2021 + ESRS",
];

// Ridimensiona lato client prima dell'upload (mai megafoto verso il server).
export function PassoOrganizzazione({
  companyId,
  azienda,
  progetto,
}: {
  companyId: string;
  azienda: AziendaReport;
  progetto: ProgettoReport;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const p = progetto.profilo;

  async function salvaProfilo(patch: Record<string, string>) {
    const esito = await updateProfiloAction(companyId, progetto.id, patch);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function caricaImmagine(tipo: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    setErrore(null);
    try {
      const dataUrl = await fileADataUrl(file, tipo === "logo" ? 600 : 1800);
      const esito = await setCompanyImageAction(companyId, tipo, dataUrl);
      if (!esito.ok) return setErrore(esito.errore);
      router.refresh();
    } catch {
      setErrore("Immagine non leggibile.");
    }
  }

  const campo = (k: string, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${k}`}>{label}</Label>
      <Input id={`p-${k}`} defaultValue={p[k] ?? ""} onBlur={(e) => { if (e.target.value !== (p[k] ?? "")) salvaProfilo({ [k]: e.target.value }); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const boxImmagine = (tipo: "logo" | "cover", label: string, url: string | null) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex min-h-24 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className={tipo === "logo" ? "max-h-20 max-w-full object-contain p-2" : "h-32 w-full object-cover"} />
        ) : (
          <span className="text-xs text-muted-foreground">nessuna immagine</span>
        )}
      </div>
      <div className="flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
          <ImagePlus className="size-3.5" /> Carica
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => caricaImmagine(tipo, e.target.files?.[0])} />
        </label>
        {url && (
          <Button variant="ghost" size="sm" onClick={async () => { await setCompanyImageAction(companyId, tipo, null); router.refresh(); }}>
            <Trash2 className="size-3.5" /> Rimuovi
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {errore && <p role="alert" className="text-sm text-destructive lg:col-span-2">{errore}</p>}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identità</h2></CardHeader>
        <CardContent className="space-y-4">
          {campo("forma", "Forma giuridica")}
          <div className="grid grid-cols-2 gap-3">
            {campo("piva", "Partita IVA")}
            {campo("ateco", "Codice ATECO")}
          </div>
          {campo("sede", "Sede legale")}
          {campo("settore", "Settore di attività")}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            {boxImmagine("logo", "Logo", azienda.logoUrl)}
            {boxImmagine("cover", "Copertina", azienda.coverUrl)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attività e perimetro</h2></CardHeader>
        <CardContent className="space-y-4">
          {campo("sitiop", "Siti operativi", "Stabilimenti, magazzini, uffici inclusi nella rendicontazione")}
          {campo("mercati", "Mercati serviti", "Aree geografiche e tipologie di cliente")}
          {campo("contatto", "Referente per il bilancio")}
          <div className="space-y-1.5">
            <Label>Standard adottato</Label>
            <Select
              defaultValue={progetto.standard}
              onValueChange={async (v) => {
                const esito = await updateImpostazioniAction(companyId, progetto.id, { standard: v });
                if (!esito.ok) setErrore(esito.errore);
                router.refresh();
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-perimetro">Perimetro di rendicontazione</Label>
            <Textarea
              id="p-perimetro"
              defaultValue={progetto.perimetro ?? ""}
              className="min-h-20"
              onBlur={async (e) => {
                if (e.target.value !== (progetto.perimetro ?? "")) {
                  const esito = await updateImpostazioniAction(companyId, progetto.id, { perimetro: e.target.value });
                  if (!esito.ok) setErrore(esito.errore);
                  router.refresh();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
