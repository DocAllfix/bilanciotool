"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SCHEDE = [
  { href: "/impostazioni", etichetta: "Studio" },
  { href: "/impostazioni/membri", etichetta: "Membri" },
  { href: "/impostazioni/abbonamento", etichetta: "Abbonamento" },
] as const;

export function SchedeImpostazioni() {
  const percorso = usePathname();

  return (
    <nav className="mt-5 flex gap-1 border-b" aria-label="Sezioni delle impostazioni">
      {SCHEDE.map((s) => {
        // Confronto esatto e non `startsWith`: con il prefisso, «Studio» resterebbe acceso
        // anche stando su Membri, perché il suo indirizzo è il prefisso di tutti gli altri.
        const attiva = percorso === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={attiva ? "page" : undefined}
            className={cn(
              "tocco-comodo -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              attiva
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.etichetta}
          </Link>
        );
      })}
    </nav>
  );
}
