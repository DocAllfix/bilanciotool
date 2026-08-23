"use client";

import { useState } from "react";
import { setCampoRequisitoAction } from "@/features/sgiqas/actions";
import { STATI_REQUISITO } from "@/features/sgiqas/validation";
import { COLORE_CONFORMITA, NOME_NORMA, type DatiSgiQas } from "./types";

// I 107 requisiti, per capitolo, filtrabili per norma.
//
// ⚠️ Si vedono SOLO quelli nel perimetro. Chiedere a un'azienda certificata solo ISO 9001
// di scorrere cinquanta requisiti che non la riguardano è il modo più rapido per farle
// abbandonare il percorso — e l'indice calcolato su tutti e 107 le mostrerebbe una
// percentuale che non significa niente per lei.

export function VistaRequisiti({ companyId, dati }: { companyId: string; dati: DatiSgiQas }) {
  const [filtro, setFiltro] = useState<string>("");
  const [capoAperto, setCapoAperto] = useState<string | null>(dati.capi[0]?.key ?? null);
  const perChiave = new Map(dati.stati.map((s) => [s.requirementKey, s]));

  const visibili = dati.inPerimetro.filter((r) => !filtro || r.norme.includes(filtro));

  return (
    <div className="space-y-5" data-tour="qas-requisiti">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Valutati <strong>{dati.conformita.valutati}</strong> requisiti su {dati.conformita.totale} nel
          perimetro. Un requisito dovuto e non valutato pesa zero.
        </p>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra per norma">
          <button
            className="rounded-md border px-2.5 py-1 text-[12px]"
            aria-pressed={filtro === ""}
            style={filtro === "" ? { background: "var(--area-sistemi)", color: "white" } : undefined}
            onClick={() => setFiltro("")}
          >
            Tutte
          </button>
          {dati.norme
            .filter((n) => dati.sistema.norme.includes(n.key))
            .map((n) => (
              <button
                key={n.key}
                className="rounded-md border px-2.5 py-1 text-[12px]"
                aria-pressed={filtro === n.key}
                aria-label={`Filtra: ${n.norma}`}
                style={filtro === n.key ? { background: "var(--area-sistemi)", color: "white" } : undefined}
                onClick={() => setFiltro(n.key)}
              >
                {n.norma}
              </button>
            ))}
        </div>
      </div>

      <ul className="divide-y rounded-xl border">
        {dati.conformita.perCapitolo.map((c) => {
          const suoi = visibili.filter((r) => r.chapterKey === c.capitolo.key);
          if (!suoi.length) return null;
          const aperto = capoAperto === c.capitolo.key;
          return (
            <li key={c.capitolo.key}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setCapoAperto(aperto ? null : c.capitolo.key)}
                aria-expanded={aperto}
              >
                <span className="w-6 font-mono text-sm font-semibold">{c.capitolo.key}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.capitolo.nome}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {c.valutati}/{c.requisiti}
                </span>
                <span className="w-24 shrink-0">
                  <span className="block h-1.5 rounded-full bg-muted">
                    <span
                      className="block h-1.5 rounded-full"
                      style={{
                        width: `${c.indice}%`,
                        background:
                          c.indice > 79 ? "var(--success)" : c.indice > 39 ? "var(--warning)" : "var(--destructive)",
                      }}
                    />
                  </span>
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                  {c.indice}%
                </span>
              </button>

              {aperto && (
                <ul className="divide-y border-t bg-muted/30">
                  {suoi.map((r) => (
                    <Requisito
                      key={r.key}
                      companyId={companyId}
                      systemId={dati.sistema.id}
                      chiave={r.key}
                      riferimento={r.riferimento}
                      testo={r.testo}
                      norme={r.norme}
                      procedura={r.procedura}
                      stato={perChiave.get(r.key)?.stato ?? null}
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

function Requisito({
  companyId,
  systemId,
  chiave,
  riferimento,
  testo,
  norme,
  procedura,
  stato,
}: {
  companyId: string;
  systemId: string;
  chiave: string;
  riferimento: string;
  testo: string;
  norme: string[];
  procedura: string | null;
  stato: string | null;
}) {
  const [scelto, setScelto] = useState<string | null>(stato);
  const [errore, setErrore] = useState<string | null>(null);

  async function scegli(v: string) {
    const precedente = scelto;
    const nuovo = v === scelto ? null : v; // ripremere annulla
    setScelto(nuovo);
    setErrore(null);
    const esito = await setCampoRequisitoAction(companyId, systemId, {
      requirementKey: chiave,
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
        <span className="w-14 shrink-0 font-mono text-[12px] text-muted-foreground">{riferimento}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">{testo}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {norme.map((n) => NOME_NORMA[n] ?? n).join(" · ")}
            {procedura ? ` · ${procedura}` : ""}
          </p>
          {errore && (
            <p className="mt-1 text-[12px] text-destructive" role="alert">
              {errore}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {STATI_REQUISITO.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scelto === s}
              aria-label={`${chiave}: ${s}`}
              onClick={() => scegli(s)}
              className="rounded-md border px-2 py-1 text-[11px]"
              style={
                scelto === s
                  ? { background: COLORE_CONFORMITA[s], color: "white", borderColor: COLORE_CONFORMITA[s] }
                  : undefined
              }
            >
              {s === "Parzialmente conforme" ? "Parziale" : s === "Non applicabile" ? "N/A" : s}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}
