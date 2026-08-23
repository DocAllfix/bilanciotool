"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCampoRequisitoAction } from "@/features/mog231/actions";
import { STATI_PRESIDIO } from "@/features/mog231/validation";
import { idoneitaPilastro } from "@/lib/calc/mog231/idoneita";
import { cn } from "@/lib/utils";
import type { DatiMog231 } from "./types";

// Gli 81 presidi, per pilastro.
//
// ⚠️ L'anteprima usa `idoneitaPilastro`, LA STESSA funzione pura del server. Riscrivere
// qui la media creerebbe due aritmetiche che possono divergere, e la prima volta che
// divergono il numero a schermo è plausibile e sbagliato.

const COLORE: Record<string, string> = {
  "Presente ed efficace": "bg-success text-white",
  "Presente ma da rafforzare": "bg-warning text-white",
  Assente: "bg-destructive text-white",
  "Non applicabile": "bg-muted text-muted-foreground",
};

export function VistaPresidi({ companyId, dati }: { companyId: string; dati: DatiMog231 }) {
  const router = useRouter();
  const [pilastro, setPilastro] = useState<string>(dati.pilastri[0]?.key ?? "P1");
  const [errore, setErrore] = useState<string | null>(null);
  const [locali, setLocali] = useState<Record<string, string | null>>({});
  const serverPer = new Map(dati.statiRequisiti.map((r) => [r.requirementKey, r.stato]));
  const statoDi = (k: string) => (k in locali ? locali[k]! : (serverPer.get(k) ?? null));

  const requisiti = dati.catalogo.requisiti.filter((r) => r.pillarKey === pilastro);
  const anteprima = idoneitaPilastro(requisiti.map((r) => statoDi(r.key)));
  const valutati = requisiti.filter((r) => statoDi(r.key)).length;

  async function scegli(key: string, stato: string | null) {
    const prima = statoDi(key);
    setLocali((l) => ({ ...l, [key]: stato }));
    setErrore(null);
    const esito = await setCampoRequisitoAction(companyId, dati.modello.id, {
      requirementKey: key,
      campo: "stato",
      valore: stato,
    });
    if (!esito.ok) {
      setLocali((l) => ({ ...l, [key]: prima }));
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4" data-tour="mog-presidi">
      <nav aria-label="Pilastri del Modello" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {dati.pilastri.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setPilastro(p.key)}
                aria-current={pilastro === p.key ? "page" : undefined}
                data-pilastro={p.key}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
                  pilastro === p.key ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {p.key}. {p.nome}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <p className="text-sm text-muted-foreground">
        {valutati} presidi valutati su {requisiti.length} — idoneità del pilastro{" "}
        <strong className="text-foreground" data-slot="kpi">
          {anteprima}%
        </strong>
        . Un presidio dovuto e non valutato pesa zero: saltare i difficili non fa salire il numero.
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
            <li key={r.key} className="px-4 py-4" data-presidio={r.key}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="w-20 shrink-0 font-mono text-[12px] text-muted-foreground">{r.riferimento}</span>
                <p className="min-w-0 flex-1 text-[13px]">{r.testo}</p>
                {r.procedura && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {r.procedura}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATI_PRESIDIO.map((s) => (
                  <button
                    key={s}
                    type="button"
                    // Ripremere annulla: l'unico modo di tornare a «non valutato».
                    onClick={() => scegli(r.key, stato === s ? null : s)}
                    aria-pressed={stato === s}
                    aria-label={`${r.key}: ${s}`}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
                      stato === s ? `border-transparent ${COLORE[s]}` : "hover:bg-accent",
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
