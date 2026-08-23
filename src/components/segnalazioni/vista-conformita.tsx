"use client";

import { useState } from "react";
import { setCampoRequisitoAction } from "@/features/segnalazioni/actions";
import { STATI_REQUISITO } from "@/features/segnalazioni/validation";
import type { DatiSegnalazioni } from "./types";

// La mappa di conformità: 82 requisiti, ciascuno ancorato a un articolo del decreto.
//
// ⚠️ Un requisito applicabile e non valutato pesa ZERO, non viene ignorato. Mediare sui
// soli valutati farebbe salire l'indice man mano che si saltano i requisiti difficili:
// il contrario del vero. «Non applicabile» invece esce dal denominatore, ed è un'altra
// cosa — è una valutazione, non un'omissione.

const COLORE_STATO: Record<string, string> = {
  Conforme: "var(--success)",
  "Parzialmente conforme": "var(--warning)",
  "Non conforme": "var(--destructive)",
  "Non applicabile": "var(--muted-foreground)",
};

export function VistaConformita({ companyId, dati }: { companyId: string; dati: DatiSegnalazioni }) {
  const [capoAperto, setCapoAperto] = useState<string | null>(dati.capi[0]?.key ?? null);
  const perChiave = new Map(dati.stati.map((s) => [s.requirementKey, s]));

  return (
    <div className="space-y-6" data-tour="wb-conformita">
      <p className="text-sm text-muted-foreground">
        Valutati <strong>{dati.conformita.valutati}</strong> requisiti su {dati.conformita.totale}. Un requisito
        dovuto e non ancora valutato pesa zero: la percentuale dice quanto del sistema è attuato, non quanto è
        stato guardato.
      </p>

      <ul className="divide-y rounded-xl border">
        {dati.conformita.perCapitolo.map((c) => {
          const aperto = capoAperto === c.capitolo.key;
          const suoi = dati.requisiti.filter((r) => r.chapterKey === c.capitolo.key);
          return (
            <li key={c.capitolo.key}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setCapoAperto(aperto ? null : c.capitolo.key)}
                aria-expanded={aperto}
              >
                <span className="w-6 font-mono text-sm font-semibold">{c.capitolo.key}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{c.capitolo.nome}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {c.capitolo.descrizione}
                  </span>
                </span>
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
                      systemId={dati.assetto.id}
                      chiave={r.key}
                      riferimento={r.riferimento}
                      testo={r.testo}
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
  procedura,
  stato,
}: {
  companyId: string;
  systemId: string;
  chiave: string;
  riferimento: string;
  testo: string;
  procedura: string | null;
  stato: string | null;
}) {
  // Comando ottimistico: la scelta si vede subito, e torna indietro se il server rifiuta.
  const [scelto, setScelto] = useState<string | null>(stato);
  const [errore, setErrore] = useState<string | null>(null);

  async function scegli(v: string | null) {
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
        <span className="w-14 shrink-0 font-mono text-[12px] text-muted-foreground">{chiave}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">{testo}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {riferimento}
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
                  ? { background: COLORE_STATO[s], color: "white", borderColor: COLORE_STATO[s] }
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
