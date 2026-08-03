"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { Briefcase, FileStack, HelpCircle, Settings2, ChevronLeft } from "lucide-react";

// Navigazione della shell, in due modi.
//
// Fuori da un'azienda: le voci dello studio.
// Dentro un'azienda: il nome, i cinque moduli e il ritorno al portafoglio.
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
      <nav className={cn("flex flex-col gap-0.5", compatta ? "px-2" : "px-3")} aria-label="Navigazione dell'azienda">
        <Link
          href="/dashboard"
          title={compatta ? "Torna al portafoglio" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-md text-[12px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            compatta ? "justify-center px-0 py-2" : "px-3 py-1.5",
          )}
        >
          <ChevronLeft className="size-3.5 shrink-0" strokeWidth={2} />
          {!compatta && "Portafoglio"}
        </Link>

        {!compatta && nomeAzienda && (
          <p className="truncate px-3 pb-1 pt-2 text-[13px] font-semibold text-white" title={nomeAzienda}>
            {nomeAzienda}
          </p>
        )}

        <Link href={base} aria-current={pathname === base ? "page" : undefined} className={classeVoce(pathname === base)}>
          <Briefcase className="size-4 shrink-0" strokeWidth={1.75} />
          {!compatta && "Fascicolo"}
        </Link>

        {MODULI_AZIENDA.map((m) => {
          const href = `${base}/${m.href}`;
          const attiva = pathname.startsWith(href);
          return (
            <Link
              key={m.href}
              href={href}
              data-tour={`nav-modulo-${m.href}`}
              aria-current={attiva ? "page" : undefined}
              title={compatta ? m.nome : undefined}
              className={classeVoce(attiva)}
            >
              <m.icona className="size-4 shrink-0" strokeWidth={1.75} />
              {!compatta && m.nome}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-0.5", compatta ? "px-2" : "px-3")} aria-label="Navigazione principale">
      {VOCI.map((v) => {
        const attiva = pathname === v.href || pathname.startsWith(v.href + "/");
        return (
          <Link
            key={v.href}
            href={v.href}
            data-tour={v.tour}
            aria-current={attiva ? "page" : undefined}
            title={compatta ? v.label : undefined}
            className={classeVoce(attiva)}
          >
            <v.icon className="size-4 shrink-0" strokeWidth={1.75} />
            {!compatta && v.label}
          </Link>
        );
      })}
    </nav>
  );
}
