"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { AziendaReport, CatalogoReport, ProgettoReport, StatoReport } from "./types";
import { PassoOrganizzazione } from "./passo-organizzazione";
import { PassoMaterialita } from "./passo-materialita";
import { PassoKpi } from "./passo-kpi";
import { PassoPolitiche } from "./passo-politiche";
import { PassoRacconto } from "./passo-racconto";
import { PassoVerificaBilancio } from "./passo-verifica-bilancio";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { WizardNav } from "@/components/wizard-nav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Percorso in 7 passi del bilancio (ordine del prototipo).
const PASSI = [
  { n: 1, nome: "Organizzazione" },
  { n: 2, nome: "Materialità" },
  { n: 3, nome: "Dati e indicatori" },
  { n: 4, nome: "Politiche" },
  { n: 5, nome: "Racconto" },
  { n: 6, nome: "Verifica" },
  { n: 7, nome: "Bilancio" },
] as const;

export function ReportWizard(props: {
  companyId: string;
  azienda: AziendaReport;
  progetto: ProgettoReport;
  progetti: { id: string; anno: number }[];
  catalogo: CatalogoReport;
  stato: StatoReport;
  passoIniziale: number;
}) {
  const { companyId, azienda, progetto, progetti, catalogo, stato } = props;
  const router = useRouter();
  const passo = Math.min(7, Math.max(1, props.passoIniziale));
  const vai = (n: number) => router.replace(`/aziende/${companyId}/bilancio/${progetto.anno}?passo=${n}`, { scroll: false });

  // Completamento per passo derivato dal gap (contratto del prototipo).
  const g = stato.gap;
  const profiloOk = 1 - g.profiloMancanti.length / 8;
  const pctPasso = [
    profiloOk,
    Math.min(1, stato.materialita.assessedCount / catalogo.temi.length),
    catalogo.kpi.length ? Object.keys(stato.kpi.corrente).length / catalogo.kpi.length : 0,
    stato.materialita.materialKeys.length
      ? (stato.materialita.materialKeys.length - g.gestioneMancante.length) / stato.materialita.materialKeys.length
      : 0,
    catalogo.capitoli.length ? (catalogo.capitoli.length - g.capitoliDaCompletare.length) / catalogo.capitoli.length : 0,
    g.readyPct / 100,
    g.readyPct / 100,
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Portafoglio</Link> · Bilancio di sostenibilità
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {progetto.standard} · pronto a pubblicare {g.readyPct}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Esercizio</span>
          <Select value={String(progetto.anno)} onValueChange={(v) => router.push(`/aziende/${companyId}/bilancio/${v}?passo=${passo}`)}>
            <SelectTrigger className="w-28" data-slot="kpi" aria-label="Esercizio"><SelectValue /></SelectTrigger>
            <SelectContent>
              {progetti.map((p) => <SelectItem key={p.id} value={String(p.anno)}>{p.anno}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav aria-label="Passi del bilancio" className="mt-6 overflow-x-auto">
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
                  data-tour={`bil-passo-${p.n}`}
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
        {passo === 1 && <PassoOrganizzazione companyId={companyId} azienda={azienda} progetto={progetto} />}
        {passo === 2 && <PassoMaterialita companyId={companyId} progetto={progetto} catalogo={catalogo} stato={stato} />}
        {passo === 3 && <PassoKpi companyId={companyId} progetto={progetto} catalogo={catalogo} stato={stato} />}
        {passo === 4 && <PassoPolitiche companyId={companyId} progetto={progetto} catalogo={catalogo} stato={stato} />}
        {passo === 5 && <PassoRacconto companyId={companyId} progetto={progetto} catalogo={catalogo} stato={stato} />}
        {passo === 6 && <PassoVerificaBilancio catalogo={catalogo} stato={stato} vai={vai} />}
        {passo === 7 && (
          <PannelloPubblicazione companyId={companyId} tipo="bilancio" anno={progetto.anno} readyPct={g.readyPct} />
        )}
        <WizardNav passo={passo} totale={7} nomi={PASSI.map((p) => p.nome)} vai={vai} />
      </div>
    </div>
  );
}
