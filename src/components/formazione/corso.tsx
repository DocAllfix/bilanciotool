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

/**
 * Le due misure in cui un blocco puo' comparire.
 *
 * ⚠️ Un solo renderer per la pagina e per la presentazione, non due. Sono le stesse
 * tabelle e gli stessi avvisi: duplicarli per farli piu' grandi significherebbe che al
 * primo ritocco la presentazione mostra una cosa e la pagina un'altra, ed e' la
 * divergenza silenziosa che questo progetto paga da sempre. Cambia la misura, non il
 * contenuto, e le classi sono scritte per esteso perche' Tailwind scandisce il testo.
 */
const MISURE = {
  pagina: {
    larghezza: "max-w-prose",
    prosa: "text-[14.5px]",
    elenco: "text-[14.5px]",
    formula: "px-4 py-3 text-[13px]",
    tabella: "text-[13.5px]",
    cella: "px-3 py-2.5",
    avviso: "px-4 py-3",
    avvisoTitolo: "text-[13px]",
    avvisoTesto: "text-[14px]",
  },
  grande: {
    // ⚠️ In presentazione il blocco riempie la colonna: `max-w-prose` a 19px e' piu'
    // stretto del contenitore, e il riquadro galleggiava a sinistra dentro il vuoto. Su
    // una schermata intera la composizione si vede, e uno squilibrio si legge come un
    // difetto anche quando il contenuto e' giusto.
    larghezza: "max-w-none",
    prosa: "text-[19px]",
    elenco: "text-[19px]",
    formula: "px-6 py-5 text-[17px]",
    tabella: "text-[17px]",
    cella: "px-5 py-4",
    avviso: "px-6 py-5",
    avvisoTitolo: "text-[17px]",
    avvisoTesto: "text-[18px]",
  },
} as const;

export type Misura = keyof typeof MISURE;

export function BloccoReso({ b, misura = "pagina" }: { b: Blocco; misura?: Misura }) {
  const m = MISURE[misura];
  if (b.tipo === "prosa") {
    // ⚠️ La prosa e' testo PRIMARIO, non secondario. Era `text-muted-foreground` e il corpo
    // del corso risultava piu' chiaro dei riquadri d'avviso: su una pagina il cui unico
    // scopo e' essere letta, il testo principale deve essere la cosa piu' leggibile. Si vede
    // solo guardando: nessun collaudo funzionale distingue un grigio da un altro.
    return <p className={`leading-relaxed text-foreground/90 ${m.larghezza} ${m.prosa}`}>{conGrassetto(b.testo)}</p>;
  }

  if (b.tipo === "elenco") {
    return (
      <ul className={`list-disc space-y-1.5 pl-5 leading-relaxed text-foreground/90 ${m.larghezza} ${m.elenco}`}>
        {b.voci.map((v) => (
          <li key={v}>{conGrassetto(v)}</li>
        ))}
      </ul>
    );
  }

  if (b.tipo === "formula") {
    return (
      <p className={`whitespace-pre-line rounded-lg border bg-muted/40 font-mono text-foreground ${m.formula}`}>{b.testo}</p>
    );
  }

  if (b.tipo === "tabella") {
    return (
      // ⚠️ La tabella scorre nel PROPRIO contenitore, mai il corpo della pagina: su un
      // telefono da 360px tre colonne di testo non ci stanno, e una pagina che sfonda in
      // orizzontale si legge come un difetto anche quando il contenuto è giusto.
      <div className="overflow-x-auto rounded-lg border">
        <table className={`w-full min-w-[36rem] border-collapse ${m.tabella}`}>
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {b.intestazioni.map((h) => (
                <th key={h} scope="col" className={`font-semibold ${m.cella}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.righe.map((r) => (
              <tr key={r.join("|")} className="border-b last:border-0 align-top">
                {r.map((c, i) => (
                  <td key={i} className={`leading-relaxed text-foreground/85 ${m.cella}`}>
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
    <div className={`rounded-lg border ${m.larghezza} ${m.avviso} ${t.riquadro}`}>
      {b.titolo && <p className={`font-semibold ${m.avvisoTitolo} ${t.titolo}`}>{b.titolo}</p>}
      <p className={`leading-relaxed text-foreground/85 ${m.avvisoTesto} ${b.titolo ? "mt-1" : ""}`}>
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
