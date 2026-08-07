import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Briciola } from "@/features/blog/tassonomia";
import { schemaBriciole } from "@/features/blog/tassonomia";

// Le briciole di pane: dove sono, e come torno indietro.
//
// Servono due volte. A chi legge, per capire in che parte del sito è finito arrivando da una
// ricerca. A Google, che con lo schema `BreadcrumbList` mostra «evalisdeck.it › Blog › Guide»
// sotto il titolo del risultato al posto dell'indirizzo — più leggibile, e più cliccato.
//
// L'ultima briciola è la pagina corrente: non è un collegamento (portare a sé stessi non
// serve a nessuno) ma nello schema ci va comunque col suo indirizzo, perché la posizione
// finale fa parte del percorso.

export function Briciole({ briciole }: { briciole: Briciola[] }) {
  if (briciole.length < 2) return null;
  const ultima = briciole.length - 1;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBriciole(briciole)) }}
      />
      <nav aria-label="Percorso" className="mb-6">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted-foreground">
          {briciole.map((b, i) => (
            <li key={b.url} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />}
              {i === ultima ? (
                // `aria-current` dice al lettore di schermo che questa è la pagina aperta;
                // il troncamento evita che un titolo lungo mandi a capo tutta la riga.
                <span aria-current="page" className="max-w-[22ch] truncate text-foreground sm:max-w-none">
                  {b.nome}
                </span>
              ) : (
                <Link href={new URL(b.url).pathname} className="transition-colors hover:text-foreground">
                  {b.nome}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
