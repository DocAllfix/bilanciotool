"use client";

import { useState } from "react";
import { updateProfiloAction } from "@/features/supplier/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AziendaSupplier, PropsVista } from "./types";

// Vista 4 — Anagrafica e contesto della richiesta. Salvataggio campo per campo
// all'uscita dal controllo: il client non rimanda mai il profilo intero.

type Campo = { key: string; label: string; hint?: string; tipo?: string };

const AZIENDA: Campo[] = [
  { key: "piva", label: "Partita IVA" },
  { key: "settore", label: "Settore di attività" },
  { key: "ateco", label: "Codice ATECO" },
  { key: "sede", label: "Sede operativa" },
  { key: "dipendenti", label: "Dipendenti" },
  { key: "fatturato", label: "Fatturato (milioni di €)" },
];

const RICHIESTA: Campo[] = [
  { key: "committente", label: "Committente che ha richiesto la valutazione", hint: "Compare nell'attestato" },
  { key: "referente", label: "Referente interno per la compilazione", hint: "Chi risponde dei dati dichiarati" },
  { key: "scadenza", label: "Termine di consegna", tipo: "date" },
];

export function VistaAnagrafica({ azienda, valutazione }: { azienda: AziendaSupplier } & Pick<PropsVista, "valutazione">) {
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<string | null>(null);

  async function salva(key: string, valore: string) {
    setErrore(null);
    const esito = await updateProfiloAction(valutazione.id, { [key]: valore });
    if (!esito.ok) return setErrore(esito.errore);
    setSalvato(key);
    setTimeout(() => setSalvato((k) => (k === key ? null : k)), 1600);
  }

  const campo = (c: Campo, gruppo: string) => {
    const id = `sr-${c.key}`;
    const valore = valutazione.profilo[c.key as keyof typeof valutazione.profilo] ?? "";
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
          aria-label={`${gruppo}: ${c.label}`}
          onBlur={(e) => { if (e.target.value !== valore) salva(c.key, e.target.value); }}
        />
        {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">L&apos;azienda valutata</h2>
          <p className="text-sm text-muted-foreground">
            {azienda.nome} — questi dati finiscono in testa all&apos;attestato consegnato al committente.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AZIENDA.map((c) => campo(c, "Azienda"))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">La richiesta</h2>
          <p className="text-sm text-muted-foreground">
            Chi ha chiesto l&apos;autovalutazione, chi risponde dei dati e entro quando va consegnata.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RICHIESTA.map((c) => campo(c, "Richiesta"))}
        </CardContent>
      </Card>
    </div>
  );
}
