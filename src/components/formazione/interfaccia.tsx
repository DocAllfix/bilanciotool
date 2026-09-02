import type { VistaFinta } from "@/features/formazione";
import { Check, Minus } from "lucide-react";

/**
 * Le riproduzioni dell'interfaccia dentro un corso.
 *
 * ⚠️ SONO COSTRUITE COI TOKEN VERI, non disegnate a parte. Una figura che somiglia al
 * prodotto e non lo è si stacca al primo ritocco, e chi la guarda impara una schermata che
 * non troverà. Qui i bordi, i raggi, i colori di stato e i numeri tabellari sono gli stessi
 * che l'utente ha davanti tre clic più in là.
 *
 * ⚠️ E NON SONO INTERATTIVE. Servono a spiegare, non a far provare: un finto pulsante che
 * si preme e non fa niente è peggio di un disegno, perché promette. Tutto qui è inerte e
 * marcato `aria-hidden` dove è puramente illustrativo — chi usa un lettore di schermo
 * riceve la spiegazione dal testo attorno, che è più chiara di qualunque tabella finta.
 */

const STATO_PASSO = {
  fatto: "border-transparent bg-primary text-primary-foreground",
  corso: "border-primary bg-primary/10 text-primary",
  vuoto: "border-border bg-muted/40 text-muted-foreground",
} as const;

// Classi per esteso: Tailwind genera le utility scandendo il testo, e una classe
// costruita con un template literal non esiste da nessuna parte.
const STATO_VOCE = {
  ok: { riquadro: "border-success/40 bg-success-subtle text-success", segno: "Sì" },
  parziale: { riquadro: "border-warning/40 bg-warning-subtle text-warning", segno: "In parte" },
  no: { riquadro: "border-destructive/40 bg-destructive/10 text-destructive", segno: "No" },
  na: { riquadro: "border-border bg-muted/50 text-muted-foreground", segno: "N/A" },
} as const;

function Passi({ passi }: { passi: Extract<VistaFinta, { genere: "passi" }>["passi"] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-hidden>
      {passi.map((p, i) => (
        <li key={p.nome} className="flex items-center gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium ${STATO_PASSO[p.stato]}`}
          >
            <span className="font-mono text-[10px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
            {p.nome}
          </span>
          {i < passi.length - 1 && <span className="text-[10px] text-muted-foreground">›</span>}
        </li>
      ))}
    </ol>
  );
}

function Riga({ vista }: { vista: Extract<VistaFinta, { genere: "riga" }> }) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <table className="w-full min-w-[30rem] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b text-left">
            {vista.intestazioni.map((h) => (
              <th key={h} className="px-2.5 py-1.5 font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {vista.celle.map((c, i) => (
              <td key={i} className="px-2.5 py-2 align-top">
                {c}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {vista.risultato && (
        // Il numero calcolato sta SOTTO e staccato, come nel dialogo vero: è il prodotto
        // che risponde, non un campo che si compila.
        <p className="mt-2 flex items-baseline gap-2 border-t pt-2 text-[12.5px] text-muted-foreground">
          {vista.risultato.etichetta}
          <span className="text-[15px] font-semibold text-foreground" data-slot="kpi">
            {vista.risultato.valore}
          </span>
        </p>
      )}
    </div>
  );
}

function Stati({ voci }: { voci: Extract<VistaFinta, { genere: "stati" }>["voci"] }) {
  return (
    <ul className="space-y-1.5" aria-hidden>
      {voci.map((v) => (
        <li key={v.testo} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <span className="min-w-0 flex-1">{v.testo}</span>
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATO_VOCE[v.stato].riquadro}`}>
            {STATO_VOCE[v.stato].segno}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Verifica({ voci }: { voci: Extract<VistaFinta, { genere: "verifica" }>["voci"] }) {
  return (
    <ul className="space-y-1.5" aria-hidden>
      {voci.map((v) => (
        <li key={v.testo} className="flex items-start gap-2 text-[12.5px]">
          {v.esito === "ok" ? (
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.5} />
          ) : (
            <Minus className="mt-0.5 size-3.5 shrink-0 text-warning" strokeWidth={2.5} />
          )}
          <span className={v.esito === "ok" ? "text-muted-foreground" : "text-foreground"}>{v.testo}</span>
        </li>
      ))}
    </ul>
  );
}

export function Interfaccia({
  vista,
  titolo,
  nota,
}: {
  vista: VistaFinta;
  titolo?: string;
  nota?: string;
}) {
  return (
    <figure className="max-w-prose rounded-xl border bg-card p-4">
      {titolo && (
        <figcaption className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {titolo}
        </figcaption>
      )}
      {vista.genere === "passi" && <Passi passi={vista.passi} />}
      {vista.genere === "riga" && <Riga vista={vista} />}
      {vista.genere === "stati" && <Stati voci={vista.voci} />}
      {vista.genere === "verifica" && <Verifica voci={vista.voci} />}
      {nota && <p className="mt-3 border-t pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">{nota}</p>}
    </figure>
  );
}
