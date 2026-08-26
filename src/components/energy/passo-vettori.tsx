"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCompanyFactorAction, setMonthlyValueAction, setVectorFieldAction, upsertCompanyFactorAction,
} from "@/features/energy/actions";
import { fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, RotateCcw, SlidersHorizontal } from "lucide-react";
import { MESI, NOMI_CATEGORIA, type PropsPasso, type VettoreEnergia } from "./types";

// Passo 2 — Energia in ingresso. Tre viste sugli stessi vettori: quantità e
// costo, dettaglio mensile, fattori di conversione.
//
// Nessuna azione di questo passo rivalida la pagina: si compila una tabella,
// non si naviga. Il ricalcolo avviene al cambio passo.

export function PassoVettori({ companyId, bilancio, catalogo, stato, risultati }: PropsPasso) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);

  const inputPer = new Map(stato.inputs.map((i) => [i.vettoreKey, i]));
  const calcolatoPer = new Map(risultati.perVettore.map((v) => [v.key, v]));
  const controlloPer = new Map(risultati.mensile.controlli.map((c) => [c.key, c]));

  // Si manda SOLO il campo cambiato: l'altro lo rilegge il server dal database.
  // Rispedire la riga intera da props non aggiornate cancellerebbe il valore
  // appena inserito, che è il difetto già corretto in Fase 7 sulla materialità.
  async function salvaVettore(vettoreKey: string, campo: "quantita" | "costo", valore: string) {
    setErrore(null);
    const esito = await setVectorFieldAction(bilancio.id, { vettoreKey, campo, valore });
    if (!esito.ok) return setErrore(esito.errore);
  }

  async function salvaMese(vettoreKey: string, mese: number, valore: string) {
    setErrore(null);
    const esito = await setMonthlyValueAction(bilancio.id, { vettoreKey, mese, valore });
    if (!esito.ok) setErrore(esito.errore);
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Riporta i consumi annui dalle fatture e dai contatori. Il costo non è un dettaglio contabile: senza,
          non si calcolano né il costo medio dell&apos;energia né il ritorno degli interventi.
        </p>
        {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
      </div>

      <Tabs defaultValue="annuo">
        <TabsList>
          <TabsTrigger value="annuo">Consumi annui</TabsTrigger>
          <TabsTrigger value="mensile"><CalendarRange className="size-3.5" /> Dettaglio mensile</TabsTrigger>
          <TabsTrigger value="fattori"><SlidersHorizontal className="size-3.5" /> Fattori di conversione</TabsTrigger>
        </TabsList>

        <TabsContent value="annuo">
          <Card className="py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vettore energetico</TableHead>
                    <TableHead className="w-20">Unità</TableHead>
                    <TableHead className="w-36 text-right">Quantità</TableHead>
                    <TableHead className="w-36 text-right">Spesa annua €</TableHead>
                    <TableHead className="w-28 text-right">kWh</TableHead>
                    <TableHead className="w-24 text-right">€/kWh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogo.vettori.map((v) => {
                    const inp = inputPer.get(v.key);
                    const calc = calcolatoPer.get(v.key);
                    return (
                      <TableRow key={v.key} className={v.sub ? "bg-muted/30" : undefined}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: v.colore ?? "var(--muted-foreground)" }} aria-hidden />
                            <span className="font-medium">{v.nome}</span>
                            {v.rinnovabile && <Badge variant="outline">rinnovabile</Badge>}
                            {v.sub && <Badge variant="outline">di cui</Badge>}
                          </div>
                          <p className="mt-0.5 pl-4.5 text-xs text-muted-foreground">
                            {NOMI_CATEGORIA[v.categoria]}
                            {v.sub && " · dettaglio dell'elettricità prelevata, escluso dai totali"}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.um}</TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            data-slot="kpi"
                            defaultValue={inp?.quantita ?? ""}
                            aria-label={`${v.nome}: quantità in ${v.um}`}
                            onBlur={(e) => { if (e.target.value !== (inp?.quantita ?? "")) salvaVettore(v.key, "quantita", e.target.value); }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            data-slot="kpi"
                            defaultValue={inp?.costo ?? ""}
                            aria-label={`${v.nome}: spesa annua in euro`}
                            onBlur={(e) => { if (e.target.value !== (inp?.costo ?? "")) salvaVettore(v.key, "costo", e.target.value); }}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground" data-slot="kpi">
                          {calc && Number(calc.kwh) > 0 ? fmtNum(calc.kwh, 0) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground" data-slot="kpi">
                          {calc && Number(calc.euroPerKwh) > 0 ? fmtNum(calc.euroPerKwh, 4) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <RiepilogoIngresso risultati={risultati} />
        </TabsContent>

        <TabsContent value="mensile">
          <Card className="py-0">
            <CardHeader className="border-b py-4">
              <h2 className="text-[15px] font-semibold tracking-tight">Ripartizione nei dodici mesi</h2>
              <p className="text-sm text-muted-foreground">
                Facoltativa, ma è l&apos;unico modo di distinguere il consumo che dipende dalla produzione da quello
                che c&apos;è comunque. Bastano sei mesi perché il consumo di base venga calcolato.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <Table className="min-w-208">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-card">Vettore</TableHead>
                    {MESI.map((m) => <TableHead key={m} className="w-20 text-right">{m}</TableHead>)}
                    <TableHead className="w-28 text-right">Controllo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogo.vettori.filter((v) => !v.sub).map((v) => {
                    const inp = inputPer.get(v.key);
                    const mensili = inp?.mensili ?? [];
                    const ctrl = controlloPer.get(v.key);
                    return (
                      <TableRow key={v.key}>
                        <TableCell className="sticky left-0 z-10 bg-card">
                          <span className="font-medium">{v.nome}</span>
                          <span className="ml-1 text-xs text-muted-foreground">{v.um}</span>
                        </TableCell>
                        {MESI.map((m, i) => (
                          <TableCell key={m} className="p-1">
                            <Input
                              className="h-8 px-2 text-right text-xs"
                              data-slot="kpi"
                              defaultValue={mensili[i] ?? ""}
                              aria-label={`${v.nome}: ${m}`}
                              onBlur={(e) => { if (e.target.value !== (mensili[i] ?? "")) salvaMese(v.key, i, e.target.value); }}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-xs tabular-nums">
                          {!ctrl || Number(ctrl.sommaMesi) === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : ctrl.ok ? (
                            <span className="text-success">quadra</span>
                          ) : (
                            <span className="text-warning">
                              {ctrl.scostamentoPct === null ? "senza annuo" : `${fmtNum(ctrl.scostamentoPct, 1)}%`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {risultati.mensile.consumoDiBase !== null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Consumo di base stimato: <strong className="text-foreground" data-slot="kpi">{fmtNum(risultati.mensile.consumoDiBase, 0)} kWh</strong> al mese,
              cioè l&apos;energia che il sito assorbe anche senza produrre.
            </p>
          )}
        </TabsContent>

        <TabsContent value="fattori">
          <TabellaFattori companyId={companyId} anno={bilancio.anno} catalogo={catalogo} onErrore={setErrore} onFatto={() => router.refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiepilogoIngresso({ risultati }: { risultati: PropsPasso["risultati"] }) {
  const t = risultati.totali;
  const voci: [string, string, string][] = [
    ["Energia complessiva", fmtNum(t.kwh, 0), "kWh"],
    ["Energia primaria", fmtNum(t.tep, 1), "tep"],
    ["Spesa energetica", fmtNum(t.costo, 0), "€"],
    ["Costo medio", fmtNum(t.euroPerKwh, 4), "€/kWh"],
    ["Quota rinnovabile", fmtNum(t.pctRinnovabile, 1), "%"],
    ["Emissioni", fmtNum(risultati.emissioni.totLocation, 1), "tCO₂e"],
  ];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-accent/40 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
      {voci.map(([label, valore, um]) => (
        <div key={label}>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
            {valore} <span className="text-xs font-normal text-muted-foreground">{um}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Fattori a sovrapposizione: la libreria di piattaforma resta la base, l'azienda
 *  ne scavalca i valori dove ha un dato proprio, e può sempre tornare indietro. */
function TabellaFattori({
  companyId, anno, catalogo, onErrore, onFatto,
}: {
  companyId: string;
  anno: number;
  catalogo: PropsPasso["catalogo"];
  onErrore: (e: string | null) => void;
  onFatto: () => void;
}) {
  const [aperto, setAperto] = useState<VettoreEnergia | null>(null);

  async function ripristina(key: string) {
    onErrore(null);
    const esito = await deleteCompanyFactorAction(companyId, anno, key);
    if (!esito.ok) return onErrore(esito.errore);
    onFatto();
  }

  return (
    <>
      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Poteri calorifici e fattori di emissione</h2>
          <p className="text-sm text-muted-foreground">
            Sono validi in generale. Personalizzali solo con un dato tuo, ad esempio il potere calorifico dichiarato
            dal fornitore del cippato: il valore resta legato a questo stabilimento e ogni scostamento resta visibile.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vettore</TableHead>
                <TableHead className="w-28 text-right">kWh/unità</TableHead>
                <TableHead className="w-28 text-right">tep/unità</TableHead>
                <TableHead className="w-32 text-right">kgCO₂e/unità</TableHead>
                <TableHead className="w-40">Origine</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogo.vettori.map((v) => (
                <TableRow key={v.key}>
                  <TableCell>
                    <span className="font-medium">{v.nome}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{v.um}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums" data-slot="kpi">{fmtNum(v.kwhUnita, 4)}</TableCell>
                  <TableCell className="text-right tabular-nums" data-slot="kpi">{fmtNum(v.tepUnita, 6)}</TableCell>
                  <TableCell className="text-right tabular-nums" data-slot="kpi">{fmtNum(v.feUnita, 4)}</TableCell>
                  <TableCell>
                    {v.origine === "personalizzato" ? (
                      <div>
                        <Badge>personalizzato</Badge>
                        {v.fonte && <p className="mt-0.5 text-xs text-muted-foreground">{v.fonte}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">libreria di piattaforma</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setAperto(v)} aria-label={`Personalizza i fattori di ${v.nome}`}>
                        Modifica
                      </Button>
                      {v.origine === "personalizzato" && (
                        <Button variant="ghost" size="sm" onClick={() => ripristina(v.key)} aria-label={`Ripristina i fattori di piattaforma per ${v.nome}`}>
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DialogFattore
        vettore={aperto}
        companyId={companyId}
        anno={anno}
        onChiudi={() => setAperto(null)}
        onErrore={onErrore}
        onFatto={onFatto}
      />
    </>
  );
}

function DialogFattore({
  vettore, companyId, anno, onChiudi, onErrore, onFatto,
}: {
  vettore: VettoreEnergia | null;
  companyId: string;
  anno: number;
  onChiudi: () => void;
  onErrore: (e: string | null) => void;
  onFatto: () => void;
}) {
  const [inCorso, setInCorso] = useState(false);

  async function salva(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vettore) return;
    const f = new FormData(e.currentTarget);
    setInCorso(true);
    onErrore(null);
    const esito = await upsertCompanyFactorAction(companyId, anno, {
      key: vettore.key,
      kwhUnita: String(f.get("kwhUnita") ?? ""),
      tepUnita: String(f.get("tepUnita") ?? ""),
      feUnita: String(f.get("feUnita") ?? ""),
      fonte: String(f.get("fonte") ?? "") || null,
    });
    setInCorso(false);
    if (!esito.ok) return onErrore(esito.errore);
    onChiudi();
    onFatto();
  }

  return (
    <Dialog open={vettore !== null} onOpenChange={(o) => { if (!o) onChiudi(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vettore?.nome}</DialogTitle>
          <DialogDescription>
            Lascia vuoto un campo per tenere il valore di piattaforma. Indica sempre da dove viene il dato:
            un verificatore lo chiederà.
          </DialogDescription>
        </DialogHeader>
        {vettore && (
          <form method="post" onSubmit={salva} className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="ff-kwh">kWh per {vettore.um}</Label>
                <Input id="ff-kwh" name="kwhUnita" defaultValue={vettore.origine === "personalizzato" ? vettore.kwhUnita : ""} placeholder={vettore.kwhUnita} className="mt-1.5" data-slot="kpi" />
              </div>
              <div>
                <Label htmlFor="ff-tep">tep per {vettore.um}</Label>
                <Input id="ff-tep" name="tepUnita" defaultValue={vettore.origine === "personalizzato" ? vettore.tepUnita : ""} placeholder={vettore.tepUnita} className="mt-1.5" data-slot="kpi" />
              </div>
              <div>
                <Label htmlFor="ff-fe">kgCO₂e per {vettore.um}</Label>
                <Input id="ff-fe" name="feUnita" defaultValue={vettore.origine === "personalizzato" ? vettore.feUnita : ""} placeholder={vettore.feUnita} className="mt-1.5" data-slot="kpi" />
              </div>
            </div>
            <div>
              <Label htmlFor="ff-fonte">Fonte del dato</Label>
              <Input id="ff-fonte" name="fonte" defaultValue={vettore.fonte ?? ""} placeholder="Scheda tecnica del fornitore, analisi di laboratorio, …" className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onChiudi}>Annulla</Button>
              <Button type="submit" disabled={inCorso}>Salva</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
