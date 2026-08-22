"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Briefcase, FileStack, HelpCircle, Settings2, ChevronLeft } from "lucide-react";

// Navigazione della shell, in due modi.
//
// Fuori da un'azienda: le voci dello studio.
// Dentro un'azienda: il nome, i moduli raggruppati per area e il ritorno al portafoglio.
// Senza il secondo modo, da dentro la SoA non si raggiungeva il Bilancio della
// stessa azienda senza ripassare dal portafoglio: con due moduli si sopportava,
// con cinque no.

const VOCI = [
  { href: "/dashboard", label: "Portafoglio", icon: Briefcase, tour: "nav-portafoglio" },
  { href: "/documenti", label: "Documenti", icon: FileStack, tour: "nav-documenti" },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings2, tour: "nav-impostazioni" },
  { href: "/guida", label: "Guida", icon: HelpCircle, tour: "nav-guida" },
] as const;

/** `/aziende/<id>/...` → l'id, altrimenti null. */
function aziendaDaRotta(pathname: string): string | null {
  const m = pathname.match(/^\/aziende\/([^/]+)/);
  return m ? m[1] : null;
}

/** Avvolge una voce in un tooltip SOLO quando la barra è compressa: lì restano
 *  le sole icone, e senza etichetta non si capisce cosa faccia ciascun tasto.
 *  Il `title` nativo non basta: compare dopo un secondo abbondante e non è
 *  raggiungibile da tastiera. */
function ConEtichetta({
  attivo,
  etichetta,
  children,
}: {
  attivo: boolean;
  etichetta: string;
  children: React.ReactNode;
}) {
  if (!attivo) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {etichetta}
      </TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({
  compatta = false,
  aziende = [],
}: {
  compatta?: boolean;
  aziende?: { id: string; nome: string }[];
}) {
  const pathname = usePathname();
  const companyId = aziendaDaRotta(pathname);
  const nomeAzienda = companyId ? (aziende.find((a) => a.id === companyId)?.nome ?? null) : null;

  const classeVoce = (attiva: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
      compatta ? "justify-center px-0 py-2.5" : "px-3 py-2",
      attiva
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  if (companyId) {
    const base = `/aziende/${companyId}`;
    return (
      <TooltipProvider>
      <nav className={cn("flex flex-col gap-0.5", compatta ? "px-2" : "px-3")} aria-label="Navigazione dell'azienda">
        <ConEtichetta attivo={compatta} etichetta="Torna al portafoglio">
        <Link
          href="/dashboard"
          aria-label="Torna al portafoglio"
          className={cn(
            "flex items-center gap-2 rounded-md text-[12px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            compatta ? "justify-center px-0 py-2" : "px-3 py-1.5",
          )}
        >
          <ChevronLeft className="size-3.5 shrink-0" strokeWidth={2} />
          {!compatta && "Portafoglio"}
        </Link>
        </ConEtichetta>

        {!compatta && nomeAzienda && (
          <p className="truncate px-3 pb-1 pt-2 text-[13px] font-semibold text-white" title={nomeAzienda}>
            {nomeAzienda}
          </p>
        )}

        <ConEtichetta attivo={compatta} etichetta={nomeAzienda ? `Fascicolo · ${nomeAzienda}` : "Fascicolo"}>
          <Link
            href={base}
            aria-current={pathname === base ? "page" : undefined}
            aria-label="Fascicolo dell'azienda"
            className={classeVoce(pathname === base)}
          >
            <Briefcase className="size-4 shrink-0" strokeWidth={1.75} />
            {!compatta && "Fascicolo"}
          </Link>
        </ConEtichetta>

        {/* Sotto intestazione d'area. Qui lo spazio verticale c'e', e undici voci di
            fila sono un muro: raggruppate diventano cinque blocchi da due o tre.
            L'intestazione sparisce quando la barra e' stretta — li' c'e' posto per
            un'icona sola, e il colore dell'area resta a dire la materia.

            Le aree senza moduli non compaiono: se la barra mostrasse
            «Responsabilita' dell'ente» sopra il vuoto, direbbe che manca qualcosa. */}
        {MODULI_PER_AREA.map((g) => (
          <div key={g.area} className="contents">
            {!compatta && (
              <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45 first:mt-0">
                {g.nome}
              </p>
            )}
            {g.moduli.map((m) => {
              const href = `${base}/${m.href}`;
              const attiva = pathname.startsWith(href);
              return (
                <ConEtichetta key={m.href} attivo={compatta} etichetta={`${m.nome} · ${m.norma}`}>
                  <Link
                    href={href}
                    data-tour={`nav-modulo-${m.href}`}
                    data-modulo={m.href}
                    aria-current={attiva ? "page" : undefined}
                    aria-label={m.nome}
                    className={classeVoce(attiva)}
                  >
                    <m.icona className="size-4 shrink-0" strokeWidth={1.75} />
                    {!compatta && m.nome}
                  </Link>
                </ConEtichetta>
              );
            })}
          </div>
        ))}
      </nav>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
    <nav className={cn("flex flex-col gap-0.5", compatta ? "px-2" : "px-3")} aria-label="Navigazione principale">
      {VOCI.map((v) => {
        const attiva = pathname === v.href || pathname.startsWith(v.href + "/");
        return (
          <ConEtichetta key={v.href} attivo={compatta} etichetta={v.label}>
            <Link
              href={v.href}
              data-tour={v.tour}
              aria-current={attiva ? "page" : undefined}
              aria-label={v.label}
              className={classeVoce(attiva)}
            >
              <v.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {!compatta && v.label}
            </Link>
          </ConEtichetta>
        );
      })}
    </nav>
    </TooltipProvider>
  );
}
