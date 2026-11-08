import Link from "next/link";
import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { cn } from "@/lib/utils";
import { AZIENDA_ESEMPIO, CODICE_ESEMPIO, STATI_ESEMPIO } from "./apertura-dati";

// IL FASCICOLO DELL'AZIENDA, nell'apertura della home: «un posto solo» mostrato, non detto.
//
// È il fascicolo che il prodotto mostra davvero (`/aziende/[id]`), con i percorsi raggruppati
// come nel registro e i tre stati del sistema visivo: pieno pubblicato, tenue in corso,
// tratteggiato da avviare (DESIGN.md, «I tre stati»). Le classi dei colori vengono dal
// registro dei moduli e non si scrivono qui: due superfici della stessa materia non possono
// divergere per una svista di copia.
//
// I percorsi, i gruppi, i nomi e le icone sono quelli veri; gli stati sono quelli
// dell'azienda d'esempio.

const ETICHETTA = { pubblicato: "pubblicato", "in-corso": "in corso", "da-avviare": "da avviare" } as const;

export function FascicoloVetrina() {
  const pubblicati = Object.values(STATI_ESEMPIO).filter((s) => s.stato === "pubblicato").length;
  return (
    <figure className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-foreground/10">
      <figcaption className="flex items-start justify-between gap-4 border-b px-5 py-3.5">
        <div>
          <p className="text-[14px] font-semibold leading-tight">{AZIENDA_ESEMPIO.nome}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Fascicolo dell&apos;azienda · ATECO {AZIENDA_ESEMPIO.ateco}
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-muted-foreground">
          {pubblicati} documenti pubblicati
        </p>
      </figcaption>

      <div className="divide-y">
        {MODULI_PER_AREA.map((gruppo, g) => {
          const avviati = gruppo.moduli.filter((m) => STATI_ESEMPIO[m.href].stato !== "da-avviare").length;
          return (
            <div key={gruppo.area} className="px-5 py-2.5">
              <p className="flex items-center gap-2 text-[11.5px] font-semibold text-foreground">
                <span className={cn("size-2 rounded-full", gruppo.colore.tratto)} aria-hidden />
                {gruppo.nome}
                <span className="font-normal tabular-nums text-muted-foreground">
                  {avviati} di {gruppo.moduli.length} avviati
                </span>
              </p>
              <ul className="mt-1">
                {gruppo.moduli.map((m, i) => {
                  const s = STATI_ESEMPIO[m.href];
                  const Icona = m.icona;
                  return (
                    <li
                      key={m.href}
                      className="casella-entra flex items-center gap-2.5 py-px"
                      style={{ animationDelay: `${120 + (g * 5 + i) * 45}ms` }}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-[5px] border",
                          s.stato === "pubblicato" && cn("border-transparent", m.colore.pieno),
                          s.stato === "in-corso" && m.colore.tenue,
                          s.stato === "da-avviare" && "border-dashed border-border text-muted-foreground/60",
                        )}
                        aria-hidden
                      >
                        <Icona className="size-[11px]" />
                      </span>
                      <span className={cn("min-w-0 flex-1 text-[12px] leading-snug sm:truncate", s.stato === "da-avviare" && "text-muted-foreground")}>
                        {m.nome}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {s.stato === "pubblicato" ? `v${s.versione} ${ETICHETTA[s.stato]}` : ETICHETTA[s.stato]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-muted/40 px-5 py-3 text-[12px]">
        <span className="text-muted-foreground">
          Ultimo pubblicato: Inventario GHG 2025, v{STATI_ESEMPIO.ghg.stato === "pubblicato" ? STATI_ESEMPIO.ghg.versione : 1}
        </span>
        {CODICE_ESEMPIO ? (
          <Link
            href={`/verifica?codice=${CODICE_ESEMPIO}`}
            className="font-mono text-[11.5px] font-medium text-primary underline-offset-4 hover:underline"
          >
            {CODICE_ESEMPIO} · verifica
          </Link>
        ) : (
          <Link href="/verifica" className="text-[12px] font-medium text-primary underline-offset-4 hover:underline">
            Codice verificabile · come funziona
          </Link>
        )}
      </div>
    </figure>
  );
}
