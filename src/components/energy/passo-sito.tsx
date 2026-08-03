"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAnnoBaseAction, updateProfiloAction } from "@/features/energy/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AziendaEnergia, BilancioEnergia } from "./types";

// Passo 1 — Sito e perimetro. Salvataggio campo per campo all'uscita dal
// controllo: il client non rimanda mai il profilo intero, così due modifiche
// ravvicinate non si sovrascrivono.

type Campo = { key: string; label: string; hint?: string; lungo?: boolean };

const ANAGRAFICA: Campo[] = [
  { key: "forma", label: "Ragione sociale e forma giuridica" },
  { key: "piva", label: "Partita IVA o codice fiscale" },
  { key: "sede", label: "Sede dello stabilimento", hint: "Il sito oggetto della diagnosi, non la sede legale se diversa" },
  { key: "settore", label: "Settore di attività" },
  { key: "ateco", label: "Codice ATECO" },
  { key: "referente", label: "Referente per l'energia", hint: "Chi risponde dei dati raccolti" },
];

const IMPIANTO: Campo[] = [
  { key: "sito", label: "Superficie e caratteristiche del sito", hint: "Superficie coperta, anno di costruzione, tipologia costruttiva" },
  { key: "attivita", label: "Attività svolte nello stabilimento", lungo: true },
  { key: "turni", label: "Regime di esercizio", hint: "Turni, giorni lavorativi, fermate programmate" },
  { key: "unitaProd", label: "Unità di misura della produzione", hint: "Tonnellate, pezzi, metri quadri: è il denominatore degli indicatori" },
  { key: "perimetro", label: "Perimetro della diagnosi", hint: "Che cosa è incluso e che cosa resta fuori, e perché", lungo: true },
];

export function PassoSito({
  companyId, azienda, bilancio,
}: {
  companyId: string;
  azienda: AziendaEnergia;
  bilancio: BilancioEnergia;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<string | null>(null);

  async function salva(key: string, valore: string) {
    setErrore(null);
    const esito = await updateProfiloAction(companyId, bilancio.id, { [key]: valore });
    if (!esito.ok) return setErrore(esito.errore);
    setSalvato(key);
    setTimeout(() => setSalvato((k) => (k === key ? null : k)), 1600);
  }

  async function cambiaAnnoBase(valore: string) {
    const n = Number(valore);
    if (!Number.isInteger(n) || n < 1990 || n > 2100) return;
    const esito = await setAnnoBaseAction(companyId, bilancio.anno, bilancio.id, n);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  const campo = (c: Campo, gruppo: string) => {
    const id = `en-${c.key}`;
    const valore = bilancio.profilo[c.key as keyof typeof bilancio.profilo] ?? "";
    const Controllo = c.lungo ? Textarea : Input;
    return (
      <div key={c.key} className={c.lungo ? "sm:col-span-2" : undefined}>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{c.label}</Label>
          {salvato === c.key && <span className="text-[11px] text-success">salvato</span>}
        </div>
        <Controllo
          id={id}
          name={c.key}
          defaultValue={valore}
          rows={c.lungo ? 3 : undefined}
          aria-label={`${gruppo}: ${c.label}`}
          className="mt-1.5"
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (e.target.value !== valore) salva(c.key, e.target.value);
          }}
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
          <h2 className="text-[15px] font-semibold tracking-tight">Anagrafica</h2>
          <p className="text-sm text-muted-foreground">
            Chi è l&apos;organizzazione e chi risponde dei dati. Questi campi finiscono in copertina al documento.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">{ANAGRAFICA.map((c) => campo(c, "Anagrafica"))}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Stabilimento e perimetro</h2>
          <p className="text-sm text-muted-foreground">
            La diagnosi vale per quello che dichiara di coprire: scrivere il perimetro adesso evita contestazioni dopo.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">{IMPIANTO.map((c) => campo(c, "Stabilimento"))}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Esercizio e riferimento</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;anno di riferimento è il termine di paragone degli indicatori: senza, il confronto non compare.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div>
            <Label>Esercizio in esame</Label>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight" data-slot="kpi">{bilancio.anno}</p>
          </div>
          <div>
            <Label htmlFor="en-anno-base">Anno di riferimento</Label>
            <Input
              id="en-anno-base"
              type="number"
              min={1990}
              max={2100}
              defaultValue={bilancio.annoBase}
              className="mt-1.5 w-32"
              data-slot="kpi"
              aria-label="Anno di riferimento"
              onBlur={(e) => { if (Number(e.target.value) !== bilancio.annoBase) cambiaAnnoBase(e.target.value); }}
            />
          </div>
          <p className="max-w-sm text-xs text-muted-foreground">
            Il confronto compare solo se anche il {bilancio.annoBase} ha un bilancio energetico compilato per {azienda.nome}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
