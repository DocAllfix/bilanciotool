"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { VistaQuadro } from "./vista-quadro";
import { VistaQuestionario } from "./vista-questionario";
import { VistaPiano } from "./vista-piano";
import { VistaAnagrafica } from "./vista-anagrafica";
import { VistaDocumenti } from "./vista-documenti";
import { COLORE_FASCIA, type AziendaSupplier, type CatalogoSupplier, type EsitoSupplier, type StatoSupplier, type Valutazione } from "./types";

// L'autovalutazione non è un percorso a passi ma un fascicolo che si consulta:
// non c'è un ordine obbligato, si va dove serve. Per questo sei viste e non uno
// stepper come negli altri tre moduli.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "questionario", n: "Questionario" },
  { k: "piano", n: "Piano" },
  { k: "documenti", n: "Evidenze" },
  { k: "anagrafica", n: "Anagrafica" },
  { k: "attestato", n: "Attestato" },
] as const;

export function SupplierShell(props: {
  companyId: string;
  azienda: AziendaSupplier;
  valutazione: Valutazione;
  catalogo: CatalogoSupplier;
  stato: StatoSupplier;
  esito: EsitoSupplier;
  vistaIniziale: string;
  /** Le proposte dal programma di due diligence di filiera della stessa azienda. */
  suggerimenti?: { chiave: string; risposta: "si" | "parziale" | "no"; motivo: string }[];
}) {
  const { companyId, azienda, valutazione, catalogo, stato, esito, suggerimenti } = props;
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === props.vistaIniziale) ? props.vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/fornitore?vista=${v}`, { scroll: false });
  const propsVista = { companyId, valutazione, catalogo, stato, esito };

  const contatore: Record<string, string | null> = {
    questionario: `${esito.valutate}/${catalogo.domande.length}`,
    piano: stato.piano.length ? String(stato.piano.length) : null,
    documenti: `${stato.documentiDisponibili}/${catalogo.domande.length}`,
    quadro: null,
    anagrafica: `${stato.profiloCompilati}/${stato.profiloAttesi}`,
    attestato: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Portafoglio</Link> · Autovalutazione ESG fornitore
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ESRS · GRI · ISO 20400 · indice {esito.indice} su soglia {valutazione.sogliaRichiesta}
          </p>
        </div>
        <Badge style={{ background: COLORE_FASCIA[esito.fascia.key], color: "white" }} data-slot="kpi">
          {esito.fascia.nome}
        </Badge>
      </div>

      <nav aria-label="Viste dell'autovalutazione" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {VISTE.map((v) => (
            <li key={v.k}>
              <button
                type="button"
                onClick={() => vai(v.k)}
                aria-current={vista === v.k ? "page" : undefined}
                data-tour={`sup-vista-${v.k}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  vista === v.k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {v.n}
                {contatore[v.k] && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                      vista === v.k ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                    data-slot="kpi"
                  >
                    {contatore[v.k]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6">
        {vista === "quadro" && <VistaQuadro {...propsVista} vai={vai} />}
        {vista === "questionario" && <VistaQuestionario {...propsVista} suggerimenti={suggerimenti} />}
        {vista === "piano" && <VistaPiano {...propsVista} />}
        {vista === "documenti" && <VistaDocumenti {...propsVista} />}
        {vista === "anagrafica" && <VistaAnagrafica azienda={azienda} valutazione={valutazione} />}
        {vista === "attestato" && (
          <PannelloPubblicazione
            companyId={companyId}
            tipo="attestato"
            anno={SENZA_ESERCIZIO}
            readyPct={esito.pctCompletamento}
          />
        )}
      </div>
    </div>
  );
}
