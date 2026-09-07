"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { SezioneCorpus, type DatiCorpus } from "@/components/corpus/sezione-corpus";
import { VistaQuadro } from "./vista-quadro";
import { VistaAmbito } from "./vista-ambito";
import { VistaRequisiti } from "./vista-requisiti";
import type { DatiNis2 } from "./types";

// L'autovalutazione e' un FASCICOLO che si consulta, non uno stepper: l'ambito si riapre
// quando arriva un dato nuovo, e la verifica si riprende dove si era lasciata. Uno stepper
// che pretendesse l'ordine costringerebbe a barare per proseguire.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "ambito", n: "Ambito e assetto" },
  { k: "requisiti", n: "Verifica" },
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

export function Nis2Shell({
  companyId,
  dati,
  vistaIniziale,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiNis2;
  vistaIniziale: string;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/nis2?vista=${v}`, { scroll: false });

  const k = dati.conformita;
  const contatore: Record<string, string | null> = {
    quadro: k ? `${k.percentuale}%` : null,
    ambito: dati.ambito?.classe ? "definito" : null,
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
            Verifica del livello di conformità · D.Lgs. 138/2024 (NIS2)
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
            {dati.azienda.nome}
          </h1>
        </div>
        {/* ⚠️ Il rimando all'altro percorso sta QUI e non in fondo: chi apre
            l'autovalutazione e scopre di essere «essenziale» ha bisogno di sapere subito
            che il sistema di gestione esiste, e che le risposte che sta dando valgono
            anche là. Senza, le darebbe due volte. */}
        <Link
          href={`/aziende/${companyId}/sgnis2`}
          className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          data-tour="nis2-ponte"
        >
          Le stesse risposte valgono nel Sistema di gestione NIS2 →
        </Link>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`nis2-vista-${v.k}`}
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

      {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
      {vista === "ambito" && <VistaAmbito companyId={companyId} dati={dati} />}
      {vista === "requisiti" && <VistaRequisiti companyId={companyId} dati={dati} />}
      {(vista === "procedure" || vista === "moduli" || vista === "registri") && (
        <SezioneCorpus
          companyId={companyId}
          contentSetId={dati.profilo!.contentSetId}
          vista={vista}
          rotta={`/aziende/${companyId}/nis2`}
          dati={corpus}
        />
      )}
      {vista === "documenti" && (
        <div className="mt-6">
          {/* ⚠️ `readyPct` e' la percentuale di ISTRUTTORIA, non di conformita': dice
              quanto e' stato guardato, che e' la domanda giusta prima di pubblicare. Un
              documento con la conformita' al 90% ma metà dei requisiti mai valutati non e'
              pronto, ed e' esattamente il caso che questo numero deve far vedere. */}
          <PannelloPubblicazione
            companyId={companyId}
            tipo="conformita_nis2"
            anno={SENZA_ESERCIZIO}
            readyPct={k && k.applicabili ? Math.round((k.valutati / k.applicabili) * 100) : 0}
          />
        </div>
      )}
    </div>
  );
}
