import { MODULI_AZIENDA } from "@/features/companies/moduli";
import type { ContoServizio } from "@/features/companies/stati-moduli";

// I servizi dello studio, sul portafoglio intero, nell'ordine del registro (per area).
//
// È l'unico aggregato che ha senso su un portafoglio di clienti diversi fra
// loro, perché conta LAVORI, che sono omogenei per definizione. Sommare le
// tCO₂e di una fonderia e di uno studio di software produce invece un numero
// che nessuno può usare, e messo in un grafico sembra pure che significhi
// qualcosa: era il difetto della versione precedente di questa pagina.
//
// Risponde a due domande vere: dove è concentrato il lavoro, e quale servizio
// non stai vendendo. La riga a zero è un'informazione commerciale.

export function ServiziStudio({ servizi }: { servizi: ContoServizio[] }) {
  const totale = servizi[0]?.totale ?? 0;
  // Con nessuna azienda reale non c'è niente da contare: l'utente in demo
  // vedrebbe una fila di barre vuote, che non dicono nulla e sembrano un guasto.
  if (totale === 0) return null;

  return (
    <section aria-label="I servizi dello studio" className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">I servizi dello studio</h2>
        <p className="text-[12px] text-muted-foreground">
          su {totale} {totale === 1 ? "azienda" : "aziende"}{" "}
          in portafoglio, l&apos;azienda dimostrativa esclusa
        </p>
      </div>
      <ul className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {servizi.map((s) => {
          const m = MODULI_AZIENDA.find((x) => x.href === s.modulo)!;
          const pctAvviati = (s.avviati / totale) * 100;
          const pctPubblicati = (s.pubblicati / totale) * 100;
          return (
            <li key={s.modulo} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                  <m.icona className={`size-3.5 shrink-0 ${m.colore.tenue.split(" ").pop()}`} strokeWidth={2} />
                  <span className="truncate">{m.nome}</span>
                </span>
                {/* Quante aziende hanno questo servizio, sul totale: «0 su 0»
                    non voleva dire niente, perchè il denominatore era gli
                    avviati e non le aziende. */}
                <span className="shrink-0 text-[12px] text-muted-foreground" data-slot="kpi">
                  <span className={s.avviati > 0 ? "font-semibold text-foreground" : ""}>{s.avviati}</span> su {totale}
                </span>
              </div>
              {/* Due barre sovrapposte: l'avviato in tenue, il pubblicato pieno
                  sopra. Si legge quanto lavoro è aperto e quanto è consegnato. */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${m.colore.tratto} opacity-30`} style={{ width: `${pctAvviati}%` }}>
                  <div className={`h-full ${m.colore.tratto} opacity-100`} style={{ width: `${pctAvviati > 0 ? (pctPubblicati / pctAvviati) * 100 : 0}%` }} />
                </div>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {s.avviati === 0
                  ? "mai proposto a un cliente"
                  : s.pubblicati === 0
                    ? `${s.avviati} in corso, nessuno ancora consegnato`
                    : `${s.pubblicati} ${s.pubblicati === 1 ? "consegnato" : "consegnati"}${
                        s.avviati > s.pubblicati ? `, ${s.avviati - s.pubblicati} in corso` : ""
                      }`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
