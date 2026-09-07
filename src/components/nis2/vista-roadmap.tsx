"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setCampoFaseAction } from "@/features/sgnis2/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtData } from "@/lib/format";
import { COLORE_LIVELLO, type DatiSgNis2, type Fase } from "./types";

// Vista — La roadmap e i termini.
//
// ⚠️ I due termini in cima decorrono dalla COMUNICAZIONE dell'Autorità, non dalla data di
// oggi. Senza quella data non sono zero: NON DECORRONO, ed e' una differenza che va detta —
// un contatore fermo a zero si legge «sei fuori termine», che e' l'opposto del vero.

const STATI_FASE = [
  { v: "non_avviata", nome: "Non avviata" },
  { v: "in_corso", nome: "In corso" },
  { v: "completata", nome: "Completata" },
] as const;

function Termine({
  titolo,
  articolo,
  data,
  giorni,
}: {
  titolo: string;
  articolo: string;
  data: string | null;
  giorni: number | null;
}) {
  const oltre = giorni != null && giorni < 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{articolo}</p>
        <p className="mt-1 text-[14px] font-medium">{titolo}</p>
        <p className={cn("mt-2 font-display text-2xl font-semibold", oltre && "text-destructive")}>
          {data ? fmtData(data) : "—"}
        </p>
        <p className={cn("mt-0.5 text-xs", oltre ? "text-destructive" : "text-muted-foreground")}>
          {giorni == null
            ? "non decorre: manca la comunicazione dell'Autorità"
            : oltre
              ? `${Math.abs(giorni)} giorni oltre il termine`
              : `${giorni} giorni`}
        </p>
      </CardContent>
    </Card>
  );
}

export function VistaRoadmap({ companyId, dati }: { companyId: string; dati: DatiSgNis2 }) {
  const r = dati.roadmap;

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-3" data-tour="sgnis2-termini">
        <Termine
          titolo="Obblighi di notifica"
          articolo="art. 25"
          data={r.termini.notifica}
          giorni={r.giorni.notifica}
        />
        <Termine
          titolo="Misure di gestione del rischio"
          articolo="art. 24"
          data={r.termini.misure}
          giorni={r.giorni.misure}
        />
        <Termine
          titolo="Registrazione annuale"
          articolo="art. 7"
          data={r.termini.registrazione}
          giorni={r.giorni.registrazione}
        />
      </div>

      {!r.termini.comunicazione && (
        <div className="rounded-md border border-dashed p-3">
          <p className="text-sm text-muted-foreground">
            La comunicazione con cui l&apos;Autorità conferma l&apos;inserimento nell&apos;elenco non
            è registrata: i nove e i diciotto mesi non decorrono.{" "}
            <b className="text-foreground">Non sono scaduti</b> — non sono ancora cominciati. La
            data si inserisce in <b className="text-foreground">Ambito e assetto</b>{" "}
            dell&apos;Autovalutazione, che è condivisa fra i due percorsi.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight">Le cinque fasi</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;avanzamento di ciascuna viene dai controlli dei suoi capi: non si dichiara, si
            misura. Lo <b>stato</b> invece è una decisione tua.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {r.fasi.map((f) => (
            <RigaFase key={f.key} companyId={companyId} f={f} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RigaFase({ companyId, f }: { companyId: string; f: Fase }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const [stato, setStato] = useState(f.stato?.stato ?? "non_avviata");

  const salva = (input: Parameters<typeof setCampoFaseAction>[1], ripristina: () => void) =>
    avvia(async () => {
      const esito = await setCampoFaseAction(companyId, input);
      if (!esito.ok) {
        ripristina();
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });

  const pct = f.avanzamento.percentuale;

  return (
    <div className="rounded-md border p-3" data-fase={f.key}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{f.nome}</p>
          <p className="text-[13px] text-muted-foreground">{f.descrizione}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            capi {f.capitoli.join(" · ")} · {f.avanzamento.applicabili} controlli applicabili
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="w-28">
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: COLORE_LIVELLO[Math.min(4, Math.round(pct / 25))] }}
              />
            </div>
            <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{pct}%</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`fs-${f.key}`}>Stato</Label>
          <Select
            value={stato}
            onValueChange={(v) => {
              const prima = stato;
              setStato(v as typeof stato);
              salva({ phaseKey: f.key, campo: "stato", valore: v as "in_corso" }, () => setStato(prima));
            }}
          >
            <SelectTrigger id={`fs-${f.key}`} aria-label={`Stato della fase ${f.nome}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATI_FASE.map((s) => (
                <SelectItem key={s.v} value={s.v}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`fr-${f.key}`}>Responsabile</Label>
          <Input
            id={`fr-${f.key}`}
            defaultValue={f.stato?.responsabile ?? ""}
            aria-label={`Responsabile della fase ${f.nome}`}
            onBlur={(e) =>
              e.target.value !== (f.stato?.responsabile ?? "") &&
              salva({ phaseKey: f.key, campo: "responsabile", valore: e.target.value || null }, () => {})
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`fd-${f.key}`}>Scadenza</Label>
          <Input
            id={`fd-${f.key}`}
            type="date"
            defaultValue={f.stato?.scadenza ?? ""}
            aria-label={`Scadenza della fase ${f.nome}`}
            onBlur={(e) =>
              e.target.value !== (f.stato?.scadenza ?? "") &&
              salva({ phaseKey: f.key, campo: "scadenza", valore: e.target.value }, () => {})
            }
          />
        </div>
      </div>
    </div>
  );
}
