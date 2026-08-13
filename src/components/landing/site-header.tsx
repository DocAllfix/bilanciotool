import Link from "next/link";
import { LogoOrizzontale } from "@/components/brand/logo";
import { AzioniAccesso } from "./azioni-accesso";
import { blogVisibileAiMotori } from "@/features/blog/fonte";

// Header sottile e sticky. Auth-aware, ma la sessione la chiede il BROWSER: vedi
// `azioni-accesso.tsx`. Questo componente non deve MAI leggere la richiesta — niente
// `headers()`, niente `cookies()`, niente sessione lato server — perché compare su tutte
// le pagine pubbliche, e basta una lettura qui per impedirne la generazione statica.
// È già costato un 500 su ogni articolo del blog; `pagine-statiche-pure.test.ts` ora lo
// impedisce.
//
// LE ÀNCORE PORTANO IL PERCORSO, non solo il frammento. Questa intestazione compare anche
// sul blog e sulle pagine legali, dove le sezioni `percorsi`, `metodo` e `faq` non esistono:
// con il solo `#percorsi` quelle tre voci erano collegamenti morti fuori dalla landing, e un
// menu che non fa niente si legge come un sito rotto. Con `/#percorsi` funzionano ovunque, e
// sulla landing il browser continua a limitarsi a scorrere, senza ricaricare.
export function SiteHeader() {
  const conBlog = blogVisibileAiMotori();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        {/* `shrink-0`: quando la barra si stringe il marchio e' la prima cosa che cede,
            e cede in silenzio. A 768px era ridotto a una scaglia di quattordici pixel.
            Ora a cedere sono gli spazi, e se non basta il difetto si vede. */}
        <Link href="/" className="tocco-comodo flex shrink-0 items-center" aria-label="EvalisDeck">
          <LogoOrizzontale className="h-10" />
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] font-medium text-muted-foreground md:flex" aria-label="Sezioni">
          {/* `<Link>` e non `<a>`: le àncore portano il percorso perché la stessa
              intestazione compare su pagine che quelle sezioni non le hanno, ma con
              un anchor grezzo ogni voce ricarica il sito da capo. */}
          <Link href="/#percorsi" className="transition-colors hover:text-foreground">Percorsi</Link>
          <Link href="/#metodo" className="transition-colors hover:text-foreground">Metodo</Link>
          <Link href="/#acquisto" className="transition-colors hover:text-foreground">Acquisto</Link>
          <Link href="/#faq" className="transition-colors hover:text-foreground">Domande</Link>
          {conBlog && (
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <AzioniAccesso />
        </div>
      </div>
    </header>
  );
}
