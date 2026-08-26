"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addActivityRowAction, copyRowsAction, deleteActivityRowAction, duplicateActivityRowAction, updateActivityRowAction,
} from "@/features/ghg/actions";
import { computeRow, DQ_LEVELS, type DqLevel } from "@/lib/calc/ghg/row";
import { fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Pencil, Plus } from "lucide-react";
import type { Catalogo, Inventario, InventarioBreve, Riga, StatoWizard } from "./types";
import { BottoneElimina } from "@/components/comune/bottone-elimina";

// Passo 3 — Dati di attività: una riga per sorgente e sito.
// L'anteprima usa LE STESSE funzioni pure del server (src/lib/calc): mai
// reimplementazioni client che possano divergere.

type Bozza = {
  id?: string;
  categoryKey: string;
  sourceTypeKey: string;
  factorKey: string | null;
  sede: string;
  descrizione: string;
  um: string;
  quantita: string;
  fe: string;
  feMarket: string;
  quotaGo: string;
  feBiogenic: string;
  dq: DqLevel;
  incertezza: string;
  evidenza: string;
  note: string;
};

const vuota = (): Bozza => ({
  categoryKey: "1", sourceTypeKey: "1a", factorKey: "gas_smc", sede: "", descrizione: "",
  um: "Smc", quantita: "", fe: "1.9755", feMarket: "", quotaGo: "", feBiogenic: "", dq: "F",
  incertezza: "", evidenza: "", note: "",
});

