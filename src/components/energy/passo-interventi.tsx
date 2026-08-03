"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMeasureAction, deleteMeasureAction, ricalcolaAction, updateMeasureAction } from "@/features/energy/actions";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import type { InterventoEnergia, PropsPasso } from "./types";

// Passo 5 — Programma di miglioramento. Il valore economico e il tempo di
// ritorno NON si inseriscono: si calcolano dal costo unitario del vettore
// ricavato al passo 2, quindi non possono essere ottimistici per distrazione.

const STATI: { id: InterventoEnergia["stato"]; nome: string }[] = [
  { id: "proposto", nome: "Proposto" },
  { id: "valutato", nome: "Valutato" },
  { id: "approvato", nome: "Approvato" },
  { id: "in_corso", nome: "In corso" },
  { id: "realizzato", nome: "Realizzato" },
  { id: "scartato", nome: "Scartato" },
];

export function PassoInterventi({ companyId, bilancio, catalogo, stato, risultati }: PropsPasso) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const vettori = catalogo.vettori.filter((v) => !v.sub);
  const usiAttivi = catalogo.usi.filter((u) => u.attivo);

  // Le tendine rispondono subito: senza, scegliere un vettore non cambierebbe
  // l'unita' di misura mostrata accanto al risparmio fino al ricalcolo, e il
  // consulente scriverebbe litri dove il sistema si aspetta metri cubi.
  const [vettoreLocale, setVettoreLocale] = useState<Record<string, string>>({});
  const [statoLocale, setStatoLocale] = useState<Record<string, InterventoEnergia["stato"]>>({});

  async function aggiungi() {
    setErrore(null);
    setInCorso(true);
    const esito = await addMeasureAction(companyId, bilancio.anno, bilancio.id, {
      descrizione: "",
      vettoreKey: vettori[0]?.key ?? "ele",
    });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function aggiorna(id: string, patch: Parameters<typeof updateMeasureAction>[1]) {
    setErrore(null);
    const esito = await updateMeasureAction(id, patch);
    if (!esito.ok) setErrore(esito.errore);
  }

  async function elimina(id: string) {
    setErrore(null);
    const esito = await deleteMeasureAction(companyId, bilancio.anno, id);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function ricalcola() {
    setInCorso(true);
    await ricalcolaAction(companyId, bilancio.anno);
    router.refresh();
    setInCorso(false);
  }

  const t = risultati.misure.totali;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Indica il risparmio annuo atteso <strong className="text-foreground">nell&apos;unità del vettore</strong> e la
          spesa prevista. Il risparmio economico e il tempo di ritorno li calcola il sistema, dal costo dell&apos;energia
          che hai già inserito.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
            <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
          </Button>
          <Button size="sm" onClick={aggiungi} disabled={inCorso}>
            <Plus className="size-3.5" /> Aggiungi intervento
          </Button>
        </div>
      </div>

      {stato.misure.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun intervento. Una diagnosi che si ferma alla fotografia non serve a nessuno:
              tre proposte quantificate sono il minimo per rendere utile il documento.
            </p>
            <Button className="mt-4" onClick={aggiungi} disabled={inCorso}>
              <Plus className="size-4" /> Aggiungi il primo intervento
            </Button>
          </CardContent>
        </Card>
      ) : (
        stato.misure.map((m, i) => {
          const calc = risultati.misure.righe[i];
          const vettore = vettori.find((v) => v.key === (vettoreLocale[m.id] ?? m.vettoreKey));
          return (
            <Card key={m.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`int-d-${m.id}`} className="sr-only">Descrizione dell&apos;intervento</Label>
                  <Textarea
                    id={`int-d-${m.id}`}
                    rows={2}
                    defaultValue={m.descrizione}
                    placeholder="Sostituzione dei bruciatori del forno di mantenimento con modelli modulanti"
                    aria-label="Descrizione dell'intervento"
                    onBlur={(e) => { if (e.target.value !== m.descrizione) aggiorna(m.id, { descrizione: e.target.value }); }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{STATI.find((s) => s.id === (statoLocale[m.id] ?? m.stato))?.nome}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => elimina(m.id)} aria-label="Elimina l'intervento">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <Label htmlFor={`int-v-${m.id}`}>Vettore risparmiato</Label>
                    <Select
                      value={vettoreLocale[m.id] ?? m.vettoreKey}
                      onValueChange={(v) => { setVettoreLocale((s2) => ({ ...s2, [m.id]: v })); aggiorna(m.id, { vettoreKey: v }); }}
                    >
                      <SelectTrigger id={`int-v-${m.id}`} className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vettori.map((v) => <SelectItem key={v.key} value={v.key}>{v.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`int-q-${m.id}`}>Risparmio {vettore ? `(${vettore.um})` : ""}</Label>
                    <Input
                      id={`int-q-${m.id}`}
                      className="mt-1.5 text-right"
                      data-slot="kpi"
                      defaultValue={m.quantita ?? ""}
                      onBlur={(e) => { if (e.target.value !== (m.quantita ?? "")) aggiorna(m.id, { quantita: e.target.value }); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`int-i-${m.id}`}>Investimento €</Label>
                    <Input
                      id={`int-i-${m.id}`}
                      className="mt-1.5 text-right"
                      data-slot="kpi"
                      defaultValue={m.investimento ?? ""}
                      onBlur={(e) => { if (e.target.value !== (m.investimento ?? "")) aggiorna(m.id, { investimento: e.target.value }); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`int-c-${m.id}`}>Incentivo €</Label>
                    <Input
                      id={`int-c-${m.id}`}
                      className="mt-1.5 text-right"
                      data-slot="kpi"
                      defaultValue={m.incentivo ?? ""}
                      onBlur={(e) => { if (e.target.value !== (m.incentivo ?? "")) aggiorna(m.id, { incentivo: e.target.value }); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`int-u-${m.id}`}>Uso interessato</Label>
                    <Select defaultValue={m.usoKey ?? ""} onValueChange={(v) => aggiorna(m.id, { usoKey: v || null })}>
                      <SelectTrigger id={`int-u-${m.id}`} className="mt-1.5 w-full"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {usiAttivi.map((u) => <SelectItem key={u.key} value={u.key}>{u.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`int-s-${m.id}`}>Stato</Label>
                    <Select
                      value={statoLocale[m.id] ?? m.stato}
                      onValueChange={(v) => {
                        setStatoLocale((s2) => ({ ...s2, [m.id]: v as InterventoEnergia["stato"] }));
                        aggiorna(m.id, { stato: v as InterventoEnergia["stato"] });
                      }}
                    >
                      <SelectTrigger id={`int-s-${m.id}`} className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATI.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {calc && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-3 sm:grid-cols-5">
                    <Voce label="Energia risparmiata" valore={fmtNum(calc.kwh, 0)} um="kWh" />
                    <Voce label="Emissioni evitate" valore={fmtNum(calc.co2, 2)} um="tCO₂e" />
                    <Voce label="Risparmio annuo" valore={fmtNum(calc.risparmioEuro, 0)} um="€" />
                    <Voce label="Spesa netta" valore={fmtNum(calc.netto, 0)} um="€" />
                    <Voce
                      label="Tempo di ritorno"
                      valore={calc.pbtAnni === null ? "—" : fmtNum(calc.pbtAnni, 1)}
                      um={calc.pbtAnni === null ? "senza risparmio" : "anni"}
                    />
                  </dl>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {stato.misure.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-accent/40 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
          <Voce label="Interventi quantificati" valore={String(t.quantificate)} um={`su ${stato.misure.length}`} grande />
          <Voce label="Energia risparmiabile" valore={fmtNum(t.kwh, 0)} um="kWh" grande />
          <Voce label="Sul consumo del sito" valore={fmtNum(t.pctSulTotale, 1)} um="%" grande />
          <Voce label="Risparmio annuo" valore={fmtNum(t.risparmioEuro, 0)} um="€" grande />
          <Voce label="Investimento netto" valore={fmtNum(t.netto, 0)} um="€" grande />
          <Voce label="Ritorno complessivo" valore={t.pbtAnni === null ? "—" : fmtNum(t.pbtAnni, 1)} um="anni" grande />
        </dl>
      )}
    </div>
  );
}

function Voce({ label, valore, um, grande }: { label: string; valore: string; um: string; grande?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold tracking-tight", grande ? "text-lg" : "text-sm")} data-slot="kpi">
        {valore} <span className="text-xs font-normal text-muted-foreground">{um}</span>
      </dd>
    </div>
  );
}
