"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { VistaQuadro } from "./vista-quadro";
import { VistaEnte } from "./vista-ente";
import { VistaProcessi } from "./vista-processi";
import { VistaReati } from "./vista-reati";
import { VistaPresidi } from "./vista-presidi";
import { COLORE_LIVELLO, type DatiMog231 } from "./types";

// Il Modello 231 è un fascicolo che si consulta: cinque viste di lavoro più i
// documenti. La vista sta nell'indirizzo, quindi si manda a un collega e sopravvive al
// tasto indietro.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "ente", n: "Ente e governance" },
  { k: "reati", n: "Reati presupposto" },
  { k: "processi", n: "Processi e rischi" },
  { k: "presidi", n: "Presidi" },
  { k: "documenti", n: "Documenti" },
] as const;

export function Mog231Shell({
  companyId,
  dati,
  vistaIniziale,
}: {
  companyId: string;
  dati: DatiMog231;
  vistaIniziale: string;
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/mog231?vista=${v}`, { scroll: false });

  const k = dati.indicatori;
  const contatore: Record<string, string | null> = {
    quadro: null,
    ente: null,
    reati: `${k.reatiApplicabili}/${dati.catalogo.reati.length}`,
    processi: k.processi ? String(k.processi) : null,
    presidi: `${k.requisitiValutati}/${k.requisitiTotali}`,
    documenti: null,
  };

  // Il livello più alto fra i processi: è l'informazione che si cerca per prima, e non
  // dipende dalla vista aperta.
  const peggiore = ["Critico", "Alto", "Medio", "Basso"].find((l) => dati.processi.some((p) => p.livello === l));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">
              Portafoglio
            </Link>{" "}
            ·{" "}
            <Link href={`/aziende/${companyId}`} className="hover:underline">
              Fascicolo
            </Link>{" "}
            · Modello 231
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            D.Lgs. 231/2001 · {k.processi} processi · {k.scenari} scenari
            {dati.idoneita !== null ? ` · idoneità ${dati.idoneita}%` : ""}
          </p>
        </div>
        {peggiore && (
          <Badge style={{ background: COLORE_LIVELLO[peggiore], color: "white" }} data-slot="kpi">
            Rischio massimo: {peggiore}
          </Badge>
        )}
      </div>

      <nav aria-label="Viste del Modello 231" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {VISTE.map((v) => (
            <li key={v.k}>
              <button
                type="button"
                onClick={() => vai(v.k)}
                aria-current={vista === v.k ? "page" : undefined}
                data-tour={`mog-vista-${v.k}`}
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
        {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
        {vista === "ente" && <VistaEnte companyId={companyId} dati={dati} />}
        {vista === "reati" && <VistaReati companyId={companyId} dati={dati} />}
        {vista === "processi" && <VistaProcessi companyId={companyId} dati={dati} />}
        {vista === "presidi" && <VistaPresidi companyId={companyId} dati={dati} />}
        {vista === "documenti" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Due documenti, con destinatari diversi. La <strong>Matrice reati-processi</strong> è ciò che un
              giudice guarda per primo: dice quali reati riguardano l&apos;ente e in quali attività possono
              essere commessi. La <strong>Relazione dell&apos;OdV</strong> va all&apos;organo amministrativo,
              che su quella delibera. Entrambe riportano anche le lacune — i reati applicabili senza processo e
              gli scenari non valutati — perché tacerle renderebbe i documenti un&apos;autoassoluzione.
            </p>
            <PannelloPubblicazione
              companyId={companyId}
              tipo="matrice_231"
              anno={SENZA_ESERCIZIO}
              readyPct={k.scenari ? Math.round(((k.scenari - k.nonValutati) / k.scenari) * 100) : 0}
            />
            <PannelloPubblicazione
              companyId={companyId}
              tipo="relazione_odv"
              anno={SENZA_ESERCIZIO}
              readyPct={dati.idoneita ?? 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
