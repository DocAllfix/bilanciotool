"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * L'indice del corso, che segue la lettura.
 *
 * ⚠️ LA SEZIONE ATTIVA SI OSSERVA, non si calcola dallo scorrimento. Un `scroll` che
 * confronta posizioni a ogni pixel costringe il browser a rimisurare il documento decine
 * di volte al secondo su una pagina che è lunga apposta; `IntersectionObserver` fa lo
 * stesso lavoro senza far ricalcolare niente.
 *
 * ⚠️ E l'indice resta un elenco di COLLEGAMENTI veri. Le ancore le rende la pagina del
 * corso, e un collaudo misura dove si ferma lo scorrimento dopo il clic — è la lezione
 * dell'indice degli articoli del blog, dove le ancore c'erano tutte e il salto lasciava i
 * titoli nascosti sotto l'intestazione.
 */
export function IndiceCorso({
  sezioni,
}: {
  sezioni: { id: string; titolo: string; minuti: number }[];
}) {
  const [attiva, setAttiva] = useState<string | null>(sezioni[0]?.id ?? null);

  useEffect(() => {
    const osservatore = new IntersectionObserver(
      (voci) => {
        // Fra tutte le sezioni visibili si prende la più in alto: è quella che si sta
        // leggendo. Prendere l'ultima che è entrata farebbe saltare l'indice all'indietro
        // scorrendo verso l'alto.
        const viste = voci
          .filter((v) => v.isIntersecting)
          .sort((a, z) => a.boundingClientRect.top - z.boundingClientRect.top);
        if (viste[0]) setAttiva(viste[0].target.id);
      },
      // La fascia alta della finestra: la sezione «corrente» è quella appena sotto il
      // bordo superiore, non quella al centro dello schermo.
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const s of sezioni) {
      const el = document.getElementById(s.id);
      if (el) osservatore.observe(el);
    }
    return () => osservatore.disconnect();
  }, [sezioni]);

  return (
    <nav
      aria-label="Sezioni del corso"
      data-indice-corso=""
      className="lg:sticky lg:top-6 lg:w-64 lg:shrink-0"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In questo corso</p>
      <ol className="mt-2.5 space-y-0.5">
        {sezioni.map((s, i) => {
          const qui = s.id === attiva;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={qui ? "true" : undefined}
                className={cn(
                  "flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors",
                  qui ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="w-5 shrink-0 text-right font-mono text-[10.5px] opacity-70" data-slot="kpi">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">{s.titolo}</span>
                <span className="shrink-0 font-mono text-[10.5px] opacity-60">{s.minuti}′</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
