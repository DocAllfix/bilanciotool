"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardNav } from "@/components/wizard-nav";
import { PassoSito } from "./passo-sito";
import { PassoVettori } from "./passo-vettori";
import { PassoUsi } from "./passo-usi";
import { PassoIndicatori } from "./passo-indicatori";
import { PassoInterventi } from "./passo-interventi";
import { PassoRaccontoEnergia } from "./passo-racconto-energia";
import { PassoVerificaEnergia } from "./passo-verifica-energia";
import type { AziendaEnergia, BilancioEnergia, CatalogoEnergia, RisultatiEnergia, StatoEnergia } from "./types";

// Percorso in 8 passi del bilancio energetico (UNI CEI EN 16247).
const PASSI = [
  { n: 1, nome: "Sito e perimetro" },
  { n: 2, nome: "Vettori" },
  { n: 3, nome: "Usi finali" },
  { n: 4, nome: "Indicatori" },
  { n: 5, nome: "Interventi" },
  { n: 6, nome: "Racconto" },
  { n: 7, nome: "Verifica" },
  { n: 8, nome: "Bilancio" },
] as const;

export function EnergyWizard(props: {
  companyId: string;
  azienda: AziendaEnergia;
  bilancio: BilancioEnergia;
  bilanci: { id: string; anno: number; annoBase: number }[];
  catalogo: CatalogoEnergia;
  stato: StatoEnergia;
  risultati: RisultatiEnergia;
  passoIniziale: number;
}) {
  const { companyId, azienda, bilancio, bilanci, catalogo, stato, risultati } = props;
  const router = useRouter();
  const passo = Math.min(8, Math.max(1, props.passoIniziale));
  const vai = (n: number) => router.replace(`/aziende/${companyId}/energetico/${bilancio.anno}?passo=${n}`, { scroll: false });

  const a = stato.avanzamento;
  const pctPasso = [a.s1, a.s2, a.s3, a.s4, a.s5, a.s6, a.totPct / 100, a.totPct / 100];
  const propsPasso = { companyId, bilancio, catalogo, stato, risultati };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Portafoglio</Link> · Bilancio energetico
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            UNI CEI EN 16247 · pronto a pubblicare {a.totPct}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Esercizio</span>
          <Select
            value={String(bilancio.anno)}
            onValueChange={(v) => router.push(`/aziende/${companyId}/energetico/${v}?passo=${passo}`)}
          >
            <SelectTrigger className="w-28" data-slot="kpi" aria-label="Esercizio"><SelectValue /></SelectTrigger>
            <SelectContent>
              {bilanci.map((b) => <SelectItem key={b.id} value={String(b.anno)}>{b.anno}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav aria-label="Passi del bilancio energetico" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {PASSI.map((p, i) => {
            const pct = pctPasso[i];
            const completo = pct >= 0.999;
            const parziale = !completo && pct > 0;
            return (
              <li key={p.n}>
                <button
                  type="button"
                  onClick={() => vai(p.n)}
                  aria-current={passo === p.n ? "step" : undefined}
                  data-tour={`ene-passo-${p.n}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    passo === p.n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                      passo === p.n
                        ? "border-primary-foreground/40"
                        : completo
                          ? "border-success bg-success text-white"
                          : parziale
                            ? "border-warning bg-warning text-white"
                            : "border-border",
                    )}
                    data-slot="kpi"
                  >
                    {completo ? <Check className="size-3" /> : p.n}
                  </span>
                  {p.nome}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6">
        {passo === 1 && <PassoSito companyId={companyId} azienda={azienda} bilancio={bilancio} />}
        {passo === 2 && <PassoVettori {...propsPasso} />}
        {passo === 3 && <PassoUsi {...propsPasso} />}
        {passo === 4 && <PassoIndicatori {...propsPasso} />}
        {passo === 5 && <PassoInterventi {...propsPasso} />}
        {passo === 6 && <PassoRaccontoEnergia {...propsPasso} />}
        {passo === 7 && <PassoVerificaEnergia {...propsPasso} vai={vai} />}
        {passo === 8 && (
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-[15px] font-semibold tracking-tight">Documento di diagnosi energetica</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Il generatore del documento arriva con la fase successiva: congelerà i dati in uno snapshot
                immutabile e produrrà il PDF impaginato, come già accade per il rapporto GHG e per il bilancio.
              </p>
            </CardContent>
          </Card>
        )}
        <WizardNav passo={passo} totale={8} nomi={PASSI.map((p) => p.nome)} vai={vai} />
      </div>
    </div>
  );
}
