"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { SezioneCorpus, type DatiCorpus } from "@/components/corpus/sezione-corpus";
import { VistaControlli } from "./vista-controlli";
import { VistaRoadmap } from "./vista-roadmap";
import { VistaIndicatori } from "./vista-indicatori";
import { VistaQuadro } from "./vista-quadro";
import { VistaRequisiti } from "./vista-requisiti";
import type { DatiNis2, DatiSgNis2 } from "./types";

// Il sistema di gestione: un fascicolo con quattro viste proprie in più.
//
// ⚠️ La VERIFICA e' la stessa dell'autovalutazione — stessa tabella, stesse risposte — e la
// schermata lo dichiara. Copiare i temi qui «così il consulente li vede senza cambiare
// pagina» sarebbe la tentazione, ed e' il difetto che il metodo ESG ha gia' scritto nel
// codice per non ripercorrerlo: un dato in due posti e' un dato in nessun posto.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "roadmap", n: "Roadmap" },
  { k: "controlli", n: "Controlli" },
  { k: "indicatori", n: "Indicatori" },
  { k: "requisiti", n: "Verifica" },
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

export function SgNis2Shell({
  companyId,
  dati,
  quadro,
  vistaIniziale,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiSgNis2;
  quadro: DatiNis2;
  vistaIniziale: string;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/sgnis2?vista=${v}`, { scroll: false });

  const k = quadro.conformita;
  const daVerificare = dati.controlli.filter((c) => c.effettivo === "da_verificare").length;

  const contatore: Record<string, string | null> = {
    quadro: `${dati.attuazione}%`,
    roadmap: dati.roadmap.giorni.notifica != null ? `${dati.roadmap.giorni.notifica} gg` : null,
    controlli: `${dati.attuazione}%`,
    indicatori: dati.indicatori.length ? String(dati.indicatori.length) : null,
    requisiti: k ? `${k.valutati}/${k.applicabili}` : null,
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
            Sistema di gestione per la sicurezza informatica · D.Lgs. 138/2024 (NIS2)
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
            {dati.azienda.nome}
          </h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Attuazione {dati.attuazione}%
          {daVerificare > 0 && ` · ${daVerificare} da verificare`}
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`sgnis2-vista-${v.k}`}
            aria-current={vista === v.k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              vista === v.k
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.n}
            {contatore[v.k] && (
              <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">
                {contatore[v.k]}
              </span>
            )}
          </button>
        ))}
      </nav>

      {vista === "quadro" && <VistaQuadro dati={quadro} vai={(v) => vai(v === "ambito" ? "roadmap" : v)} />}
      {vista === "roadmap" && <VistaRoadmap companyId={companyId} dati={dati} />}
      {vista === "controlli" && <VistaControlli companyId={companyId} dati={dati} />}
      {vista === "indicatori" && <VistaIndicatori companyId={companyId} dati={dati} />}
      {vista === "requisiti" && (
        <>
          {/* ⚠️ Detto a chiare lettere, e non in fondo: chi valuta qui sta valutando anche
              là. Senza, un consulente che ha gia' compilato l'autovalutazione rifarebbe il
              lavoro, o peggio darebbe due risposte diverse credendo di lavorare su due
              cose. La riga costa una frase; il malinteso costa una giornata. */}
          <div className="mt-6 rounded-md border border-dashed p-3">
            <p className="text-sm text-muted-foreground">
              Queste sono <b className="text-foreground">le stesse risposte</b> dell&apos;
              <Link
                href={`/aziende/${companyId}/nis2`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Autovalutazione conformità NIS2
              </Link>
              : modificarle qui le modifica anche là. Qui i requisiti sono 126 — due riguardano
              solo il sistema di gestione.
            </p>
          </div>
          <VistaRequisiti companyId={companyId} dati={quadro} />
        </>
      )}
      {(vista === "procedure" || vista === "moduli" || vista === "registri") && (
        <SezioneCorpus
          companyId={companyId}
          contentSetId={dati.sistema!.contentSetId}
          vista={vista}
          rotta={`/aziende/${companyId}/sgnis2`}
          dati={corpus}
        />
      )}
      {vista === "documenti" && (
        <div className="mt-6 space-y-4">
          <PannelloPubblicazione
            companyId={companyId}
            tipo="relazione_nis2"
            anno={SENZA_ESERCIZIO}
            readyPct={dati.attuazione}
          />
          <PannelloPubblicazione
            companyId={companyId}
            tipo="controlli_nis2"
            anno={SENZA_ESERCIZIO}
            readyPct={dati.attuazione}
          />
        </div>
      )}
    </div>
  );
}
