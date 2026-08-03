import Link from "next/link";
import { SiteHeader } from "./site-header";
import { AGGIORNATO_AL, AGGIORNATO_AL_ESTESO, TITOLARE, SEDE_COMPLETA } from "@/lib/legale";

// Impaginazione dei tre documenti legali. Un documento lungo si legge se ha
// numeri, titoli e un piede identificativo: la versione precedente era tre
// paragrafi in grigio, che per un testo di dieci sezioni non basta.

const PAGINE = [
  { href: "/privacy", titolo: "Privacy" },
  { href: "/cookie", titolo: "Cookie" },
  { href: "/termini", titolo: "Termini e condizioni" },
] as const;

export function PaginaLegale({
  titolo,
  sottotitolo,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Informazioni legali
        </p>
        <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[40px]">
          {titolo}
        </h1>
        {sottotitolo && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{sottotitolo}</p>
        )}
        <p className="mt-4 border-t pt-4 text-[13px] text-muted-foreground">
          Ultimo aggiornamento: <time dateTime={AGGIORNATO_AL}>{AGGIORNATO_AL_ESTESO}</time>
        </p>

        <div className="mt-10">{children}</div>

        {/* Identificazione del prestatore: art. 7 del D.Lgs. 70/2003. */}
        <div className="mt-14 rounded-xl border bg-card p-6 text-[13px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{TITOLARE.ragioneSociale}</p>
          <p className="mt-1">
            {SEDE_COMPLETA} — {TITOLARE.paese}
            <br />
            Partita IVA {TITOLARE.partitaIva}
            <br />
            <a className="text-primary hover:underline" href={`mailto:${TITOLARE.email}`}>
              {TITOLARE.email}
            </a>
          </p>
        </div>

        <nav
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-sm"
          aria-label="Documenti legali"
        >
          <Link href="/" className="font-medium text-primary hover:underline">
            ← Torna alla home
          </Link>
          {PAGINE.map((p) => (
            <Link key={p.href} href={p.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {p.titolo}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

/** Sezione numerata. Il numero lo passa il chiamante e non un contatore
 *  automatico: le sezioni si citano per numero, e un rinumero silenzioso al
 *  primo riordino renderebbe falsi i riferimenti già scritti altrove. */
export function Sezione({ n, titolo, children }: { n: number; titolo: string; children: React.ReactNode }) {
  const id = `sezione-${n}`;
  return (
    <section id={id} className="scroll-mt-24 border-t py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display flex gap-4 text-[19px] font-semibold tracking-[-0.01em]">
        <span className="text-primary/50" data-slot="kpi">
          {String(n).padStart(2, "0")}
        </span>
        <a href={`#${id}`} className="hover:underline">
          {titolo}
        </a>
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground sm:pl-9.5 [&_a]:text-primary [&_li]:leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** Tabella dei fornitori o dei cookie. Scorre da sola su schermo stretto:
 *  è la pagina che non deve mai scorrere in orizzontale. */
export function TabellaLegale({ intestazioni, righe }: { intestazioni: string[]; righe: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-135 border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b">
            {intestazioni.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r, i) => (
            <tr key={i} className="border-b last:border-b-0">
              {r.map((c, j) => (
                <td key={j} className="py-2.5 pr-4 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
