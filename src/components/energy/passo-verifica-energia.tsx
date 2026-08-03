"use client";

import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import type { PropsPasso } from "./types";

// Passo 7 — Verifica. Ogni lacuna porta al passo che la colma: una lista di
// problemi senza il modo di risolverli è solo un rimprovero.

type Controllo = {
  id: string;
  esito: "ok" | "attenzione" | "mancante";
  titolo: string;
  dettaglio: string;
  passo: number;
};

export function PassoVerificaEnergia({
  bilancio, catalogo, stato, risultati, vai,
}: PropsPasso & { vai: (n: number) => void }) {
  const a = stato.avanzamento;
  const usiAttivi = catalogo.usi.filter((u) => u.attivo);
  const senzaMetodo = usiAttivi.filter((u) => u.metodo === null);
  const nonQuadrati = risultati.quadratura.perVettore.filter((q) => q.attivo && !q.ok);
  const capitoliVuoti = catalogo.capitoli.filter(
    (c) => (stato.capitoli.find((x) => x.templateKey === c.key)?.parole ?? 0) < 20,
  );
  const senzaCosto = stato.inputs.filter((i) => i.quantita && !i.costo);
  const driverVuoti = catalogo.driver.filter(
    (d) => !(stato.driver.corrente[d.key as keyof typeof stato.driver.corrente] ?? "").trim(),
  );
  const interventiQuantificati = risultati.misure.totali.quantificate;

  const controlli: Controllo[] = [
    {
      id: "profilo",
      esito: a.s1 >= 0.999 ? "ok" : a.s1 > 0 ? "attenzione" : "mancante",
      titolo: "Sito e perimetro descritti",
      dettaglio:
        a.s1 >= 0.999
          ? "Anagrafica e perimetro completi."
          : "Alcuni campi del passo 1 sono vuoti: senza perimetro dichiarato la diagnosi è contestabile.",
      passo: 1,
    },
    {
      id: "vettori",
      esito: stato.inputs.length === 0 ? "mancante" : senzaCosto.length ? "attenzione" : "ok",
      titolo: "Consumi e spesa energetica",
      dettaglio:
        stato.inputs.length === 0
          ? "Nessun vettore valorizzato."
          : senzaCosto.length
            ? `${senzaCosto.length} vettori senza spesa: il costo medio e il ritorno degli interventi restano incompleti.`
            : `${stato.inputs.length} vettori con quantità e costo, ${fmtNum(risultati.totali.kwh, 0)} kWh complessivi.`,
      passo: 2,
    },
    {
      id: "quadratura",
      esito: risultati.quadratura.valutati === 0 ? "mancante" : nonQuadrati.length ? "attenzione" : "ok",
      titolo: "Quadratura della ripartizione",
      dettaglio:
        risultati.quadratura.valutati === 0
          ? "Nessuna attribuzione agli usi finali."
          : nonQuadrati.length
            ? `Non quadrano: ${nonQuadrati.map((q) => q.key).join(", ")}. Un residuo positivo significa un'utenza non ancora considerata, uno negativo che la stessa energia è contata due volte.`
            : `Tutti i ${risultati.quadratura.valutati} vettori chiudono entro il 2%, copertura ${fmtNum(risultati.ripartizione.coperturaPct, 1)}%.`,
      passo: 3,
    },
    {
      id: "metodo",
      esito: usiAttivi.length === 0 ? "mancante" : senzaMetodo.length ? "attenzione" : "ok",
      titolo: "Metodo di determinazione dichiarato",
      dettaglio:
        senzaMetodo.length === 0 && usiAttivi.length > 0
          ? "Ogni uso finale dichiara se il dato è misurato, calcolato o stimato."
          : `${senzaMetodo.length} usi finali su ${usiAttivi.length} non dichiarano come è stato ottenuto il dato.`,
      passo: 3,
    },
    {
      id: "indicatori",
      esito: driverVuoti.length === catalogo.driver.length ? "mancante" : driverVuoti.length ? "attenzione" : "ok",
      titolo: "Variabili di riferimento",
      dettaglio: driverVuoti.length
        ? `Mancano ${driverVuoti.length} variabili su ${catalogo.driver.length}: gli indicatori che le usano non si calcolano.`
        : "Tutte le variabili valorizzate.",
      passo: 4,
    },
    {
      id: "confronto",
      esito: risultati.confronto.length ? "ok" : "attenzione",
      titolo: `Confronto con il ${bilancio.annoBase}`,
      dettaglio: risultati.confronto.length
        ? `${risultati.confronto.length} indicatori confrontabili con l'anno di riferimento.`
        : `Nessun confronto disponibile: serve un bilancio energetico anche per il ${bilancio.annoBase}, con le stesse variabili valorizzate.`,
      passo: 4,
    },
    {
      id: "interventi",
      esito: interventiQuantificati >= 3 ? "ok" : interventiQuantificati > 0 ? "attenzione" : "mancante",
      titolo: "Programma di miglioramento",
      dettaglio:
        interventiQuantificati === 0
          ? "Nessun intervento quantificato: una diagnosi che si ferma alla fotografia non serve a nessuno."
          : `${interventiQuantificati} interventi quantificati, ${fmtNum(risultati.misure.totali.pctSulTotale, 1)}% del consumo del sito.`,
      passo: 5,
    },
    {
      id: "racconto",
      esito: capitoliVuoti.length === 0 ? "ok" : capitoliVuoti.length < catalogo.capitoli.length ? "attenzione" : "mancante",
      titolo: "Lettura dei dati",
      dettaglio: capitoliVuoti.length
        ? `Da scrivere: ${capitoliVuoti.map((c) => c.nome).join(", ")}.`
        : "Tutti i capitoli scritti.",
      passo: 6,
    },
  ];

  const ok = controlli.filter((c) => c.esito === "ok").length;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Pronto a pubblicare</h2>
              <p className="text-sm text-muted-foreground">
                {ok} controlli su {controlli.length} superati. Puoi pubblicare comunque: il documento dirà quello che c&apos;è.
              </p>
            </div>
            <p className="text-3xl font-semibold tracking-tight" data-slot="kpi">{a.totPct}%</p>
          </div>
          <Progress value={a.totPct} className="mt-3" />
        </CardHeader>
      </Card>

      <ul className="grid gap-2">
        {controlli.map((c) => (
          <li key={c.id}>
            <Card className={cn("py-0", c.esito === "mancante" && "border-destructive/40")}>
              <CardContent className="flex items-start gap-3 py-4">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    c.esito === "ok" ? "bg-success text-white" : c.esito === "attenzione" ? "bg-warning text-white" : "border border-destructive text-destructive",
                  )}
                  aria-hidden
                >
                  {c.esito === "ok" ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.titolo}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.dettaglio}</p>
                </div>
                {c.esito !== "ok" && (
                  <Button variant="outline" size="sm" onClick={() => vai(c.passo)} className="shrink-0">
                    Passo {c.passo} <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
