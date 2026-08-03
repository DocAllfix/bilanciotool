"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setModuleAction, setRuoliAction, updateProfiloAction } from "@/features/soa/actions";
import {
  ETICHETTA_RUOLO_CLOUD, ETICHETTA_RUOLO_PRIVACY, RUOLI_CLOUD, RUOLI_PRIVACY,
} from "@/features/soa/validation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import type { AziendaSoa, PropsVista } from "./types";

// Vista 3 — Contesto e ambito. Qui si decide che cosa la Dichiarazione deve
// coprire: i ruoli dell'organizzazione e i moduli estesi da attivare.
//
// I ruoli sono tendine a valori chiusi e non testo libero: da loro dipendono gli
// avvisi di coerenza, e con il testo libero quegli avvisi erano inaffidabili.

type Campo = { key: string; label: string; hint?: string; lungo?: boolean; tipo?: string };

const CONTESTO: Campo[] = [
  { key: "piva", label: "Partita IVA" },
  { key: "sede", label: "Sede e unità operative nel perimetro" },
  { key: "versione", label: "Revisione del documento", hint: "Es. 1.0, 1.1" },
  { key: "data", label: "Data della revisione", tipo: "date" },
  { key: "redatto", label: "Redatto da" },
  { key: "approvato", label: "Approvato da", hint: "Chi firma la Dichiarazione" },
];

export function VistaContesto({
  companyId, azienda, dichiarazione, catalogo, stato,
}: { azienda: AziendaSoa } & PropsVista) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<string | null>(null);
  const [ruoli, setRuoli] = useState({
    ruoloPrivacy: dichiarazione.ruoloPrivacy as string,
    ruoloCloud: dichiarazione.ruoloCloud as string,
  });
  const [moduli, setModuli] = useState<Record<string, boolean>>(stato.moduliAttivi);

  async function salvaProfilo(key: string, valore: string) {
    setErrore(null);
    const esito = await updateProfiloAction(dichiarazione.id, { [key]: valore });
    if (!esito.ok) return setErrore(esito.errore);
    setSalvato(key);
    setTimeout(() => setSalvato((k) => (k === key ? null : k)), 1600);
  }

  async function salvaRuolo(campo: "ruoloPrivacy" | "ruoloCloud", valore: string) {
    setErrore(null);
    setRuoli((r) => ({ ...r, [campo]: valore }));
    const esito = await setRuoliAction(companyId, dichiarazione.id, { [campo]: valore } as never);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function commutaModulo(frameworkKey: string, attivo: boolean) {
    setErrore(null);
    setModuli((m) => ({ ...m, [frameworkKey]: attivo }));
    const esito = await setModuleAction(companyId, dichiarazione.id, { frameworkKey: frameworkKey as "27017", attivo });
    if (!esito.ok) {
      setModuli((m) => ({ ...m, [frameworkKey]: !attivo }));
      return setErrore(esito.errore);
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Campo di applicazione</h2>
          <p className="text-sm text-muted-foreground">
            È la prima cosa che l&apos;auditor legge: descrive quali attività, sedi e servizi il sistema di
            gestione copre, e quali restano fuori.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="soa-scope">Perimetro del sistema di gestione</Label>
              {salvato === "scope" && <span className="text-[11px] text-success">salvato</span>}
            </div>
            <Textarea
              id="soa-scope"
              rows={3}
              className="mt-1.5"
              defaultValue={dichiarazione.profilo.scope ?? ""}
              placeholder="Progettazione, erogazione e assistenza dei servizi… svolti presso la sede di…"
              aria-label="Perimetro del sistema di gestione"
              onBlur={(e) => { if (e.target.value !== (dichiarazione.profilo.scope ?? "")) salvaProfilo("scope", e.target.value); }}
            />
          </div>
          <div>
            <Label htmlFor="soa-escl">Esclusioni dal perimetro</Label>
            <Textarea
              id="soa-escl"
              rows={2}
              className="mt-1.5"
              defaultValue={dichiarazione.profilo.esclusioni ?? ""}
              placeholder="Nessuna esclusione di processo o di sede."
              aria-label="Esclusioni dal perimetro"
              onBlur={(e) => { if (e.target.value !== (dichiarazione.profilo.esclusioni ?? "")) salvaProfilo("esclusioni", e.target.value); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Ruoli dell&apos;organizzazione</h2>
          <p className="text-sm text-muted-foreground">
            Da questi dipendono i moduli estesi da attivare: sono scelte da un elenco chiuso, non testo libero,
            così gli avvisi di coerenza dicono il vero.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="soa-privacy">Ruolo nel trattamento dei dati personali</Label>
            <Select value={ruoli.ruoloPrivacy} onValueChange={(v) => salvaRuolo("ruoloPrivacy", v)}>
              <SelectTrigger id="soa-privacy" className="mt-1.5 w-full" aria-label="Ruolo nel trattamento dei dati personali">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUOLI_PRIVACY.map((r) => <SelectItem key={r} value={r}>{ETICHETTA_RUOLO_PRIVACY[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="soa-cloud">Posizione rispetto ai servizi cloud</Label>
            <Select value={ruoli.ruoloCloud} onValueChange={(v) => salvaRuolo("ruoloCloud", v)}>
              <SelectTrigger id="soa-cloud" className="mt-1.5 w-full" aria-label="Posizione rispetto ai servizi cloud">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUOLI_CLOUD.map((r) => <SelectItem key={r} value={r}>{ETICHETTA_RUOLO_CLOUD[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Quadri di riferimento in ambito</h2>
          <p className="text-sm text-muted-foreground">
            Attivare un modulo allarga la Dichiarazione: i suoi controlli entrano in ambito e vanno decisi uno
            per uno. Spegnerlo non cancella il lavoro fatto.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2">
          {catalogo.quadri.map((q) => {
            const fisso = q.sempreInAmbito;
            const attivo = fisso || moduli[q.key] === true;
            return (
              <label
                key={q.key}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${fisso ? "cursor-default bg-muted/40" : "hover:bg-accent"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={attivo}
                  disabled={fisso}
                  aria-label={`Attiva il quadro ${q.abbreviazione}`}
                  onChange={(e) => commutaModulo(q.key, e.target.checked)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{q.nome}</span>
                    <Badge variant="outline" data-slot="kpi">{q.totale} controlli</Badge>
                    {fisso && <Badge variant="secondary">sempre in ambito</Badge>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{q.descrizione}</span>
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      {stato.avvisi.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <h2 className="text-[15px] font-semibold tracking-tight">Coerenza fra profilo e ambito</h2>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {stato.avvisi.map((a) => (
                <li key={a.key} className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>{a.messaggio}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Identificazione del documento</h2>
          <p className="text-sm text-muted-foreground">
            {azienda.nome} — revisione, data e firme compaiono in testa alla Dichiarazione.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTESTO.map((c) => {
            const id = `soa-${c.key}`;
            const valore = dichiarazione.profilo[c.key as keyof typeof dichiarazione.profilo] ?? "";
            return (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={id}>{c.label}</Label>
                  {salvato === c.key && <span className="text-[11px] text-success">salvato</span>}
                </div>
                <Input
                  id={id}
                  type={c.tipo}
                  defaultValue={valore}
                  className="mt-1.5"
                  aria-label={`Documento: ${c.label}`}
                  onBlur={(e) => { if (e.target.value !== valore) salvaProfilo(c.key, e.target.value); }}
                />
                {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
