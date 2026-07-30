"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAtecoSuggestionsAction, setSogliaAction, setTopicScoreFieldAction } from "@/features/report/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HelpCircle, Wand2 } from "lucide-react";
import {
  CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CatalogoReport, ProgettoReport, StatoReport } from "./types";

// Passo 2 — Doppia materialità: matrice interattiva, guide consulenziali per
// tema, soglia regolabile, suggerimenti ATECO rule-based (proposta, mai automatica).

const PILLAR = {
  E: { nome: "Ambiente", colore: "var(--esg-e)" },
  S: { nome: "Sociale", colore: "var(--esg-s)" },
  G: { nome: "Governance", colore: "var(--esg-g)" },
} as const;

export function PassoMaterialita({
  companyId, progetto, catalogo, stato,
}: {
  companyId: string;
  progetto: ProgettoReport;
  catalogo: CatalogoReport;
  stato: StatoReport;
}) {
  const router = useRouter();
  const [guidaAperta, setGuidaAperta] = useState<string | null>(null);
  const [suggerimenti, setSuggerimenti] = useState<Record<string, { imp: number; fin: number }> | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const m = stato.materialita;

  // Punti della matrice con jitter deterministico per i temi sovrapposti.
  const conteggioPosizione = new Map<string, number>();
  const punti = catalogo.temi
    .map((t) => {
      const s = m.perTopic[t.key];
      if (!s?.valutato) return null;
      const chiave = `${s.fin ?? 1}:${s.imp}`;
      const n = conteggioPosizione.get(chiave) ?? 0;
      conteggioPosizione.set(chiave, n + 1);
      const jitter = n * 0.13;
      return {
        key: t.key,
        nome: t.nome,
        x: (s.fin ?? 1) + jitter,
        y: (s.imp ?? 1) + (n % 2 === 1 ? jitter : 0),
        materiale: s.materiale,
        fill: PILLAR[t.pillar].colore,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  async function imposta(topicKey: string, campo: "imp" | "fin", valore: number | null) {
    setErrore(null);
    // Un solo campo per chiamata: il merge lo fa il server sul dato ATTUALE del
    // DB, mai sullo stato del client (che può essere stantio).
    const esito = await setTopicScoreFieldAction(companyId, progetto.id, { topicKey, campo, valore });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function proponiDaAteco() {
    setErrore(null);
    const ateco = progetto.profilo.ateco;
    if (!ateco) return setErrore("Compila il codice ATECO al passo 1 per avere una proposta di partenza.");
    const esito = await getAtecoSuggestionsAction(ateco);
    if (!esito.ok) return setErrore(esito.errore);
    if (!esito.dati) return setErrore("Nessuna proposta curata per questo settore: valuta i temi con le guide.");
    setSuggerimenti(esito.dati.punteggi);
  }

  const selettore = (t: string, campo: "imp" | "fin", valore: number | null) => (
    <Select value={valore === null ? "-" : String(valore)} onValueChange={(v) => imposta(t, campo, v === "-" ? null : Number(v))}>
      <SelectTrigger className="w-16" data-slot="kpi" aria-label={`${campo === "imp" ? "Impatto" : "Finanziaria"} ${t}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="-">—</SelectItem>
        {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Matrice di doppia rilevanza</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Soglia</span>
                <Select
                  value={String(progetto.soglia)}
                  onValueChange={async (v) => {
                    const esito = await setSogliaAction(companyId, progetto.id, Number(v));
                    if (!esito.ok) setErrore(esito.errore);
                    router.refresh();
                  }}
                >
                  <SelectTrigger className="w-20" data-slot="kpi" aria-label="Soglia di materialità"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["2", "3", "3.5", "4"].map((v) => <SelectItem key={v} value={v}>≥ {v.replace(".", ",")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -12 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} fontSize={11}
                    label={{ value: "rilevanza finanziaria →", position: "insideBottom", offset: -4, fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} fontSize={11}
                    label={{ value: "rilevanza d'impatto →", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <ReferenceLine x={progetto.soglia} stroke="var(--primary)" strokeDasharray="5 4" />
                  <ReferenceLine y={progetto.soglia} stroke="var(--primary)" strokeDasharray="5 4" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      const p = payload?.[0]?.payload as (typeof punti)[number] | undefined;
                      if (!p) return null;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">{p.key} · {p.nome}</p>
                          <p className="text-muted-foreground">{p.materiale ? "materiale" : "sotto soglia"}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={punti} isAnimationActive={false}>
                    {punti.map((p) => (
                      <Cell key={p.key} fill={p.fill} opacity={p.materiale ? 0.95 : 0.35} r={p.materiale ? 9 : 6} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {Object.entries(PILLAR).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: v.colore }} aria-hidden /> {v.nome}
                </span>
              ))}
              <span className="ml-auto" data-slot="kpi">{m.materialKeys.length} materiali · {m.assessedCount}/{catalogo.temi.length} valutati</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Come valutare</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Un tema è materiale se supera la soglia su ALMENO una delle due dimensioni. Valuta la situazione reale, non quella desiderata: un punteggio alto non è un giudizio negativo, indica solo che il tema va rendicontato.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={proponiDaAteco} data-tour="proposta-ateco">
                <Wand2 className="size-3.5" /> Proposta dal settore
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {suggerimenti && (
              <div className="mb-3 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm">
                <p className="font-medium text-accent-foreground">Proposta indicativa per il tuo settore (da confermare tema per tema):</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  I valori suggeriti compaiono accanto ai temi evidenziati qui sotto. Applicali solo se rispecchiano la realtà dell&apos;azienda.
                </p>
              </div>
            )}
            {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}
            <p className="text-xs text-muted-foreground">
              Il pulsante <HelpCircle className="inline size-3.5" /> accanto a ogni tema apre la guida con i criteri specifici: cosa guardare, quando alzare il punteggio, dove trovare le evidenze.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 py-0">
        <CardContent className="divide-y px-0">
          {catalogo.temi.map((t) => {
            const s = m.perTopic[t.key] ?? { imp: null, fin: null, materiale: false, valutato: false };
            const sug = suggerimenti?.[t.key];
            const aperta = guidaAperta === t.key;
            return (
              <div key={t.key} className="px-5 py-3">
                <div className="grid items-center gap-3 sm:grid-cols-[auto_1fr_auto_auto_auto]">
                  <Button
                    variant={aperta ? "default" : "ghost"}
                    size="icon"
                    aria-label={`Guida ${t.nome}`}
                    onClick={() => setGuidaAperta(aperta ? null : t.key)}
                  >
                    <HelpCircle className="size-4" />
                  </Button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.key} · {t.riferimenti} · <span style={{ color: PILLAR[t.pillar].colore }}>{PILLAR[t.pillar].nome}</span>
                      {sug && (
                        <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-accent-foreground">
                          proposta: imp {sug.imp} · fin {sug.fin}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase text-muted-foreground">Imp.</span>
                    {selettore(t.key, "imp", s.imp)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase text-muted-foreground">Fin.</span>
                    {selettore(t.key, "fin", s.fin)}
                  </div>
                  <div className="w-24 text-right">
                    {s.valutato ? (
                      <Badge variant={s.materiale ? "default" : "secondary"}>{s.materiale ? "materiale" : "escluso"}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">da valutare</span>
                    )}
                  </div>
                </div>
                {aperta && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium">{t.guida.def}</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impatto — cosa guardare</p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs">{t.guida.imp.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Finanziaria — cosa guardare</p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs">{t.guida.fin.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    </div>
                    <p className={cn("mt-3 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-xs")}>{t.guida.alto}</p>
                    <p className="mt-2 text-xs text-muted-foreground"><b>Dove trovare le informazioni:</b> {t.guida.ev}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
