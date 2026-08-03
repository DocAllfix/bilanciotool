"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setAllocationAction, setEndUseStateAction, setStimaAction } from "@/features/energy/actions";
import { computeAllocationWithCoverage, computeQuadratura, type Cella } from "@/lib/calc/energy/allocation";
import { dec } from "@/lib/calc/shared/decimal";
import type { Fattori, VettoreDef, VettoreInput } from "@/lib/calc/energy/vectors";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, RefreshCw, Settings2 } from "lucide-react";
import type { PropsPasso, UsoEnergia } from "./types";

// Passo 3 — Ripartizione sugli usi finali. È il passaggio che trasforma una
// raccolta di bollette in un bilancio energetico, ed è il più delicato: fino a
// venti righe per undici colonne.
//
// Tre scelte deliberate:
//  1. si disegnano SOLO le colonne dei vettori valorizzati e le righe degli usi
//     accesi, altrimenti la griglia è un muro di caselle vuote;
//  2. ogni casella salva da sola, e nessun salvataggio rivalida la pagina: con
//     duecentoventi caselle un revalidatePath per ogni uscita dal campo
//     produrrebbe decine di ricalcoli mentre si compila;
//  3. la quadratura si ricalcola nel browser con LA STESSA funzione pura che usa
//     il server, quindi l'anteprima non può divergere dal risultato salvato.

const finito = (n: number) => (Number.isFinite(n) ? n : 0);

