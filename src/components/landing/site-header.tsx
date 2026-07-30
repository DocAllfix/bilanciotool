import Link from "next/link";
import { getSessionOrNull } from "@/features/auth/guards";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

// Header sottile e sticky. Auth-aware: chi è già dentro va alla dashboard.
export async function SiteHeader() {
  const session = await getSessionOrNull();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="EvalisDeck">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="size-4" strokeWidth={2} />
          </span>
          <span className="font-display text-[16px] font-bold tracking-tight">EvalisDeck</span>
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] font-medium text-muted-foreground md:flex" aria-label="Sezioni">
          <a href="#percorsi" className="transition-colors hover:text-foreground">Percorsi</a>
          <a href="#metodo" className="transition-colors hover:text-foreground">Metodo</a>
          <a href="#faq" className="transition-colors hover:text-foreground">Domande</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Vai al portafoglio</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link href="/login">Accedi</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registrati">Prova la demo guidata</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
