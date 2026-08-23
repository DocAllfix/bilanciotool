"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCampoRequisitoAction } from "@/features/anticorruzione/actions";
import { STATI_REQUISITO } from "@/features/anticorruzione/validation";
import { conformitaCapitolo } from "@/lib/calc/anticorruzione/conformita";
import { cn } from "@/lib/utils";
import type { DatiAnticorruzione } from "./types";

// I 91 requisiti, per capitolo.
//
// ⚠️ L'anteprima della conformità si calcola con `conformitaCapitolo`, **la stessa
// funzione pura che usa il server**. Riscrivere qui la media — anche solo «somma diviso
// conta» — creerebbe due aritmetiche che possono divergere, e la prima volta che
// divergono nessuno se ne accorge: il numero a schermo sarebbe plausibile e sbagliato.

const COLORE_STATO: Record<string, string> = {
  Conforme: "bg-success text-white",
  "Parzialmente conforme": "bg-warning text-white",
  "Non conforme": "bg-destructive text-white",
  "Non applicabile": "bg-muted text-muted-foreground",
};

export function VistaRequisiti({ companyId, dati }: { companyId: string; dati: DatiAnticorruzione }) {
  const router = useRouter();
  const [capitolo, setCapitolo] = useState<string>(dati.capitoli[0]?.key ?? "4");
  const [errore, setErrore] = useState<string | null>(null);

  // Stato locale sovrapposto a quello del server: il comando risponde subito, e
  // l'anteprima della conformità si aggiorna con la funzione pura invece di aspettare
  // il viaggio di rete. Il server resta la verità: `router.refresh()` la riporta.
  const [locali, setLocali] = useState<Record<string, string | null>>({});
  const statoServer = new Map(dati.statiRequisiti.map((r) => [r.requirementKey, r.stato]));
  const statoDi = (key: string) => (key in locali ? locali[key]! : (statoServer.get(key) ?? null));

  const requisiti = dati.catalogo.requisiti.filter((r) => r.chapterKey === capitolo);
  const anteprima = conformitaCapitolo(requisiti.map((r) => statoDi(r.key)));
  const valutati = requisiti.filter((r) => statoDi(r.key)).length;

  async function scegli(key: string, stato: string | null) {
    const precedente = statoDi(key);
    setLocali((l) => ({ ...l, [key]: stato }));
    setErrore(null);
    const esito = await setCampoRequisitoAction(companyId, dati.sistema.id, {
      requirementKey: key,
      campo: "stato",
      valore: stato,
    });
    if (!esito.ok) {
      setLocali((l) => ({ ...l, [key]: precedente }));
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4" data-tour="pc-requisiti">
      <nav aria-label="Capitoli della norma" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {dati.capitoli.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => setCapitolo(c.key)}
                aria-current={capitolo === c.key ? "page" : undefined}
                data-capitolo={c.key}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
                  capitolo === c.key ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {c.key}. {c.nome}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <p className="text-sm text-muted-foreground">
        {valutati} requisiti valutati su {requisiti.length} — conformità del capitolo{" "}
        <strong className="text-foreground" data-slot="kpi">
          {anteprima}%
        </strong>
        . Un requisito applicabile e non valutato pesa zero: saltare i difficili non fa salire il numero.
      </p>

      {errore && (
        <p className="text-sm text-destructive" role="alert">
          {errore}
        </p>
      )}

      <ul className="divide-y rounded-xl border">
        {requisiti.map((r) => {
          const stato = statoDi(r.key);
          return (
            <li key={r.key} className="px-4 py-4" data-requisito={r.key}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="w-12 shrink-0 font-mono text-[12px] text-muted-foreground">{r.riferimento}</span>
                <p className="min-w-0 flex-1 text-[13px]">{r.testo}</p>
                {r.procedura && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {r.procedura}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 pl-15">
                {STATI_REQUISITO.map((s) => (
                  <button
                    key={s}
                    type="button"
                    // Ripremere annulla: è l'unico modo di tornare a «non valutato» senza
                    // un comando dedicato, ed è il gesto che i cinque moduli usano già.
                    onClick={() => scegli(r.key, stato === s ? null : s)}
                    aria-pressed={stato === s}
                    aria-label={`${r.riferimento}: ${s}`}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
                      stato === s ? `border-transparent ${COLORE_STATO[s]}` : "hover:bg-accent",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
