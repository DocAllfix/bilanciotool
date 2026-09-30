"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateImpostazioniAction, updateProfiloAction } from "@/features/report/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProgettoReport } from "./types";
import { ImmaginiDocumento } from "@/components/documento/immagini-documento";

// Passo 1 — Organizzazione: profilo, standard, perimetro, logo e copertina
// (compaiono sulla prima pagina del documento).

const STANDARDS = [
  "GRI 2021 — opzione con riferimento",
  "GRI 2021 — in conformità",
  "ESRS (VSME) volontario",
  "GRI 2021 + ESRS",
];

export function PassoOrganizzazione({
  companyId,
  progetto,
}: {
  companyId: string;
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

  const campo = (k: string, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${k}`}>{label}</Label>
      <Input id={`p-${k}`} defaultValue={p[k] ?? ""} onBlur={(e) => { if (e.target.value !== (p[k] ?? "")) salvaProfilo({ [k]: e.target.value }); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
          {/* ⚠️ Lo STESSO riquadro del pannello di pubblicazione di tutti i percorsi, non un
              caricatore proprio. Qui ce n'era uno più vecchio, senza la scelta del modo e con
              l'anteprima sempre ritagliata a fascia: la prima locandina A4 vera è passata da
              qui ed è uscita tagliata. Due caricatori per le stesse immagini divergono. */}
          <div className="space-y-2 border-t pt-4">
            <Label>Logo e copertina</Label>
            <ImmaginiDocumento companyId={companyId} />
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
              <SelectTrigger aria-label="Standard adottato"><SelectValue /></SelectTrigger>
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
