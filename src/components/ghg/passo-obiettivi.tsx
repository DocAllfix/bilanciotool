"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTargetAction, deleteTargetAction, setBaseYearAction, updateBoundariesAction } from "@/features/ghg/actions";
import { fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Inventario, InventarioBreve, StatoWizard } from "./types";
import { BottoneElimina } from "@/components/comune/bottone-elimina";

// Passo 6 — Anno base e obiettivi di riduzione. L'anno base è il metro di ogni
// confronto: si sceglie, si motiva e si fissa in anticipo la regola di ricalcolo.

const AMBITI = [
  { v: "12", label: "Categorie 1 e 2" },
  { v: "1", label: "Categoria 1" },
  { v: "2", label: "Categoria 2" },
  { v: "3", label: "Categorie 3-6" },
  { v: "tot", label: "Totale" },
] as const;

export function PassoObiettivi({
  companyId, inventario, inventari, stato,
}: {
  companyId: string;
  inventario: Inventario;
  inventari: InventarioBreve[];
  stato: StatoWizard;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const b = inventario.boundaries;
  const r = stato.risultati;

  async function aggiungi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const f = new FormData(e.currentTarget);
    const esito = await addTargetAction({
      companyId,
      nome: String(f.get("nome") || "Obiettivo di riduzione"),
      ambito: String(f.get("ambito")) as "1" | "2" | "12" | "3" | "tot",
      riduzionePct: String(f.get("riduzione") || "30"),
      annoTarget: Number(f.get("anno")) || inventario.annoBase + 5,
      note: String(f.get("note") || ""),
    });
    if (!esito.ok) return setErrore(esito.errore);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Anno base</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Periodo di riferimento</Label>
            <Select
              defaultValue={String(inventario.annoBase)}
              onValueChange={async (v) => {
                const esito = await setBaseYearAction(companyId, inventario.id, Number(v));
                if (!esito.ok) setErrore(esito.errore);
                router.refresh();
              }}
            >
              <SelectTrigger data-slot="kpi" aria-label="Periodo di riferimento"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([inventario.annoBase, ...inventari.map((i) => i.anno)])].sort().map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-motivo">Motivazione della scelta</Label>
            <Textarea
              id="ob-motivo"
              defaultValue={b.motivoBase ?? ""}
              placeholder="Primo anno con dati completi e verificabili su tutti i siti del perimetro."
              onBlur={(e) => { if (e.target.value !== (b.motivoBase ?? "")) updateBoundariesAction(companyId, inventario.id, { motivoBase: e.target.value }).then(() => router.refresh()); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-regola">Regola di ricalcolo</Label>
            <Textarea
              id="ob-regola"
              defaultValue={b.regolaRicalcolo ?? ""}
              placeholder="Ricalcolo dell'anno base per variazioni strutturali che modificano il totale di categoria 1 e 2 di oltre il 5%."
              onBlur={(e) => { if (e.target.value !== (b.regolaRicalcolo ?? "")) updateBoundariesAction(companyId, inventario.id, { regolaRicalcolo: e.target.value }).then(() => router.refresh()); }}
            />
            <p className="text-xs text-muted-foreground">Casi tipici: acquisizioni e cessioni, cambio del metodo, correzione di errori significativi.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Nuovo obiettivo di riduzione</h2></CardHeader>
        <CardContent>
          <form onSubmit={aggiungi} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ob-nome">Descrizione</Label>
              <Input id="ob-nome" name="nome" placeholder="Riduzione delle emissioni dirette e da energia importata" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ambito</Label>
                <Select name="ambito" defaultValue="12">
                  <SelectTrigger aria-label="Ambito dell'obiettivo"><SelectValue /></SelectTrigger>
                  <SelectContent>{AMBITI.map((a) => <SelectItem key={a.v} value={a.v}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-rid">Riduzione %</Label>
                <Input id="ob-rid" name="riduzione" data-slot="kpi" placeholder="30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-anno">Anno traguardo</Label>
                <Input id="ob-anno" name="anno" data-slot="kpi" type="number" placeholder={String(inventario.annoBase + 5)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-note">Azioni previste</Label>
              <Input id="ob-note" name="note" placeholder="Fotovoltaico da 200 kWp, sostituzione flotta diesel, contratto con GO" />
            </div>
            {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
            <Button type="submit">Aggiungi obiettivo</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        {r.obiettivi.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nessun obiettivo definito.</CardContent></Card>
        ) : (
          r.obiettivi.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {AMBITI.find((a) => a.v === o.ambito)?.label} · −{fmtNum(o.riduzionePct, 0)}% al {o.annoTarget} sul {r.annoBase}
                      {o.note ? ` · ${o.note}` : ""}
                    </p>
                  </div>
                  <BottoneElimina
                    etichetta="Elimina obiettivo"
                    titolo="Eliminare questo obiettivo?"
                    descrizione={`«${o.nome}» sparisce dal percorso di riduzione. I documenti già pubblicati non cambiano.`}
                    onConferma={async () => { await deleteTargetAction(companyId, o.id); router.refresh(); }}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Anno base</dt><dd className="text-lg font-semibold" data-slot="kpi">{o.base ? fmtNum(o.base, 1) : "—"}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Periodo {r.anno}</dt><dd className="text-lg font-semibold" data-slot="kpi">{fmtNum(o.attuale, 1)}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Traguardo {o.annoTarget}</dt><dd className="text-lg font-semibold" data-slot="kpi">{o.traguardo ? fmtNum(o.traguardo, 1) : "—"}</dd></div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Percorso compiuto</dt>
                    <dd className="text-lg font-semibold" data-slot="kpi">{o.percorsoPct ? `${fmtNum(o.percorsoPct, 0)}%` : "—"}</dd>
                    {o.percorsoPct && <Progress className="mt-1.5" value={Number(o.percorsoPct)} />}
                  </div>
                </dl>
                {!o.base && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Il percorso si calcola quando esiste un inventario per l&apos;anno base {r.annoBase} con dati inseriti.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
