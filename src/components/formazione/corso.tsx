import type { Blocco, Sezione, Tono } from "@/features/formazione";
import { Interfaccia } from "./interfaccia";

/**
 * Il renderer della formazione: uno solo, per tutti i corsi.
 *
 * ⚠️ È la stessa scelta del corpus (447 documenti, un componente) e delle 63 schede del
 * metodo. Dodici corsi scritti come dodici pagine sarebbero dodici cose da tenere
 * allineate a mano, e ciò che si tiene allineato a mano prima o poi non lo è più.
 */

/** I tre toni, con le classi scritte PER ESTESO. */
const TONI: Record<Tono, { riquadro: string; titolo: string }> = {
  // ⚠️ Mai `bg-${tono}-subtle`: Tailwind genera le utility scandendo il TESTO dei
  // sorgenti, quindi una classe costruita a stringa non esiste e il riquadro resta senza
  // fondo. Delle cinque aree, una volta, una sola aveva il colore — e ce l'aveva per caso.
  nota: { riquadro: "border-primary/25 bg-primary/5", titolo: "text-primary" },
  attenzione: { riquadro: "border-warning/40 bg-warning-subtle", titolo: "text-warning" },
  errore: { riquadro: "border-destructive/40 bg-destructive/10", titolo: "text-destructive" },
};

/**
 * Il grassetto con `**…**`, e nient'altro.
 *
 * ⚠️ Non è markdown e non deve diventarlo: il testo dei corsi lo scriviamo noi, quindi non
 * c'è niente da sanificare, ma aprire la porta a HTML arbitrario in un componente che un
 * giorno potrebbe rendere testo di qualcun altro è il modo di trovarsi con un problema che
 * oggi non si ha. Una sola marcatura, resa in elementi veri.
 */
function conGrassetto(testo: string) {
  return testo.split(/\*\*(.+?)\*\*/g).map((pezzo, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {pezzo}
      </strong>
    ) : (
      <span key={i}>{pezzo}</span>
    ),
  );
}

function BloccoReso({ b }: { b: Blocco }) {
  if (b.tipo === "prosa") {
    // ⚠️ La prosa e' testo PRIMARIO, non secondario. Era `text-muted-foreground` e il corpo
    // del corso risultava piu' chiaro dei riquadri d'avviso: su una pagina il cui unico
    // scopo e' essere letta, il testo principale deve essere la cosa piu' leggibile. Si vede
    // solo guardando: nessun collaudo funzionale distingue un grigio da un altro.
    return <p className="max-w-prose text-[14.5px] leading-relaxed text-foreground/90">{conGrassetto(b.testo)}</p>;
  }

  if (b.tipo === "elenco") {
    return (
      <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-foreground/90">
        {b.voci.map((v) => (
          <li key={v}>{conGrassetto(v)}</li>
        ))}
      </ul>
    );
  }

  if (b.tipo === "formula") {
    return (
      <p className="rounded-lg border bg-muted/40 px-4 py-3 font-mono text-[13px] text-foreground">{b.testo}</p>
    );
  }

  if (b.tipo === "tabella") {
    return (
      // ⚠️ La tabella scorre nel PROPRIO contenitore, mai il corpo della pagina: su un
      // telefono da 360px tre colonne di testo non ci stanno, e una pagina che sfonda in
      // orizzontale si legge come un difetto anche quando il contenuto è giusto.
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[36rem] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {b.intestazioni.map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.righe.map((r) => (
              <tr key={r.join("|")} className="border-b last:border-0 align-top">
                {r.map((c, i) => (
                  <td key={i} className="px-3 py-2.5 leading-relaxed text-foreground/85">
                    {conGrassetto(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (b.tipo === "interfaccia") {
    return <Interfaccia vista={b.vista} titolo={b.titolo} nota={b.nota} />;
  }

  const t = TONI[b.tono];
  return (
    <div className={`max-w-prose rounded-lg border px-4 py-3 ${t.riquadro}`}>
      {b.titolo && <p className={`text-[13px] font-semibold ${t.titolo}`}>{b.titolo}</p>}
      <p className={`text-[14px] leading-relaxed text-foreground/85 ${b.titolo ? "mt-1" : ""}`}>
        {conGrassetto(b.testo)}
      </p>
    </div>
  );
}

export function SezioneCorso({
  sezione,
  indice,
  tinta,
}: {
  sezione: Sezione;
  indice: number;
  /** Le classi del colore dell'area, dal registro dei moduli. */
  tinta?: { tratto: string; testo: string };
}) {
  return (
    <section id={sezione.id} className="scroll-mt-24 border-t pt-8">
      {/* ⚠️ Il numero della sezione porta il colore dell'AREA, non un colore suo. È il
          modo in cui questo prodotto colora: la tinta dice la materia, e ripeterla qui
          lega il corso al percorso di cui parla senza aggiungere niente da decidere. */}
      <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span
          className={`flex size-6 items-center justify-center rounded-md font-mono text-[10.5px] ${
            tinta ? `${tinta.tratto} text-white` : "bg-muted text-muted-foreground"
          }`}
          data-slot="kpi"
        >
          {String(indice).padStart(2, "0")}
        </span>
        {sezione.minuti} min
      </p>
      <h2 className="font-display mt-2 text-[22px] font-bold tracking-[-0.01em]">{sezione.titolo}</h2>
      <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-muted-foreground">{sezione.sommario}</p>
      <div className="mt-5 space-y-4">
        {sezione.blocchi.map((b, i) => (
          <BloccoReso key={i} b={b} />
        ))}
      </div>
    </section>
  );
}
