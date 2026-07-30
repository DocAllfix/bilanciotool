"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Briefcase, HelpCircle, Leaf, Menu, Settings2, X } from "lucide-react";

// Navigazione mobile (sotto md la sidebar è nascosta): barra superiore con
// menu a scomparsa. Stesse voci della sidebar, stesso registro scuro.
const VOCI = [
  { href: "/dashboard", label: "Portafoglio", icon: Briefcase },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings2 },
  { href: "/guida", label: "Guida", icon: HelpCircle },
] as const;

export function MobileNav() {
  const [aperto, setAperto] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 md:hidden">
      <div className="flex h-13 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={aperto ? "Chiudi menu" : "Apri menu"}
          aria-expanded={aperto}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setAperto(!aperto)}
        >
          {aperto ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setAperto(false)}>
          <span className="flex size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-3.5" strokeWidth={2} />
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-white">EvalisDeck</span>
        </Link>
      </div>
      {aperto && (
        <nav className="border-b border-sidebar-border bg-sidebar px-3 pb-3" aria-label="Navigazione principale">
          {VOCI.map((v) => {
            const attiva = pathname === v.href || pathname.startsWith(v.href + "/");
            return (
              <Link
                key={v.href}
                href={v.href}
                onClick={() => setAperto(false)}
                aria-current={attiva ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium",
                  attiva
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <v.icon className="size-4" strokeWidth={1.75} />
                {v.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
