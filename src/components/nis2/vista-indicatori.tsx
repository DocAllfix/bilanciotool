"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";

import {
  caricaIndicatoriBaseAction,
  creaIndicatoreAction,
  setCampoIndicatoreAction,
  setRilevazioneAction,
} from "@/features/sgnis2/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DatiSgNis2, Indicatore } from "./types";

// Vista — Gli indicatori.
//
// ⚠️ IL VERSO DI MIGLIORAMENTO E' IL CUORE, e la schermata lo dice a parole invece di
// affidarlo a una freccia: per il tasso di clic nel phishing scendere e' un risultato, per
// la copertura MFA e' un disastro. Lo stesso numero e la stessa variazione, due giudizi
// opposti — e una freccia in giu' verde, senza spiegazione, si legge come un difetto.

const STATO_NOME: Record<string, string> = {
  a_target: "a target",
  in_attenzione: "in attenzione",
  fuori_target: "fuori target",
  non_rilevato: "non rilevato",
};

const STATO_COLORE: Record<string, string> = {
  a_target: "var(--primary)",
  in_attenzione: "var(--chart-4)",
  fuori_target: "var(--destructive)",
  non_rilevato: "var(--border)",
};

export function VistaIndicatori({ companyId, dati }: { companyId: string; dati: DatiSgNis2 }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [codice, setCodice] = useState("");
  const [nome, setNome] = useState("");

  const carica = () =>
    avvia(async () => {
      const esito = await caricaIndicatoriBaseAction(companyId);
      if (!esito.ok) {
        toast.error(esito.errore);
        return;
      }
      // ⚠️ Zero aggiunti non e' un errore: e' la prova che un secondo caricamento NON
      // sovrascrive i target gia' tarati sull'azienda. Dirlo evita che qualcuno prema di
      // nuovo credendo che non abbia funzionato.
      const aggiunti = esito.dati?.aggiunti ?? 0;
      toast.success(
        aggiunti === 0
          ? "Gli indicatori di base ci sono già: i tuoi valori non sono stati toccati."
          : `${aggiunti} indicatori aggiunti.`,
      );
      router.refresh();
    });

  const crea = (e: React.FormEvent) => {
    e.preventDefault();
    avvia(async () => {
      setErrore(null);
      const esito = await creaIndicatoreAction(companyId, { codice, nome });
      if (!esito.ok) return setErrore(esito.errore);
      setCodice("");
      setNome("");
      router.refresh();
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Indicatori</h2>
          <p className="text-sm text-muted-foreground">
            Diciannove indicatori proposti dal decreto e dalle determinazioni ACN. Si{" "}
            <b>copiano</b> nel sistema dell&apos;azienda: il target si tara su di lei, e un secondo
            caricamento non lo riporta indietro.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Button variant="outline" onClick={carica} data-tour="sgnis2-carica-indicatori">
            Carica i 19 indicatori di base
          </Button>
          <form onSubmit={crea} method="post" className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ind-codice">Codice</Label>
              <Input
                id="ind-codice"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
                className="w-[110px]"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ind-nome">Denominazione</Label>
              <Input
                id="ind-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-[260px]"
                required
              />
            </div>
            <Button type="submit" variant="secondary">
              <Plus className="size-4" />
              Aggiungi
            </Button>
          </form>
          {errore && (
            <p role="alert" className="w-full text-sm text-destructive">
              {errore}
            </p>
          )}
        </CardContent>
      </Card>

      {dati.indicatori.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nessun indicatore. Carica quelli di base, oppure aggiungine uno tuo.
        </div>
      ) : (
        <div className="space-y-3" data-risultati="">
          {dati.indicatori.map((i) => (
            <RigaIndicatore key={i.id} companyId={companyId} i={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function RigaIndicatore({ companyId, i }: { companyId: string; i: Indicatore }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const [periodo, setPeriodo] = useState("");
  const [valore, setValore] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  const salvaCampo = (input: Parameters<typeof setCampoIndicatoreAction>[1]) =>
    avvia(async () => {
      const esito = await setCampoIndicatoreAction(companyId, input);
      if (!esito.ok) {
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });

  const registra = (e: React.FormEvent) => {
    e.preventDefault();
    avvia(async () => {
      setErrore(null);
      const esito = await setRilevazioneAction(companyId, {
        indicatorId: i.id,
        periodo,
        valore,
      });
      if (!esito.ok) return setErrore(esito.errore);
      setPeriodo("");
      setValore("");
      router.refresh();
    });
  };

  const Freccia = i.andamento > 0 ? TrendingUp : i.andamento < 0 ? TrendingDown : Minus;

  return (
    <Card data-indicatore={i.codice}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {i.codice}
              {i.ambito ? ` · ${i.ambito}` : ""}
              {i.tipo ? ` · ${i.tipo}` : ""}
            </p>
            <p className="mt-1 text-[14px] font-medium">{i.nome}</p>
            {i.formula && <p className="text-[13px] text-muted-foreground">{i.formula}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-semibold" data-slot="kpi">
              {i.ultima?.valore ?? "—"}
              {i.unita ? <span className="ml-0.5 text-sm font-normal">{i.unita}</span> : null}
            </p>
            <span
              className="mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{
                background: STATO_COLORE[i.statoCalcolato],
                color: i.statoCalcolato === "non_rilevato" ? "inherit" : "#fff",
              }}
              data-slot="stato-indicatore"
            >
              {STATO_NOME[i.statoCalcolato]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ⚠️ Il verso si dice A PAROLE, non con un colore: una freccia in giù verde, senza
            spiegazione, si legge come un difetto del prodotto. */}
        <p className="text-xs text-muted-foreground">
          <Freccia className={cn("mr-1 inline size-3.5", i.andamento > 0 && "text-primary", i.andamento < 0 && "text-destructive")} />
          Per questo indicatore <b>{i.verso === "decrescente" ? "scendere" : "salire"} è un miglioramento</b>
          {i.ultima ? (i.andamento > 0 ? " · l'ultima rilevazione migliora" : i.andamento < 0 ? " · l'ultima rilevazione peggiora" : " · invariato") : ""}
          {i.scostamento != null && ` · ${i.scostamento > 0 ? "+" : ""}${i.scostamento}% rispetto al target`}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`tg-${i.id}`}>Target</Label>
            <Input
              id={`tg-${i.id}`}
              defaultValue={i.target ?? ""}
              aria-label={`Target di ${i.codice}`}
              onBlur={(e) =>
                e.target.value !== (i.target ?? "") &&
                salvaCampo({ id: i.id, campo: "target", valore: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`sg-${i.id}`}>Soglia di attenzione</Label>
            <Input
              id={`sg-${i.id}`}
              defaultValue={i.soglia ?? ""}
              aria-label={`Soglia di ${i.codice}`}
              onBlur={(e) =>
                e.target.value !== (i.soglia ?? "") &&
                salvaCampo({ id: i.id, campo: "soglia", valore: e.target.value })
              }
            />
          </div>
          <form onSubmit={registra} method="post" className="flex items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`pe-${i.id}`}>Periodo</Label>
              <Input
                id={`pe-${i.id}`}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="2026-03"
                aria-label={`Periodo della rilevazione di ${i.codice}`}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`va-${i.id}`}>Valore</Label>
              <Input
                id={`va-${i.id}`}
                value={valore}
                onChange={(e) => setValore(e.target.value)}
                className="w-[90px]"
                aria-label={`Valore della rilevazione di ${i.codice}`}
                required
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Registra
            </Button>
          </form>
        </div>

        {errore && (
          <p role="alert" className="text-sm text-destructive">
            {errore}
          </p>
        )}

        {i.rilevazioni.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {i.rilevazioni.map((r) => `${r.periodo}: ${r.valore ?? "—"}`).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
