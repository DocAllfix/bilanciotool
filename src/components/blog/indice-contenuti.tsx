import type { VoceIndice } from "@/features/blog/indice";

// L'indice dei contenuti, in apertura dell'articolo.
//
// Sta prima dell'introduzione e non in una colonna laterale: chi arriva da una ricerca
// con una domanda precisa deve trovare la risposta al primo schermo, anche sul telefono,
// dove una colonna laterale non esiste.
//
// È un `<nav>` con un elenco ordinato: non è decorazione, è la struttura della pagina
// dichiarata a chi la legge con uno screen reader e a chi la indicizza.

export function IndiceContenuti({ voci }: { voci: VoceIndice[] }) {
  return (
    <nav aria-labelledby="indice-titolo" className="my-8 rounded-xl border bg-card/60 px-5 py-4">
      <h2 id="indice-titolo" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        In questo articolo
      </h2>
      <ol className="mt-3 space-y-1.5">
        {voci.map((v) => (
          <li key={v.id} className={v.livello === 3 ? "ml-4" : ""}>
            <a
              href={`#${v.id}`}
              className={
                "text-[14.5px] leading-snug text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline " +
                (v.livello === 2 ? "font-medium" : "text-[13.5px]")
              }
            >
              {v.testo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
