"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { SezioneCorpus, type DatiCorpus, type VistaCorpus } from "@/components/corpus/sezione-corpus";
import { VistaQuadro } from "./vista-quadro";
import { VistaAnagrafica } from "./vista-anagrafica";
import { VistaCriteri } from "./vista-criteri";
import type { DatiSa8000 } from "./types";

// SA8000/2026: quadro, anagrafica, criteri, le tre del corpus e i documenti.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "anagrafica", n: "Anagrafica" },
  { k: "criteri", n: "Criteri" },
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

const VISTE_CORPUS: readonly string[] = ["procedure", "moduli", "registri"];

export function Sa8000Shell({
  companyId,
  dati,
  vistaIniziale,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiSa8000;
  vistaIniziale: string;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/sa8000?vista=${v}`, { scroll: false });

  const d = dati.dettaglio;
  const contatore: Record<string, string | null> = {
    quadro: `${dati.completamento.totale}%`,
    anagrafica: `${d.anagraficaCompilati}/${d.anagraficaTotale}`,
    criteri: `${d.criteriValutati}/${d.criteriTotali}`,
    procedure: `${contatoriCorpus.approvate}/${contatoriCorpus.procedure}`,
    moduli: String(contatoriCorpus.moduli),
    registri: corpus.registri.length ? String(corpus.registri.reduce((a, r) => a + r.righe, 0)) : null,
    documenti: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Sistema di gestione della responsabilità sociale · SA8000:2026</p>
          <h1 className="truncate font-display text-2xl font-semibold">{dati.azienda.nome}</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Completamento {dati.completamento.totale}%
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`sa-vista-${v.k}`}
            aria-current={vista === v.k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              vista === v.k
                ? "border-area-sistemi font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.n}
            {contatore[v.k] && (
              <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {contatore[v.k]}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
        {vista === "anagrafica" && <VistaAnagrafica companyId={companyId} dati={dati} />}
        {vista === "criteri" && <VistaCriteri companyId={companyId} dati={dati} />}
        {VISTE_CORPUS.includes(vista) && (
          <SezioneCorpus
            companyId={companyId}
            contentSetId={dati.sistema.contentSetId}
            vista={vista as VistaCorpus}
            rotta={`/aziende/${companyId}/sa8000`}
            dati={corpus}
          />
        )}
        {vista === "documenti" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Il <strong>Manuale del sistema</strong> è ciò che si esibisce in audit di certificazione. Riporta
              i criteri <strong>non attuati</strong> insieme a quelli attuati: un manuale che elencasse solo
              ciò che funziona sarebbe inutile a chi verifica, e dannoso all&apos;azienda — un rilievo trovato
              dall&apos;ente pesa più di uno dichiarato.
            </p>
            <PannelloPubblicazione
              companyId={companyId}
              tipo="manuale_sa8000"
              anno={SENZA_ESERCIZIO}
              readyPct={dati.completamento.totale}
            />
          </div>
        )}
      </div>
    </div>
  );
}
