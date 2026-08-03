"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setSogliaAction } from "@/features/supplier/actions";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, RefreshCw } from "lucide-react";
import { COLORE_FASCIA, type PropsVista } from "./types";

// Vista 1 — Quadro di sintesi. La sola domanda che conta per chi legge:
// siamo sopra o sotto la soglia che il committente ha chiesto, e cosa serve
// per arrivarci.

export function VistaQuadro({
  companyId, valutazione, catalogo, stato, esito, vai,
}: PropsVista & { vai: (v: string) => void }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [soglia, setSoglia] = useState(valutazione.sogliaRichiesta);

  const scarto = esito.indice - soglia;
  const primi = stato.piano.slice(0, 3);
  const recuperoPrimi = Number(primi.reduce((s, v) => s + v.punti, 0).toFixed(1));

  async function cambiaSoglia(valore: string) {
    const n = Number(valore);
    if (!Number.isInteger(n) || n < 0 || n > 100) return;
    setSoglia(n);
    setErrore(null);
    const esitoAzione = await setSogliaAction(companyId, valutazione.id, n);
    if (!esitoAzione.ok) return setErrore(esitoAzione.errore);
    router.refresh();
  }

  async function ricalcola() {
    setInCorso(true);
    await ricalcolaAction(companyId);
    router.refresh();
    setInCorso(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Questionario compilato al {esito.pctCompletamento}% ({esito.valutate} domande su {catalogo.domande.length}).
          {valutazione.profilo.committente ? ` Richiesta di ${valutazione.profilo.committente}.` : ""}
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
            <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Indice di prontezza</h2>
          <Badge style={{ background: COLORE_FASCIA[esito.fascia.key], color: "white" }}>
            {esito.fascia.nome}
          </Badge>
        </CardHeader>
        <CardContent>
          {/* Barra con la tacca della soglia: il numero da solo non dice se
              basta, la distanza dalla tacca sì. */}
          <div className="relative mt-8 h-9 rounded-md border bg-muted/50">
            <div
              className="absolute inset-y-0 left-0 rounded-l-md transition-[width] duration-500"
              style={{ width: `${esito.indice}%`, background: COLORE_FASCIA[esito.fascia.key] }}
            />
            <span
              className="absolute top-1/2 -translate-y-1/2 text-sm font-semibold tabular-nums"
              style={{ left: `calc(${Math.min(esito.indice, 92)}% + 10px)`, color: esito.indice > 8 ? "var(--foreground)" : undefined }}
              data-slot="kpi"
            >
              {esito.indice}
            </span>
            <div
              className="absolute -top-1 bottom-[-4px] w-0.5 bg-foreground"
              style={{ left: `${soglia}%` }}
              aria-hidden
            />
            <span
              className="absolute -top-7 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
              style={{ left: `${soglia}%` }}
            >
              soglia richiesta {soglia}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>0 · non pronto</span>
            <span>60 · adeguato</span>
            <span>100</span>
          </div>

          <p className="mt-5 text-sm">
            {scarto >= 0 ? (
              <>
                Sei <strong>{scarto} punti sopra</strong> la soglia.
                {stato.piano.length > 0 && ` Restano ${stato.piano.length} azioni per consolidare il margine.`}
              </>
            ) : (
              <>
                Ti mancano <strong>{Math.abs(scarto)} punti</strong> per raggiungere la soglia.
                {primi.length > 0 && ` Le prime ${primi.length} azioni del piano ne recuperano ${fmtNum(recuperoPrimi, 1)}.`}
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
            <div>
              <Label htmlFor="sr-soglia">Soglia richiesta dal committente</Label>
              <Input
                id="sr-soglia"
                type="number"
                min={0}
                max={100}
                defaultValue={valutazione.sogliaRichiesta}
                className="mt-1.5 w-28"
                data-slot="kpi"
                aria-label="Soglia richiesta dal committente"
                onBlur={(e) => { if (Number(e.target.value) !== soglia) cambiaSoglia(e.target.value); }}
              />
            </div>
            <p className="max-w-md pb-2 text-xs text-muted-foreground">
              Cambia da bando a bando: l&apos;attestato la dichiara insieme al punteggio, così chi legge sa
              rispetto a cosa è misurato.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold tracking-tight">Punteggio per area</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            {catalogo.aree.map((a) => {
              const p = esito.perArea[a.key];
              const valore = p?.punteggio ?? 0;
              return (
                <div key={a.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      {a.nome} <span className="text-xs text-muted-foreground">· peso {a.peso}%</span>
                    </span>
                    <strong data-slot="kpi">
                      {p?.punteggio === null ? <span className="font-normal text-muted-foreground">non valutata</span> : valore}
                    </strong>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${valore}%`, background: a.colore.startsWith("var(") ? "var(--primary)" : a.colore }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p?.risposte ?? 0} risposte su {p?.totale ?? 0}
                    {p && p.valutate > p.risposte ? ` · ${p.valutate - p.risposte} non applicabili` : ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Da fare per prime</h2>
              <p className="text-sm text-muted-foreground">Punti guadagnati per giornata di lavoro</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => vai("piano")}>
              Piano <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {stato.piano.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessuna lacuna dichiarata. Le domande ancora senza risposta non compaiono qui: non sono una
                mancanza accertata, sono questionario da leggere.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {stato.piano.slice(0, 5).map((v) => (
                  <li key={v.key} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" data-slot="kpi" className="mt-0.5 shrink-0">{v.key}</Badge>
                    <span className="min-w-0 flex-1">{v.azione}</span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground" data-slot="kpi">
                      +{fmtNum(v.punti, 1)} pt<br />{v.giorni} gg
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-accent/40 px-5 py-4 sm:grid-cols-4">
        {([
          ["Domande valutate", `${esito.valutate}`, `su ${catalogo.domande.length}`],
          ["Lacune dichiarate", `${stato.piano.length}`, "da colmare"],
          ["Punti recuperabili", fmtNum(esito.puntiRecuperabili, 1), "sull'indice"],
          ["Impegno stimato", `${esito.giornateStimate}`, "giornate"],
        ] as const).map(([label, valore, um]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
              {valore} <span className="text-xs font-normal text-muted-foreground">{um}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
