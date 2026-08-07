import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

// Banner di stato demo: sempre visibile finché l'account non è sbloccato.
// Il server resta la verità (il paywall è nelle action): questo è solo il promemoria.
export function DemoBanner() {
  return (
    <div className="border-b border-primary/20 bg-accent">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm text-accent-foreground">
        <Sparkles className="size-4 shrink-0" />
        <p className="min-w-0">
          <b>Stai esplorando la demo</b>: l&apos;azienda Meccanica Adriatica è un esempio già compilato, modificala liberamente.
        </p>
        <Link href="/impostazioni/abbonamento" className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline">
          Sblocca per le tue aziende <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
