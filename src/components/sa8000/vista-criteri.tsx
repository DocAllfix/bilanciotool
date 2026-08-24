"use client";

import { useState } from "react";
import { setCampoCriterioAction } from "@/features/sa8000/actions";
import { ETICHETTA_CRITERIO, STATI_CRITERIO } from "@/features/sa8000/validation";
import type { DatiSa8000 } from "./types";

// I 112 criteri dello Standard, per gruppo.
//
// ⚠️ I cinque fondazionali stanno INSIEME sotto «F». Nel prototipo il gruppo si ricavava
// dal codice con `split(".")`, e per «F1» dava «F1» — un gruppo che non esiste. I cinque
// finivano in cinque riquadri separati e senza titolo, mentre il gruppo giusto era già
// scritto nel catalogo.

const COLORE: Record<string, string> = {
  ok: "var(--success)",
  parziale: "var(--warning)",
  no: "var(--destructive)",
  na: "var(--muted-foreground)",
};

export function VistaCriteri({ companyId, dati }: { companyId: string; dati: DatiSa8000 }) {
  const [sezione, setSezione] = useState<string>("");
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(dati.gruppi[0]?.key ?? null);
  const perChiave = new Map(dati.stati.map((s) => [s.criterionKey, s]));

  const gruppi = dati.perGruppo.filter((g) => !sezione || g.gruppo.sectionKey === sezione);

  return (
    <div className="space-y-5" data-tour="sa-criteri">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Valutati <strong>{dati.dettaglio.criteriValutati}</strong> criteri su {dati.dettaglio.criteriTotali} ·{" "}
          {dati.dettaglio.criteriAttuati} attuati
        </p>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra per sezione">
          <button
            className="rounded-md border px-2.5 py-1 text-[12px]"
            aria-pressed={sezione === ""}
            style={sezione === "" ? { background: "var(--area-sostenibilita)", color: "white" } : undefined}
            onClick={() => setSezione("")}
          >
            Tutte
          </button>
          {dati.sezioni.map((sz) => (
            <button
              key={sz.key}
              className="rounded-md border px-2.5 py-1 text-[12px]"
              aria-pressed={sezione === sz.key}
              aria-label={`Filtra: ${sz.nome}`}
              style={sezione === sz.key ? { background: "var(--area-sostenibilita)", color: "white" } : undefined}
              onClick={() => setSezione(sz.key)}
            >
              {sz.key} · {sz.nome}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y rounded-xl border">
        {gruppi.map((g) => {
          const aperto = gruppoAperto === g.gruppo.key;
          const suoi = dati.criteri.filter((c) => c.groupKey === g.gruppo.key);
          return (
            <li key={g.gruppo.key}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setGruppoAperto(aperto ? null : g.gruppo.key)}
                aria-expanded={aperto}
              >
                <span className="w-10 font-mono text-sm font-semibold">{g.gruppo.key}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{g.gruppo.nome}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {g.valutati}/{g.criteri}
                </span>
                <span className="w-24 shrink-0">
                  <span className="block h-1.5 rounded-full bg-muted">
                    <span
                      className="block h-1.5 rounded-full"
                      style={{
                        width: `${g.percentuale}%`,
                        background:
                          g.percentuale > 79
                            ? "var(--success)"
                            : g.percentuale > 39
                              ? "var(--warning)"
                              : "var(--destructive)",
                      }}
                    />
                  </span>
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                  {g.percentuale}%
                </span>
              </button>

              {aperto && (
                <ul className="divide-y border-t bg-muted/30">
                  {suoi.map((c) => (
                    <Criterio
                      key={c.key}
                      companyId={companyId}
                      systemId={dati.sistema.id}
                      chiave={c.key}
                      testo={c.testo}
                      procedure={c.procedure}
                      stato={(perChiave.get(c.key)?.stato ?? null) as string | null}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Criterio({
  companyId,
  systemId,
  chiave,
  testo,
  procedure,
  stato,
}: {
  companyId: string;
  systemId: string;
  chiave: string;
  testo: string;
  procedure: string[];
  stato: string | null;
}) {
  const [scelto, setScelto] = useState<string | null>(stato);
  const [errore, setErrore] = useState<string | null>(null);

  async function scegli(v: (typeof STATI_CRITERIO)[number]) {
    const precedente = scelto;
    const nuovo = v === scelto ? null : v; // ripremere annulla
    setScelto(nuovo);
    setErrore(null);
    const esito = await setCampoCriterioAction(companyId, systemId, {
      criterionKey: chiave,
      campo: "stato",
      valore: nuovo,
    });
    if (!esito.ok) {
      setScelto(precedente);
      setErrore(esito.errore);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="w-14 shrink-0 font-mono text-[12px] text-muted-foreground">{chiave}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">{testo}</p>
          {procedure.length > 0 && (
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {procedure.join(" · ")}
              {procedure.length > 1 && <span className="ml-1 font-sans">(due procedure)</span>}
            </p>
          )}
          {errore && (
            <p className="mt-1 text-[12px] text-destructive" role="alert">
              {errore}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {STATI_CRITERIO.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scelto === s}
              aria-label={`${chiave}: ${ETICHETTA_CRITERIO[s]}`}
              onClick={() => scegli(s)}
              className="rounded-md border px-2 py-1 text-[11px]"
              style={scelto === s ? { background: COLORE[s], color: "white", borderColor: COLORE[s] } : undefined}
            >
              {ETICHETTA_CRITERIO[s]}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}
