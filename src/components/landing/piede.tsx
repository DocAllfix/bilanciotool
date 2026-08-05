import Link from "next/link";
import { LogoOrizzontale } from "@/components/brand/logo";
import { BadgeEcoVadis } from "./ecovadis";
import { PreferenzeCookie } from "@/components/legal/preferenze-cookie";
import { TITOLARE, SEDE_COMPLETA } from "@/lib/legale";
import { blogVisibileAiMotori } from "@/features/blog/fonte";

// Il piede delle pagine pubbliche.
//
// Estratto dalla landing quando è arrivato il blog: due copie dello stesso piede
// divergono al primo cambio, e il piede porta l'identificazione del prestatore
// (art. 7 del D.Lgs. 70/2003) che deve essere identica ovunque.
//
// I collegamenti alle ancore della home (`#percorsi`, `#metodo`) sono assoluti e non
// relativi: da `/blog` un `#metodo` cercherebbe un'ancora che lì non esiste.

export function PiedeMarketing() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <LogoOrizzontale className="h-10" />
          <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
            Cinque documenti di rendicontazione per le PMI, con il metodo incorporato.
          </p>
          {/* 68 px: sotto questa misura "Sustainability Rating" e la data non si leggono più. */}
          <BadgeEcoVadis dimensione={68} className="mt-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prodotto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/#percorsi" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                I cinque documenti
              </Link>
            </li>
            <li>
              <Link href="/#metodo" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Il metodo
              </Link>
            </li>
            {blogVisibileAiMotori() && (
              <li>
                <Link href="/blog" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                  Blog
                </Link>
              </li>
            )}
            <li>
              <a
                href="/esempi/esempio-bilancio-2025.pdf"
                target="_blank"
                rel="noopener"
                className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground"
              >
                Bilancio d&apos;esempio
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Piattaforma</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/login" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Accedi
              </Link>
            </li>
            <li>
              <Link href="/registrati" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Prova la demo
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legale</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/termini" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Termini e condizioni
              </Link>
            </li>
            <li>
              <Link href="/cookie" className="tocco-comodo text-muted-foreground transition-colors hover:text-foreground">
                Cookie
              </Link>
            </li>
            <li>
              {/* La revoca dev'essere facile quanto il consenso: sta qui, non solo dentro
                  la cookie policy come istruzione da eseguire nel browser. */}
              <PreferenzeCookie className="tocco-comodo cursor-pointer text-left text-muted-foreground transition-colors hover:text-foreground" />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        {/* Identificazione del prestatore: art. 7 del D.Lgs. 70/2003. */}
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} EvalisDeck · {TITOLARE.ragioneSociale} · {SEDE_COMPLETA} · P.IVA{" "}
            {TITOLARE.partitaIva}
          </span>
          <span>Dati ospitati nell&apos;Unione Europea</span>
        </div>
      </div>
    </footer>
  );
}
