"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setApplicabilitaAction } from "@/features/mog231/actions";
import { SI_NO } from "@/features/mog231/validation";
import { cn } from "@/lib/utils";
import { CampoTesto } from "@/components/comune/campo";
import type { DatiMog231 } from "./types";

// I 25 reati presupposto, per famiglia.
//
// ⚠️ Il default è «da determinare», non «applicabile». Dichiarare che un reato non
// riguarda l'ente è una decisione che va presa e motivata: è ciò che un giudice legge
// per capire se la mappatura è stata fatta o subita.

export function VistaReati({ companyId, dati }: { companyId: string; dati: DatiMog231 }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [locali, setLocali] = useState<Record<string, string | null>>({});
  const serverPer = new Map(dati.applicabilita.map((a) => [a.crimeKey, a]));
  const statoDi = (k: string) => (k in locali ? locali[k]! : (serverPer.get(k)?.applicabile ?? null));
  const conScenari = new Set(dati.scenari.map((s) => s.crimeKey));

  async function scegli(crimeKey: string, valore: string | null) {
    const prima = statoDi(crimeKey);
    setLocali((l) => ({ ...l, [crimeKey]: valore }));
    setErrore(null);
    const esito = await setApplicabilitaAction(companyId, dati.modello.id, {
      crimeKey,
      campo: "applicabile",
      valore,
    });
    if (!esito.ok) {
      setLocali((l) => ({ ...l, [crimeKey]: prima }));
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6" data-tour="mog-reati">
      <p className="text-sm text-muted-foreground">
        Un reato applicabile va poi ricondotto ai processi in cui può essere commesso: finché non lo è, il
        Modello dice che ti riguarda ma non dice dove. Quella lacuna compare nel documento.
      </p>
      {errore && (
        <p className="text-sm text-destructive" role="alert">
          {errore}
        </p>
      )}

      {dati.catalogo.famiglie.map((f) => {
        const reati = dati.catalogo.reati.filter((r) => r.familyKey === f.key);
        if (!reati.length) return null;
        return (
          <section key={f.key} aria-label={f.nome}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{f.nome}</h3>
            <ul className="mt-3 divide-y rounded-xl border">
              {reati.map((r) => {
                const stato = statoDi(r.key);
                const scoperto = stato === "Sì" && !conScenari.has(r.key);
                return (
                  <li key={r.key} className="px-4 py-3" data-reato={r.key}>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{r.key}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{r.titolo}</p>
                        {r.descrizione && <p className="text-[12px] text-muted-foreground">{r.descrizione}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {SI_NO.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => scegli(r.key, stato === v ? null : v)}
                            aria-pressed={stato === v}
                            aria-label={`${r.key}: ${v}`}
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
                              stato === v
                                ? v === "Sì"
                                  ? "border-transparent bg-primary text-primary-foreground"
                                  : "border-transparent bg-muted text-muted-foreground"
                                : "hover:bg-accent",
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    {stato === "No" && (
                      <div className="mt-2 max-w-2xl">
                        <CampoTesto
                          id={`mog-mot-${r.key}`}
                          etichetta="Motivazione dell'esclusione"
                          valore={serverPer.get(r.key)?.motivazione ?? null}
                          multiriga
                          aiuto="Un'esclusione non motivata è un'esclusione che nessuno può verificare"
                          salva={(v) =>
                            setApplicabilitaAction(companyId, dati.modello.id, {
                              crimeKey: r.key,
                              campo: "motivazione",
                              valore: v ?? "",
                            })
                          }
                        />
                      </div>
                    )}
                    {scoperto && (
                      <p className="mt-2 text-[12px] text-destructive">
                        Applicabile ma non ricondotto a nessun processo: è la lacuna che l&apos;art. 6 comma 2
                        lettera a) chiede di colmare.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