export function PassoUsi({ companyId, bilancio, catalogo, stato, risultati }: PropsPasso) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inRicalcolo, setInRicalcolo] = useState(false);
  const [guida, setGuida] = useState<UsoEnergia | null>(null);
  const [mostraTutti, setMostraTutti] = useState(false);

  // Stato locale delle celle: è la sola cosa che cambia mentre si compila.
  const [celle, setCelle] = useState<Record<string, string>>(() =>
    Object.fromEntries(stato.celle.map((c) => [`${c.usoKey}|${c.vettoreKey}`, c.quantita])),
  );

  // Interruttori e tendine rispondono subito, senza aspettare il giro sul
  // server: un comando che resta immobile per qualche secondo si legge come
  // rotto, e l'utente lo preme di nuovo.
  const [attivoLocale, setAttivoLocale] = useState<Record<string, boolean>>({});
  const [metodoLocale, setMetodoLocale] = useState<Record<string, string>>({});
  const attivo = (u: UsoEnergia) => attivoLocale[u.key] ?? u.attivo;
  const metodo = (u: UsoEnergia) => metodoLocale[u.key] ?? u.metodo ?? "";

  const usiAttivi = catalogo.usi.filter(attivo);
  const colonne = useMemo(() => {
    const conCella = new Set(Object.entries(celle).filter(([, v]) => v !== "").map(([k]) => k.split("|")[1]));
    const inputPer = new Map(stato.inputs.map((i) => [i.vettoreKey, i]));
    return catalogo.vettori.filter(
      (v) => !v.sub && (conCella.has(v.key) || Number(inputPer.get(v.key)?.quantita ?? 0) > 0),
    );
  }, [catalogo.vettori, stato.inputs, celle]);

  // Anteprima di quadratura e copertura sulle stesse funzioni pure del server.
  // Senza, la copertura resterebbe ferma al valore dell'ultimo ricalcolo e
  // direbbe "0%" accanto a una quadratura chiusa: una contraddizione a schermo.
  const { quadratura, coperturaPct } = useMemo(() => {
    const defs: VettoreDef[] = catalogo.vettori.map((v) => ({
      key: v.key, categoria: v.categoria, rinnovabile: v.rinnovabile, sub: v.sub,
    }));
    const fattori = new Map<string, Fattori>(
      catalogo.vettori.map((v) => [v.key, { kwhUnita: v.kwhUnita, tepUnita: v.tepUnita, feUnita: v.feUnita, feMarket: v.feMarket }]),
    );
    const ingressi: VettoreInput[] = stato.inputs.map((i) => ({ vettoreKey: i.vettoreKey, quantita: i.quantita, costo: i.costo }));
    const attive = new Set(usiAttivi.map((u) => u.key));
    const righe: Cella[] = Object.entries(celle)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => {
        const [usoKey, vettoreKey] = k.split("|");
        return { usoKey, vettoreKey, quantita: v };
      })
      .filter((c) => attive.has(c.usoKey));

    const euroPerKwh = new Map(risultati.perVettore.map((v) => [v.key, v.euroPerKwh]));
    const ripartizione = computeAllocationWithCoverage(
      usiAttivi.map((u) => ({ key: u.key, areaKey: u.areaKey })),
      righe,
      fattori,
      euroPerKwh,
      dec(risultati.totali.kwh),
    );
    return {
      quadratura: computeQuadratura(defs, ingressi, righe, fattori),
      coperturaPct: ripartizione.coperturaPct.toString(),
    };
  }, [catalogo.vettori, stato.inputs, celle, usiAttivi, risultati.perVettore, risultati.totali.kwh]);

  async function salvaCella(usoKey: string, vettoreKey: string, valore: string) {
    setErrore(null);
    const pulito = valore.trim();
    setCelle((c) => ({ ...c, [`${usoKey}|${vettoreKey}`]: pulito }));
    const esito = await setAllocationAction(bilancio.id, { usoKey, vettoreKey, quantita: pulito });
    if (!esito.ok) setErrore(esito.errore);
  }

  async function cambiaStatoUso(usoKey: string, patch: { attivo?: boolean; metodo?: "mis" | "cal" | "sti" | null }) {
    setErrore(null);
    if (patch.attivo !== undefined) setAttivoLocale((s) => ({ ...s, [usoKey]: patch.attivo! }));
    if (patch.metodo !== undefined) setMetodoLocale((s) => ({ ...s, [usoKey]: patch.metodo ?? "" }));
    const esito = await setEndUseStateAction(companyId, bilancio.anno, bilancio.id, { usoKey, ...patch });
    if (!esito.ok) {
      // Il server ha rifiutato: si torna a quello che dice il database.
      if (patch.attivo !== undefined) setAttivoLocale((s) => ({ ...s, [usoKey]: !patch.attivo }));
      return setErrore(esito.errore);
    }
    router.refresh();
  }

  async function ricalcola() {
    setInRicalcolo(true);
    await ricalcolaAction(companyId, bilancio.anno);
    router.refresh();
    setInRicalcolo(false);
  }

  const perArea = catalogo.aree.map((a) => ({ area: a, usi: usiAttivi.filter((u) => u.areaKey === a.key) }));
  const valutati = [...quadratura.perVettore.values()].filter((q) => q.attivo);
  const chiusi = valutati.filter((q) => q.ok).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Attribuisci ogni vettore alle utenze che lo consumano, <strong className="text-foreground">nell&apos;unità del vettore</strong>,
          non in kWh. La quadratura confronta quantità entrate e quantità attribuite, quindi resta valida anche
          se un fattore di conversione viene corretto dopo.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inRicalcolo}>
            <RefreshCw className={cn("size-3.5", inRicalcolo && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-accent/40 px-5 py-3">
        <span className="text-sm">
          Quadratura: <strong data-slot="kpi">{chiusi} su {valutati.length}</strong> vettori chiusi entro il 2%
        </span>
        <span className="text-sm text-muted-foreground">
          Copertura sul totale entrato: <strong className="text-foreground" data-slot="kpi">{fmtNum(coperturaPct, 1)}%</strong>
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setMostraTutti((v) => !v)}>
          <Settings2 className="size-3.5" /> {mostraTutti ? "Nascondi" : "Scegli"} gli usi finali
        </Button>
      </div>

      {mostraTutti && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-[15px] font-semibold tracking-tight">Usi finali considerati</h2>
            <p className="text-sm text-muted-foreground">
              Spegnere un uso non cancella quello che hai già scritto: le caselle restano, il calcolo le ignora.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogo.usi.map((u) => (
              <label key={u.key} className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition-colors hover:bg-accent">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={attivo(u)}
                  aria-label={`Considera l'uso finale ${u.nome}`}
                  onChange={(e) => cambiaStatoUso(u.key, { attivo: e.target.checked })}
                />
                <span>
                  <span className="font-medium">{u.nome}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{u.key}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {colonne.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun vettore valorizzato: torna al passo 2 e inserisci almeno un consumo annuo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-208 border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="sticky left-0 z-10 min-w-64 bg-card px-4 py-3 text-left font-medium text-muted-foreground">
                    Uso finale
                  </th>
                  <th scope="col" className="w-36 px-3 py-3 text-left font-medium text-muted-foreground">Determinazione</th>
                  {colonne.map((v) => (
                    <th key={v.key} scope="col" className="w-32 px-3 py-3 text-right font-medium text-muted-foreground">
                      <span className="block truncate" title={v.nome}>{v.nome}</span>
                      <span className="block text-[11px] font-normal">{v.um}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              {perArea.map(({ area, usi }) =>
                usi.length === 0 ? null : (
                  <tbody key={area.key}>
                    <tr className="border-b bg-muted/40">
                      <th scope="colgroup" colSpan={2 + colonne.length} className="px-4 py-2 text-left">
                        <span className="text-[11px] font-semibold uppercase tracking-wide">{area.nome}</span>
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{area.descrizione}</span>
                      </th>
                    </tr>
                    {usi.map((u) => (
                      <tr key={u.key} className="border-b last:border-0">
                        <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-normal">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{u.nome}</span>
                            <button
                              type="button"
                              onClick={() => setGuida(u)}
                              aria-label={`Come si determina: ${u.nome}`}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <BookOpen className="size-3.5" />
                            </button>
                          </div>
                        </th>
                        <td className="px-3 py-2">
                          <Select
                            value={metodo(u)}
                            onValueChange={(v) => cambiaStatoUso(u.key, { metodo: v as "mis" | "cal" | "sti" })}
                          >
                            <SelectTrigger className="h-8 w-full" aria-label={`Metodo di determinazione per ${u.nome}`}>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogo.metodi.map((m) => (
                                <SelectItem key={m.v} value={m.v}>{m.n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {colonne.map((v) => {
                          const chiave = `${u.key}|${v.key}`;
                          return (
                            <td key={v.key} className="p-1">
                              {/* Campo CONTROLLATO: il calcolatore di stima scrive nello
                                  stesso stato, e con un campo non controllato la casella
                                  resterebbe ferma sul valore precedente. */}
                              <Input
                                className="h-8 px-2 text-right text-xs"
                                data-slot="kpi"
                                value={celle[chiave] ?? ""}
                                aria-label={`${u.nome} — ${v.nome} in ${v.um}`}
                                onChange={(e) => setCelle((c) => ({ ...c, [chiave]: e.target.value }))}
                                onBlur={(e) => salvaCella(u.key, v.key, e.target.value)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ),
              )}
              <tfoot className="border-t-2">
                {(["ingresso", "ripartito", "residuo"] as const).map((riga) => (
                  <tr key={riga} className="border-b last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      {riga === "ingresso" ? "Entrato nel sito" : riga === "ripartito" ? "Attribuito alle utenze" : "Residuo da attribuire"}
                    </th>
                    <td />
                    {colonne.map((v) => {
                      const q = quadratura.perVettore.get(v.key);
                      const valore = q ? Number(q[riga].toString()) : 0;
                      return (
                        <td
                          key={v.key}
                          className={cn(
                            "px-3 py-2 text-right text-xs tabular-nums",
                            riga === "residuo" && q?.attivo && (q.ok ? "text-success" : "text-warning font-semibold"),
                          )}
                          data-slot="kpi"
                        >
                          {fmtNum(finito(valore), 0)}
                          {riga === "residuo" && q?.attivo && !q.ok && (
                            <span className="ml-1 font-normal">({fmtNum(Number(q.scostamentoPct.toString()), 1)}%)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      <PannelloGuida
        uso={guida}
        catalogo={catalogo}
        onChiudi={() => setGuida(null)}
        onScrivi={(vettoreKey, quantita) => {
          if (guida) salvaCella(guida.key, vettoreKey, quantita);
          setGuida(null);
        }}
        onStima={(patch) => { if (guida) setStimaAction(bilancio.id, { usoKey: guida.key, ...patch }); }}
      />
    </div>
  );
}

/** Guida consulenziale per uso finale: definizione, modi di determinazione in
 *  ordine di affidabilità, errore ricorrente, evidenze da conservare, e un
 *  calcolatore che scrive direttamente nella riga. */
function PannelloGuida({
  uso, catalogo, onChiudi, onScrivi, onStima,
}: {
  uso: UsoEnergia | null;
  catalogo: PropsPasso["catalogo"];
  onChiudi: () => void;
  onScrivi: (vettoreKey: string, quantita: string) => void;
  onStima: (patch: { stimaVettoreKey?: string; stimaKw?: string; stimaOre?: string; stimaFattoreCarico?: string }) => void;
}) {
  const [kw, setKw] = useState("");
  const [ore, setOre] = useState("");
  const [carico, setCarico] = useState("0,8");
  const [vettoreKey, setVettoreKey] = useState("");

  const vettoriDisponibili = catalogo.vettori.filter((v) => !v.sub);
  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  const kwh = num(kw) * num(ore) * num(carico);
  const vettore = vettoriDisponibili.find((v) => v.key === vettoreKey);
  const quantita = vettore && Number(vettore.kwhUnita) > 0 ? kwh / Number(vettore.kwhUnita) : 0;

  return (
    <Dialog open={uso !== null} onOpenChange={(o) => { if (!o) onChiudi(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{uso?.nome}</DialogTitle>
          <DialogDescription>{uso?.guida.def}</DialogDescription>
        </DialogHeader>
        {uso && (
          <div className="grid gap-5">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Come si determina, dal più al meno affidabile
              </h3>
              <ol className="mt-2 space-y-1.5 text-sm">
                {uso.guida.come.map((c, i) => (
                  <li key={c} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold" data-slot="kpi">
                      {i + 1}
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide">Errore ricorrente</h3>
              <p className="mt-1 text-sm">{uso.guida.flag}</p>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidenze da conservare</h3>
              <p className="mt-1 text-sm">{uso.guida.ev}</p>
            </section>

            <section className="rounded-lg border bg-accent/40 p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide">Calcolatore di stima</h3>
              <p className="mt-1 text-xs text-muted-foreground">{uso.guida.stima}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div>
                  <Label htmlFor="st-kw">Potenza kW</Label>
                  <Input id="st-kw" value={kw} onChange={(e) => setKw(e.target.value)} onBlur={() => onStima({ stimaKw: kw })} className="mt-1.5" data-slot="kpi" />
                </div>
                <div>
                  <Label htmlFor="st-ore">Ore all&apos;anno</Label>
                  <Input id="st-ore" value={ore} onChange={(e) => setOre(e.target.value)} onBlur={() => onStima({ stimaOre: ore })} className="mt-1.5" data-slot="kpi" />
                </div>
                <div>
                  <Label htmlFor="st-fc">Fattore di carico</Label>
                  <Input id="st-fc" value={carico} onChange={(e) => setCarico(e.target.value)} onBlur={() => onStima({ stimaFattoreCarico: carico })} className="mt-1.5" data-slot="kpi" />
                </div>
                <div>
                  <Label htmlFor="st-v">Vettore</Label>
                  <Select value={vettoreKey} onValueChange={(v) => { setVettoreKey(v); onStima({ stimaVettoreKey: v }); }}>
                    <SelectTrigger id="st-v" className="mt-1.5 w-full"><SelectValue placeholder="Scegli" /></SelectTrigger>
                    <SelectContent>
                      {vettoriDisponibili.map((v) => <SelectItem key={v.key} value={v.key}>{v.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Stima: <strong data-slot="kpi">{fmtNum(kwh, 0)} kWh</strong>
                  {vettore && <span className="text-muted-foreground"> · {fmtNum(quantita, 2)} {vettore.um}</span>}
                </p>
                <Button
                  size="sm"
                  disabled={!vettore || quantita <= 0}
                  onClick={() => vettore && onScrivi(vettore.key, String(Math.round(quantita * 100) / 100))}
                >
                  Scrivi nella riga
                </Button>
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              <Badge variant="outline">{uso.key}</Badge> Area funzionale: {catalogo.aree.find((a) => a.key === uso.areaKey)?.nome}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