export function PassoDati({
  companyId, inventario, inventari, catalogo, stato,
}: {
  companyId: string;
  inventario: Inventario;
  inventari: InventarioBreve[];
  catalogo: Catalogo;
  stato: StatoWizard;
}) {
  const router = useRouter();
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [filtroCat, setFiltroCat] = useState<string>("tutte");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const precedente = inventari.find((i) => i.anno < inventario.anno);
  const righe = useMemo(
    () =>
      stato.righe
        .filter((r) => filtroCat === "tutte" || r.categoryKey === filtroCat)
        .map((r) => ({ r, calc: computeRow({ categoryKey: r.categoryKey, quantita: r.quantita, fe: r.fe, feMarket: r.feMarket, quotaGo: r.quotaGo, feBiogenic: r.feBiogenic, dq: r.dq, incertezza: r.incertezza }) }))
        .sort((a, b) => (a.r.categoryKey === b.r.categoryKey ? b.calc.t.comparedTo(a.calc.t) : a.r.categoryKey.localeCompare(b.r.categoryKey))),
    [stato.righe, filtroCat],
  );

  const apriModifica = (r: Riga) =>
    setBozza({
      id: r.id, categoryKey: r.categoryKey, sourceTypeKey: r.sourceTypeKey, factorKey: r.factorKey,
      sede: r.sede ?? "", descrizione: r.descrizione ?? "", um: r.um, quantita: r.quantita, fe: r.fe,
      feMarket: r.feMarket ?? "", quotaGo: r.quotaGo ?? "", feBiogenic: r.feBiogenic ?? "",
      dq: r.dq, incertezza: r.incertezza ?? "", evidenza: r.evidenza ?? "", note: r.note ?? "",
    });

  const anteprima = bozza
    ? computeRow({ categoryKey: bozza.categoryKey, quantita: bozza.quantita, fe: bozza.fe, feMarket: bozza.feMarket || null, quotaGo: bozza.quotaGo || null, feBiogenic: bozza.feBiogenic || null, dq: bozza.dq, incertezza: bozza.incertezza || null })
    : null;

  function applicaFattore(key: string) {
    if (!bozza) return;
    if (key === "custom") return setBozza({ ...bozza, factorKey: null });
    const f = catalogo.fattori.find((x) => x.key === key);
    if (!f) return;
    setBozza({
      ...bozza,
      factorKey: key,
      um: f.um,
      fe: f.fe,
      feMarket: f.feMarket ?? "",
      feBiogenic: f.feBiogenic ?? "",
      descrizione: bozza.descrizione || f.nome,
    });
  }

  async function salva() {
    if (!bozza) return;
    setErrore(null);
    setInCorso(true);
    const payload = {
      sourceTypeKey: bozza.sourceTypeKey,
      categoryKey: bozza.categoryKey as "1" | "2" | "3" | "4" | "5" | "6",
      sede: bozza.sede, descrizione: bozza.descrizione, factorKey: bozza.factorKey,
      um: bozza.um, quantita: bozza.quantita, fe: bozza.fe,
      feMarket: bozza.feMarket || null, quotaGo: bozza.quotaGo || null, feBiogenic: bozza.feBiogenic || null,
      dq: bozza.dq, incertezza: bozza.incertezza || null, evidenza: bozza.evidenza, note: bozza.note,
    };
    const esito = bozza.id
      ? await updateActivityRowAction(companyId, bozza.id, payload)
      : await addActivityRowAction(companyId, inventario.id, payload);
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    setBozza(null);
    router.refresh();
  }

  const sorgentiCat = catalogo.sorgenti.filter((s) => s.categoryKey === bozza?.categoryKey);
  const fattoriCat = catalogo.fattori.filter((f) => f.categoryKey === bozza?.categoryKey);
  const gruppi = [...new Set(fattoriCat.map((f) => f.gruppo))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Il calcolo è quantità × fattore ÷ 1.000, in tonnellate di CO₂ equivalente. Indica sempre l&apos;evidenza documentale.
        </p>
        <div className="flex items-center gap-2">
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger className="w-44" aria-label="Filtro categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutte">Tutte le categorie</SelectItem>
              {catalogo.categorie.map((c) => <SelectItem key={c.key} value={c.key}>Categoria {c.key}</SelectItem>)}
            </SelectContent>
          </Select>
          {precedente && stato.righe.length === 0 && (
            <Button
              variant="outline"
              onClick={async () => {
                const esito = await copyRowsAction(companyId, precedente.id, inventario.id);
                if (!esito.ok) return setErrore(esito.errore);
                router.refresh();
              }}
            >
              <Copy className="size-4" /> Copia dal {precedente.anno}
            </Button>
          )}
          <Button onClick={() => setBozza(vuota())} data-tour="aggiungi-voce">
            <Plus className="size-4" /> Aggiungi voce
          </Button>
        </div>
      </div>
      {errore && !bozza && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}

      <Card className="py-0">
        <CardContent className="px-0">
          {righe.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nessuna voce per questo periodo. Aggiungine una{precedente ? ` o copiale dal ${precedente.anno}` : ""}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cat.</TableHead>
                  <TableHead>Voce</TableHead>
                  <TableHead className="text-right">Quantità</TableHead>
                  <TableHead className="text-right">FE</TableHead>
                  <TableHead className="text-right">tCO₂e</TableHead>
                  <TableHead>Qualità</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {righe.map(({ r, calc }) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.categoryKey}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{r.descrizione || "(senza descrizione)"}</p>
                      <p className="text-xs text-muted-foreground">
                        {catalogo.sorgenti.find((s) => s.key === r.sourceTypeKey)?.nome}
                        {r.sede ? ` · ${r.sede}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtNum(r.quantita, 2)} <span className="text-xs text-muted-foreground">{r.um}</span>
                    </TableCell>
                    <TableCell className="text-right">{fmtNum(r.fe, 4)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtNum(calc.t.toNumber(), 3)}
                      {r.categoryKey === "2" && (
                        <p className="text-xs font-normal text-muted-foreground">mkt {fmtNum(calc.tM.toNumber(), 3)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={calc.dqp >= 4 ? "default" : calc.dqp >= 3 ? "secondary" : "destructive"}>
                        {DQ_LEVELS[r.dq].nome}
                      </Badge>
                      <p className="mt-0.5 text-xs text-muted-foreground">± {fmtNum(calc.inc.toNumber(), 0)}%</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => apriModifica(r)}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Duplica" onClick={async () => { await duplicateActivityRowAction(companyId, r.id); router.refresh(); }}><Copy className="size-3.5" /></Button>
                        <BottoneElimina
                          etichetta="Elimina"
                          titolo="Eliminare questa voce?"
                          descrizione={`«${r.descrizione || "voce senza descrizione"}» esce dall'inventario, e i totali si ricalcolano. I documenti già pubblicati non cambiano.`}
                          onConferma={async () => { await deleteActivityRowAction(companyId, r.id); router.refresh(); }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!bozza} onOpenChange={(o) => !o && setBozza(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{bozza?.id ? "Modifica voce" : "Nuova voce"} · periodo {inventario.anno}</DialogTitle>
          </DialogHeader>
          {bozza && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Categoria ISO</Label>
                  <Select
                    value={bozza.categoryKey}
                    onValueChange={(v) => {
                      // Cambiando categoria NON si trascina il fattore precedente: si
                      // propone il primo della nuova categoria (o si azzera). Trascinarlo
                      // significherebbe calcolare, per dire, l'elettricità col fattore del gas.
                      const primaSorgente = catalogo.sorgenti.find((s) => s.categoryKey === v);
                      const primoFattore = catalogo.fattori.find((f) => f.categoryKey === v);
                      setBozza({
                        ...bozza,
                        categoryKey: v,
                        sourceTypeKey: primaSorgente?.key ?? "",
                        factorKey: primoFattore?.key ?? null,
                        um: primoFattore?.um ?? "",
                        fe: primoFattore?.fe ?? "",
                        feMarket: primoFattore?.feMarket ?? "",
                        feBiogenic: primoFattore?.feBiogenic ?? "",
                        quotaGo: "",
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {catalogo.categorie.map((c) => <SelectItem key={c.key} value={c.key}>Cat. {c.key} — {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sorgente</Label>
                  <Select value={bozza.sourceTypeKey} onValueChange={(v) => setBozza({ ...bozza, sourceTypeKey: v })}>
                    <SelectTrigger aria-label="Sorgente"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sorgentiCat.map((s) => <SelectItem key={s.key} value={s.key}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Fattore di emissione</Label>
                <Select value={bozza.factorKey ?? "custom"} onValueChange={applicaFattore}>
                  <SelectTrigger aria-label="Fattore di emissione"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {gruppi.map((g) => (
                      <div key={g}>
                        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{g}</p>
                        {fattoriCat.filter((f) => f.gruppo === g).map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.nome} — {fmtNum(f.fe, 4)} kg/{f.um}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    <SelectItem value="custom">Fattore personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-desc">Descrizione</Label>
                  <Input id="v-desc" value={bozza.descrizione} onChange={(e) => setBozza({ ...bozza, descrizione: e.target.value })} placeholder="Gas naturale — caldaia produzione" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-sede">Sito o unità</Label>
                  <Input id="v-sede" value={bozza.sede} onChange={(e) => setBozza({ ...bozza, sede: e.target.value })} placeholder="Stabilimento di Bari" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="v-q">Quantità *</Label>
                  <Input id="v-q" data-slot="kpi" value={bozza.quantita} onChange={(e) => setBozza({ ...bozza, quantita: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-um">Unità</Label>
                  <Input id="v-um" value={bozza.um} onChange={(e) => setBozza({ ...bozza, um: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-fe">FE (kgCO₂e/unità)</Label>
                  <Input id="v-fe" data-slot="kpi" value={bozza.fe} onChange={(e) => setBozza({ ...bozza, fe: e.target.value, factorKey: null })} />
                </div>
              </div>
              {bozza.categoryKey === "2" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-fem">Fattore market-based (residual mix)</Label>
                    <Input id="v-fem" data-slot="kpi" value={bozza.feMarket} onChange={(e) => setBozza({ ...bozza, feMarket: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-go">Quota coperta da GO/PPA ({bozza.um || "kWh"})</Label>
                    <Input id="v-go" data-slot="kpi" value={bozza.quotaGo} onChange={(e) => setBozza({ ...bozza, quotaGo: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-bio">CO₂ biogenica (kg/unità)</Label>
                    <Input id="v-bio" data-slot="kpi" value={bozza.feBiogenic} onChange={(e) => setBozza({ ...bozza, feBiogenic: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Si rendiconta separatamente, fuori dai totali.</p>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Qualità del dato</Label>
                  <Select value={bozza.dq} onValueChange={(v) => setBozza({ ...bozza, dq: v as DqLevel })}>
                    <SelectTrigger aria-label="Qualità del dato"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DQ_LEVELS) as DqLevel[]).map((k) => (
                        <SelectItem key={k} value={k}>{DQ_LEVELS[k].nome} — ±{DQ_LEVELS[k].inc}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-inc">Incertezza % (override)</Label>
                  <Input id="v-inc" data-slot="kpi" value={bozza.incertezza} onChange={(e) => setBozza({ ...bozza, incertezza: e.target.value })} placeholder={DQ_LEVELS[bozza.dq].inc} />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="v-ev">Evidenza documentale</Label>
                  <Input id="v-ev" value={bozza.evidenza} onChange={(e) => setBozza({ ...bozza, evidenza: e.target.value })} placeholder="Fatture 2025 — /GHG/energia" />
                </div>
              </div>
              {anteprima && (
                <div className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
                  <span className="font-semibold" data-slot="kpi">{fmtNum(anteprima.t.toNumber(), 3)} tCO₂e</span>
                  {bozza.categoryKey === "2" && <span className="ml-3">market-based <b data-slot="kpi">{fmtNum(anteprima.tM.toNumber(), 3)}</b></span>}
                  {anteprima.bio.gt(0) && <span className="ml-3">biogenica <b data-slot="kpi">{fmtNum(anteprima.bio.toNumber(), 3)} t</b></span>}
                  <span className="ml-3">± {fmtNum(anteprima.inc.toNumber(), 0)}%</span>
                </div>
              )}
              {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setBozza(null)}>Annulla</Button>
                <Button onClick={salva} disabled={inCorso}>{inCorso ? "Salvataggio…" : "Salva voce"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
