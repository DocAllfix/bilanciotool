import Link from "next/link";
import { getSessionOrNull } from "@/features/auth/guards";
import { Button } from "@/components/ui/button";
import { LogoOrizzontale } from "@/components/brand/logo";
import { blogVisibileAiMotori } from "@/features/blog/fonte";

// Header sottile e sticky. Auth-aware: chi è già dentro va alla dashboard.
//
// LE ÀNCORE PORTANO IL PERCORSO, non solo il frammento. Questa intestazione compare anche
// sul blog e sulle pagine legali, dove le sezioni `percorsi`, `metodo` e `faq` non esistono:
// con il solo `#percorsi` quelle tre voci erano collegamenti morti fuori dalla landing, e un
// menu che non fa niente si legge come un sito rotto. Con `/#percorsi` funzionano ovunque, e
// sulla landing il browser continua a limitarsi a scorrere, senza ricaricare.
export async function SiteHeader() {
  const session = await getSessionOrNull();
  const conBlog = blogVisibileAiMotori();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="tocco-comodo flex items-center" aria-label="EvalisDeck">
          <LogoOrizzontale className="h-10" />
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] font-medium text-muted-foreground md:flex" aria-label="Sezioni">
          <a href="/#percorsi" className="transition-colors hover:text-foreground">Percorsi</a>
          <a href="/#metodo" className="transition-colors hover:text-foreground">Metodo</a>
          <a href="/#faq" className="transition-colors hover:text-foreground">Domande</a>
          {conBlog && (
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
          )}
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
