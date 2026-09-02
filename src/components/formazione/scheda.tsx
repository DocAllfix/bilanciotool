import Link from "next/link";
import { Headphones } from "lucide-react";

import { MODULI_AZIENDA } from "@/features/companies/moduli";
import type { SchedaCorso } from "@/features/formazione";
import { minutiDiVoce } from "@/features/formazione/audio";
import { tempoDaDedicare, formattaDurata } from "@/features/formazione/tempo";
import { cn } from "@/lib/utils";

/**
 * La scheda di un corso nell'indice.
 *
 * ⚠️ RIFATTA DUE VOLTE, E LA SECONDA PER TOGLIERE. La prima versione erano dodici schede
 * identiche — la griglia di card uguali che PRODUCT.md nomina fra le anti-reference. La
 * seconda diceva troppe cose: i minuti comparivano DUE volte, la barra spezzava il corso in
 * quattordici slivere illeggibili, e in fondo c'era «Apri il corso» con la freccia su ogni
 * scheda, mentre la scheda intera è già un collegamento. Dodici richiami identici a un
 * gesto che si fa cliccando ovunque sono rumore, non aiuto.
 *
 * ⚠️ La differenza fra un corso e l'altro si cerca in un DATO, non nella decorazione. Un
 * corso è una parte comune a tutti e dodici — interfaccia, salvataggio, verifica,
 * pubblicazione — più una parte che esiste solo per quel percorso. La barra mostra QUELLE
 * DUE, non le quattordici sezioni: due segmenti si leggono, quattordici no.
 *
 * ⚠️ E NIENTE QUADRATINO COLORATO CON L'ICONA DENTRO, tolto al terzo giro. È la forma
 * più riconoscibile della card SaaS generica — icona in un riquadro pieno, titolo,
 * paragrafo, ripetuta dodici volte — ed è nominata così com'è fra le anti-reference di
 * PRODUCT.md. Qui non portava nemmeno informazione: l'area la dichiara l'intestazione del
 * gruppo, il colore lo porta già la barra, e l'icona del modulo si vede nella barra
 * laterale quando ci sei dentro. Restava un bollo colorato per riempire l'angolo.
 */
export function SchedaFormazione({ corso }: { corso: SchedaCorso }) {
  const m = MODULI_AZIENDA.find((x) => x.href === corso.modulo)!;

  const minutiComuni = corso.sezioni
    .filter((s) => corso.idComuni.includes(s.id))
    .reduce((n, s) => n + s.minuti, 0);
  const minutiProprie = corso.minuti - minutiComuni;
  const voce = minutiDiVoce(corso.modulo, corso.sezioni, corso.idComuni);

  return (
    <Link
      href={`/formazione/${corso.modulo}`}
      data-corso={corso.modulo}
      className="group flex flex-col rounded-xl border bg-card p-4 transition-all hover:border-foreground/15 hover:shadow-md"
    >
      {/* La norma sopra il nome, in mono: è la riga con cui un consulente riconosce un
          corso prima ancora di leggerne il titolo, ed è l'unico elemento che distingue
          davvero una scheda dall'altra. Sta in alto perché è quello che si cerca. */}
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{corso.norma}</p>
      <p className="mt-1 text-[16px] font-semibold leading-tight tracking-tight group-hover:text-primary">
        {corso.nome}
      </p>

      {/* ⚠️ DUE segmenti, non quattordici. La domanda a cui questa barra risponde è una
          sola: quanto di questo corso riguarda QUESTO percorso, e quanto è il mestiere di
          base che si legge una volta per tutte. Con una sliverina per sezione la risposta
          c'era e non si vedeva. `aria-hidden` perché la riga sotto la dice a parole. */}
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span style={{ flexGrow: minutiComuni }} className="block bg-muted-foreground/30" />
        {minutiProprie > 0 && <span style={{ flexGrow: minutiProprie }} className={cn("block", m.colore.tratto)} />}
      </div>

      <p className="mt-2.5 text-[12.5px] text-muted-foreground">
        {minutiProprie > 0 ? (
          <>
            <span data-slot="kpi">{formattaDurata(tempoDaDedicare(minutiProprie))}</span> su questo percorso, più{" "}
            <span data-slot="kpi">{formattaDurata(tempoDaDedicare(minutiComuni))}</span> comuni a tutti
          </>
        ) : (
          <>
            <span data-slot="kpi">{formattaDurata(tempoDaDedicare(minutiComuni))}</span> sull&apos;uso del prodotto ·
            parte specifica in preparazione
          </>
        )}
      </p>

      {corso.completo && (
        <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-foreground/70">
          {corso.argomenti.slice(0, 3).join(" · ")}
          {corso.argomenti.length > 3 ? " …" : ""}
        </p>
      )}

      {/* La voce è l'unica cosa che davvero distingue un corso pronto da uno da leggere, e
          finora la scheda non la nominava: chi apriva sperando di ascoltare lo scopriva
          dentro. Compare solo dove c'è, invece di un «senza audio» su tutti gli altri. */}
      {voce.totale > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-primary">
          <Headphones className="size-3.5" aria-hidden />
          <span data-slot="kpi">{voce.totale}</span> min di voce
          {!voce.completa && (
            <span className="font-normal text-muted-foreground">
              {voce.proprie === 0 ? "sulla parte comune" : "in parte"}
            </span>
          )}
        </p>
      )}
    </Link>
  );
}
