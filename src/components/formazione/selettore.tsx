"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";
import { cn } from "@/lib/utils";

/**
 * Il selettore dei corsi, dentro un corso.
 *
 * ⚠️ RAGGRUPPATO PER AREA, non dodici pastiglie in fila. Dodici voci uguali una accanto
 * all'altra sono la «griglia di card identiche» che l'anti-reference di PRODUCT.md vieta,
 * e soprattutto non si cerca dentro: l'occhio non ha appigli. Con i tre gruppi si trova
 * per materia, che è il modo in cui il consulente pensa i suoi servizi.
 *
 * ⚠️ E NON È UNA SECONDA NAVIGAZIONE. Il colore è quello dell'area, gli stessi tre del
 * resto del prodotto, e il percorso su cui sei è marcato: serve a spostarsi fra corsi
 * mentre si legge, non a rifare l'indice — quello c'è già ed è una pagina.
 *
 * Deriva da `MODULI_PER_AREA`, quindi un percorso nuovo compare da solo e non può restare
 * fuori per dimenticanza.
 */
export function SelettoreCorsi({ corrente }: { corrente: ModuloAzienda }) {
  const [aperto, setAperto] = useState(false);
  const attuale = MODULI_PER_AREA.flatMap((g) => g.moduli).find((m) => m.href === corrente);

  return (
    <nav aria-label="Gli altri corsi" data-selettore-corsi="" className="mt-5">
      {/* Su schermo stretto il selettore è un comando che apre l'elenco: dodici voci
          sempre aperte sopra il testo sarebbero mezzo schermo di navigazione prima di
          una riga di contenuto. */}
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        className="tocco-comodo flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-[13px] md:hidden"
      >
        <span className="truncate text-muted-foreground">
          Corso di <span className="font-medium text-foreground">{attuale?.nome}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", aperto && "rotate-180")} aria-hidden />
      </button>

      <div className={cn("mt-2 space-y-2.5 md:mt-0 md:block", aperto ? "block" : "hidden")}>
        {MODULI_PER_AREA.map((g) => (
          <div key={g.area} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", g.colore.tratto)} aria-hidden />
              {g.breve}
            </span>
            {g.moduli.map((m) => {
              const qui = m.href === corrente;
              return (
                <Link
                  key={m.href}
                  href={`/formazione/${m.href}`}
                  aria-current={qui ? "page" : undefined}
                  data-corso-scelta={m.href}
                  className={cn(
                    "tocco-comodo rounded-md px-2 py-1 text-[12.5px] transition-colors",
                    qui
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {m.nome}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
