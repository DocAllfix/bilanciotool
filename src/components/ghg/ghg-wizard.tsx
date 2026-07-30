"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Azienda, Catalogo, Inventario, InventarioBreve, StatoWizard } from "./types";
import { PassoConfini } from "./passo-confini";
import { PassoSorgenti } from "./passo-sorgenti";
import { PassoDati } from "./passo-dati";
import { PassoFattori } from "./passo-fattori";
import { PassoRisultati } from "./passo-risultati";
import { PassoObiettivi } from "./passo-obiettivi";
import { PassoVerifica } from "./passo-verifica";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Il percorso in 8 passi dell'inventario (ordine del prototipo).
const PASSI = [
  { n: 1, chiave: "a1", nome: "Confini" },
  { n: 2, chiave: "a2", nome: "Sorgenti" },
  { n: 3, chiave: "a3", nome: "Dati di attività" },
  { n: 4, chiave: "a4", nome: "Fattori" },
  { n: 5, chiave: "a5", nome: "Risultati" },
  { n: 6, chiave: "a6", nome: "Obiettivi" },
  { n: 7, chiave: "a7", nome: "Verifica" },
  { n: 8, chiave: "a8", nome: "Report" },
] as const;

export function GhgWizard(props: {
  companyId: string;
  azienda: Azienda;
  inventario: Inventario;
  inventari: InventarioBreve[];
  catalogo: Catalogo;
  stato: StatoWizard;
  passoIniziale: number;
}) {
  const { companyId, azienda, inventario, inventari, catalogo, stato } = props;
  const router = useRouter();
  const passo = Math.min(8, Math.max(1, props.passoIniziale));

  // Il passo vive nell'URL, non in uno stato locale: unica fonte di verità, link
  // condivisibile e — soprattutto — i dati del passo arrivano sempre dal server.
  const vai = (n: number) => router.replace(`/aziende/${companyId}/ghg/${inventario.anno}?passo=${n}`, { scroll: false });

  const pct = (chiave: (typeof PASSI)[number]["chiave"]) => stato.progresso[chiave];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Portafoglio</Link> · Inventario GHG
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ISO 14064-1:2018 · avanzamento {stato.progresso.totPct}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Periodo</span>
          <Select
            value={String(inventario.anno)}
            onValueChange={(v) => {
              router.push(`/aziende/${companyId}/ghg/${v}?passo=${passo}`);
            }}
          >
            <SelectTrigger className="w-28" data-slot="kpi" aria-label="Periodo di rendicontazione">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inventari.map((i) => (
                <SelectItem key={i.id} value={String(i.anno)}>{i.anno}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav aria-label="Passi dell'inventario" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {PASSI.map((p) => {
            const completo = pct(p.chiave) >= 0.999;
            const parziale = !completo && pct(p.chiave) > 0;
            return (
              <li key={p.n}>
                <button
                  type="button"
                  onClick={() => vai(p.n)}
                  aria-current={passo === p.n ? "step" : undefined}
                  data-tour={`ghg-passo-${p.n}`}
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
        {passo === 1 && <PassoConfini companyId={companyId} inventario={inventario} />}
        {passo === 2 && <PassoSorgenti companyId={companyId} inventario={inventario} catalogo={catalogo} stato={stato} />}
        {passo === 3 && <PassoDati companyId={companyId} inventario={inventario} inventari={inventari} catalogo={catalogo} stato={stato} />}
        {passo === 4 && <PassoFattori companyId={companyId} catalogo={catalogo} stato={stato} />}
        {passo === 5 && <PassoRisultati catalogo={catalogo} stato={stato} />}
        {passo === 6 && <PassoObiettivi companyId={companyId} inventario={inventario} inventari={inventari} stato={stato} />}
        {passo === 7 && <PassoVerifica companyId={companyId} inventario={inventario} catalogo={catalogo} stato={stato} />}
        {passo === 8 && (
          <div className="rounded-lg border bg-card p-10 text-center">
            <h2 className="text-lg font-semibold tracking-tight">Report GHG</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Il documento conforme al §9.3.1 — impaginazione, pubblicazione e PDF — arriva con il generatore documenti (Fase 8 del piano).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
