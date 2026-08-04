"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Monogramma } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";
import { Menu, X } from "lucide-react";

// Navigazione mobile (sotto md la sidebar è nascosta): barra superiore con menu
// a scomparsa. Le voci sono le STESSE della sidebar, rese dallo stesso
// componente: prima erano un secondo elenco copiato a mano, che infatti si era
// già fermato a tre voci mentre la sidebar ne aveva altre.
export function MobileNav({ aziende = [] }: { aziende?: { id: string; nome: string }[] }) {
  const [aperto, setAperto] = useState(false);
  const pathname = usePathname();

  // Il menu si chiude quando la rotta cambia: senza, restava aperto sopra la
  // pagina appena aperta.
  const [ultimaRotta, setUltimaRotta] = useState(pathname);
  if (pathname !== ultimaRotta) {
    setUltimaRotta(pathname);
    if (aperto) setAperto(false);
  }

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
        <Link href="/dashboard" className="tocco-comodo flex items-center gap-2" onClick={() => setAperto(false)}>
          <Monogramma suScuro className="size-7" />
          <span className="text-[14px] font-semibold tracking-tight text-white">EvalisDeck</span>
        </Link>
      </div>
      {aperto && (
        <div className="border-b border-sidebar-border bg-sidebar pb-3 pt-1">
          <SidebarNav aziende={aziende} />
        </div>
      )}
    </div>
  );
}
