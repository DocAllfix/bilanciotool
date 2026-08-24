"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { SezioneCorpus, type DatiCorpus, type VistaCorpus } from "@/components/corpus/sezione-corpus";
import { VistaQuadro } from "./vista-quadro";
import { VistaSistema } from "./vista-sistema";
import { VistaRequisiti } from "./vista-requisiti";
import { VistaIndicatori } from "./vista-indicatori";
import { COLONNE_CALCOLATE_QAS } from "./colonne-calcolate";
import type { DatiSgiQas } from "./types";

// Il sistema integrato è un fascicolo che si consulta: quattro viste di lavoro, le tre
// del corpus e i documenti.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "sistema", n: "Sistema" },
  { k: "requisiti", n: "Requisiti" },
  { k: "indicatori", n: "Indicatori" },
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

const VISTE_CORPUS: readonly string[] = ["procedure", "moduli", "registri"];

export function SgiQasShell({
  companyId,
  dati,
  vistaIniziale,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiSgiQas;
  vistaIniziale: string;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/sgiqas?vista=${v}`, { scroll: false });

  const k = dati.conformita;
  const contatore: Record<string, string | null> = {
    quadro: k.indice === null ? null : `${k.indice}%`,
    sistema: `${dati.sistema.norme.length}/3`,
    requisiti: `${k.valutati}/${k.totale}`,
    indicatori: dati.indicatori.length ? String(dati.indicatori.length) : null,
    procedure: `${contatoriCorpus.approvate}/${contatoriCorpus.procedure}`,
    moduli: String(contatoriCorpus.moduli),
    registri: corpus.registri.length ? String(corpus.registri.reduce((a, r) => a + r.righe, 0)) : null,
    documenti: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Sistema di gestione integrato · {k.perNorma.map((n) => n.norma.norma).join(" · ")}
          </p>
          <h1 className="truncate font-display text-2xl font-semibold">{dati.azienda.nome}</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {k.indice === null ? "Nessun requisito valutato" : `Conformità ${k.indice}%`}
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`qas-vista-${v.k}`}
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
        {vista === "sistema" && <VistaSistema companyId={companyId} dati={dati} />}
        {vista === "requisiti" && <VistaRequisiti companyId={companyId} dati={dati} />}
        {vista === "indicatori" && <VistaIndicatori companyId={companyId} dati={dati} />}
        {VISTE_CORPUS.includes(vista) && (
          <SezioneCorpus
            calcolata={COLONNE_CALCOLATE_QAS}
            companyId={companyId}
            contentSetId={dati.sistema.contentSetId}
            vista={vista as VistaCorpus}
            rotta={`/aziende/${companyId}/sgiqas`}
            dati={corpus}
          />
        )}
        {vista === "documenti" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Il <strong>Riesame di direzione</strong> è ciò che un auditor chiede per primo. Riferisce
              all&apos;alta direzione su conformità, prestazioni e ciò che resta aperto — lacune comprese,
              perché un riesame che elencasse solo ciò che funziona sarebbe un&apos;autoassoluzione.
            </p>
            <p className="text-sm text-muted-foreground">
              Pubblicare congela anche il <strong>perimetro delle norme</strong>: se domani se ne aggiunge una,
              gli indici cambiano, e chi ha ricevuto il documento ha in mano il giudizio su un altro sistema.
            </p>
            <PannelloPubblicazione
              companyId={companyId}
              tipo="riesame_qas"
              anno={SENZA_ESERCIZIO}
              readyPct={k.indice ?? 0}
            />

            {/* ⚠️ Gli altri due NON sono allegati del Riesame: sono documenti FIRMATI —
                dal datore di lavoro, dall'RSPP, dal medico competente — che un ente di
                certificazione e un organo di vigilanza guardano per proprio conto. Il
                modulo ne produceva uno su tre. */}
            <div className="border-t pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                I due documenti firmati
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Escono dai registri <strong>Aspetti ambientali</strong> e{" "}
                <strong>Pericoli e valutazione dei rischi</strong>, col giudizio calcolato dalle stesse
                funzioni che vedi nella colonna del registro. Le voci <strong>non ancora valutate</strong>{" "}
                ci finiscono dentro dichiarate come tali: un aspetto non misurato non è un aspetto
                trascurabile, e in un documento che qualcuno firma tacerlo sarebbe la dichiarazione
                sbagliata.
              </p>
              <div className="mt-4 space-y-4">
                <PannelloPubblicazione
                  companyId={companyId}
                  tipo="analisi_ambientale"
                  anno={SENZA_ESERCIZIO}
                  readyPct={k.indice ?? 0}
                />
                <PannelloPubblicazione
                  companyId={companyId}
                  tipo="valutazione_ssl"
                  anno={SENZA_ESERCIZIO}
                  readyPct={k.indice ?? 0}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
