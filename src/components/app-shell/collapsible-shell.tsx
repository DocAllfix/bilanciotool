"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Monogramma } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const CHIAVE = "evalisdeck-sidebar";

// Shell interattiva: sidebar scura collassabile a binario di icone.
// Lo stato vive in localStorage; al primo paint si parte espansi e senza
// transizione, così il ripristino non produce sfarfallio animato.
export function CollapsibleShell({
  nome,
  email,
  aziende,
  children,
}: {
  nome: string;
  email: string;
  /** Nomi delle aziende dello studio: servono alla navigazione contestuale, che
   *  vive sopra la rotta dell'azienda e non può riceverli da un contesto sotto. */
  aziende: { id: string; nome: string }[];
  children: React.ReactNode;
}) {
  const [compatta, setCompatta] = useState(false);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    setCompatta(localStorage.getItem(CHIAVE) === "compatta");
    // La transizione si attiva solo dopo il ripristino dello stato salvato.
    requestAnimationFrame(() => setPronta(true));
  }, []);

  const commuta = () => {
    const prossima = !compatta;
    setCompatta(prossima);
    localStorage.setItem(CHIAVE, prossima ? "compatta" : "estesa");
  };

  return (
    <div className="flex min-h-dvh w-full">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex",
          pronta && "transition-[width] duration-200 ease-out",
          compatta ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex items-center pb-4 pt-5", compatta ? "justify-center px-0" : "gap-2.5 px-5")}>
          <Link
            href="/dashboard"
            aria-label="EvalisDeck — portafoglio"
            className="flex min-w-0 items-center gap-2.5"
          >
            <Monogramma suScuro className="size-8 shrink-0" />
            {!compatta && (
              <span className="truncate text-[15px] font-semibold tracking-tight text-white">EvalisDeck</span>
            )}
          </Link>
        </div>
        {/* ⚠️ LO SCORRIMENTO STA QUI, E SERVONO DUE COSE INSIEME.
            `overflow-y-auto` da solo non fa NIENTE: questo è un figlio flex, e un figlio
            flex ha `min-height: auto`, cioè si rifiuta di rimpicciolirsi sotto il proprio
            contenuto. Senza `min-h-0` la barra continuerebbe a traboccare esattamente come
            prima, e la correzione sembrerebbe applicata.

            ⚠️ E non era «non si scorre»: dentro un'azienda la barra mostra il nome, il
            fascicolo e DODICI percorsi, e su uno schermo da portatile il contenuto usciva
            dal riquadro fisso portandosi via anche ciò che sta sotto — il menu
            dell'account e l'interruttore del tema diventavano irraggiungibili. Il comando
            «Comprimi» e il piede restano FUORI da questa area apposta: sono controlli, non
            contenuto, e devono essere raggiungibili anche a metà elenco. */}
        <div className="min-h-0 flex-1 overflow-y-auto scorri-sobrio">
          <SidebarNav compatta={compatta} aziende={aziende} />
        </div>
        <button
          type="button"
          onClick={commuta}
          aria-label={compatta ? "Espandi la barra laterale" : "Comprimi la barra laterale"}
          className={cn(
            "mx-3 mt-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            compatta && "justify-center px-0",
          )}
        >
          {compatta ? (
            <PanelLeftOpen className="size-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" strokeWidth={1.75} />
              Comprimi
            </>
          )}
        </button>
        <div className={cn("mt-auto border-t border-sidebar-border", compatta ? "p-2" : "p-3")}>
          {compatta ? (
            <div className="flex flex-col items-center gap-1">
              <UserMenu nome={nome} email={email} compatto />
              <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <UserMenu nome={nome} email={email} />
              </div>
              <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            </div>
          )}
        </div>
      </aside>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          pronta && "transition-[padding] duration-200 ease-out",
          compatta ? "md:pl-16" : "md:pl-60",
        )}
      >
        {children}
      </div>
    </div>
  );
}
