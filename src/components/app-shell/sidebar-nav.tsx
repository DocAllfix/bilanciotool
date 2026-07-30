"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Briefcase, Factory, FileText, HelpCircle, Settings2 } from "lucide-react";

// Navigazione della shell. Le voci per-azienda compaiono nelle fasi 5/7:
// qui la struttura e lo stato attivo, con i data-tour già predisposti.
const VOCI = [
  { href: "/dashboard", label: "Portafoglio", icon: Briefcase, tour: "nav-portafoglio" },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings2, tour: "nav-impostazioni" },
  { href: "/guida", label: "Guida", icon: HelpCircle, tour: "nav-guida" },
] as const;

export const MODULE_ICONS = { ghg: Factory, bilancio: FileText };

export function SidebarNav({ compatta = false }: { compatta?: boolean }) {
  const pathname = usePathname();
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
            className={cn(
              "flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
              compatta ? "justify-center px-0 py-2.5" : "px-3 py-2",
              attiva
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <v.icon className="size-4 shrink-0" strokeWidth={1.75} />
            {!compatta && v.label}
          </Link>
        );
      })}
    </nav>
  );
}
