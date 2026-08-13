"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { VistaQuadro } from "./vista-quadro";
import { VistaContesto } from "./vista-contesto";
import { VistaControlli } from "./vista-controlli";
import { VistaVerifiche } from "./vista-verifiche";
import { VistaPiano } from "./vista-piano";
import { COLORE_FASCIA, type AziendaSoa, type CatalogoSoa, type Dichiarazione, type EsitoSoa, type StatoSoa } from "./types";

// La Dichiarazione di Applicabilità è un registro che si consulta, non un
// percorso a passi: cinque viste di lavoro più il documento.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "contesto", n: "Contesto e ambito" },
  { k: "controlli", n: "Controlli" },
  { k: "verifiche", n: "Verifiche" },
  { k: "piano", n: "Piano" },
  { k: "documento", n: "Dichiarazione" },
] as const;

export function SoaShell(props: {
  companyId: string;
  azienda: AziendaSoa;
  dichiarazione: Dichiarazione;
  catalogo: CatalogoSoa;
  stato: StatoSoa;
  esito: EsitoSoa;
  vistaIniziale: string;
}) {
  const { companyId, azienda, dichiarazione, catalogo, stato, esito } = props;
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === props.vistaIniziale) ? props.vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/soa?vista=${v}`, { scroll: false });
  const propsVista = { companyId, dichiarazione, catalogo, stato, esito };

  const contatore: Record<string, string | null> = {
    quadro: null,
    contesto: `${stato.profiloCompilati}/${stato.profiloAttesi}`,
    controlli: `${esito.conStato}/${esito.applicabili}`,
    verifiche: esito.rilieviAperti ? String(esito.rilieviAperti) : null,
    piano: stato.piano.length ? String(stato.piano.length) : null,
    documento: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Portafoglio</Link> · Statement of Applicability
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ISO/IEC 27001:2022 §6.1.3 d) · {esito.totale} controlli in ambito · indice {esito.indice}
          </p>
        </div>
        <Badge style={{ background: COLORE_FASCIA[esito.fascia.key], color: "white" }} data-slot="kpi">
          {esito.fascia.nome}
        </Badge>
      </div>

      <nav aria-label="Viste della Dichiarazione" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {VISTE.map((v) => (
            <li key={v.k}>
              <button
                type="button"
                onClick={() => vai(v.k)}
                aria-current={vista === v.k ? "page" : undefined}
                data-tour={`soa-vista-${v.k}`}
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
        {vista === "contesto" && <VistaContesto {...propsVista} azienda={azienda} />}
        {vista === "controlli" && <VistaControlli {...propsVista} />}
        {vista === "verifiche" && <VistaVerifiche {...propsVista} vai={vai} />}
        {vista === "piano" && <VistaPiano {...propsVista} />}
        {vista === "documento" && (
          <PannelloPubblicazione
            companyId={companyId}
            tipo="soa"
            anno={SENZA_ESERCIZIO}
            readyPct={esito.pctCompletamento}
          />
        )}
      </div>
    </div>
  );
}
