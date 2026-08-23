"use client";

import Link from "next/link";
import type { StatoDocumento, VoceCorpus } from "@/features/corpus/letture";

// L'elenco delle procedure o della modulistica di un modulo.
//
// ⚠️ È il contenuto principale che il prodotto vende — «oltre 400 documenti con testo
// già scritto» — ed è rimasto irraggiungibile per tre moduli interi: il motore c'era, le
// letture no. Si vede da qui, e da qui si apre il singolo documento.

export const ETICHETTA_STATO: Record<StatoDocumento["stato"], string> = {
  da_personalizzare: "Da personalizzare",
  in_redazione: "In redazione",
  approvato: "Approvato",
  non_applicabile: "Non applicabile",
};

const COLORE_STATO: Record<StatoDocumento["stato"], string> = {
  da_personalizzare: "var(--muted-foreground)",
  in_redazione: "var(--warning)",
  approvato: "var(--success)",
  non_applicabile: "var(--muted-foreground)",
};

export function VistaProcedure({
  voci,
  tipo,
  href,
}: {
  voci: readonly VoceCorpus[];
  tipo: "procedura" | "modulo";
  href: (code: string) => string;
}) {
  if (!voci.length) {
    return (
      <p className="rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
        Nessun documento nel corpus di questo sistema.
      </p>
    );
  }

  // Le procedure sono raggruppate per fase, i moduli per procedura di appartenenza: sono
  // due modi di leggere lo stesso elenco, e il corpus li porta gia' scritti.
  const chiave = (v: VoceCorpus) => (tipo === "procedura" ? (v.fase ?? "—") : (v.proCode ?? "—"));
  const gruppi: { nome: string; voci: VoceCorpus[] }[] = [];
  for (const v of voci) {
    const k = chiave(v);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.nome === k) ultimo.voci.push(v);
    else gruppi.push({ nome: k, voci: [v] });
  }

  const approvate = voci.filter((v) => v.stato === "approvato").length;

  return (
    <div className="space-y-6" data-tour={`corpus-${tipo === "procedura" ? "procedure" : "moduli"}`}>
      <p className="text-sm text-muted-foreground">
        {voci.length} {tipo === "procedura" ? "procedure" : "moduli"} · {approvate} approvat
        {tipo === "procedura" ? "e" : "i"}. Il testo è comune a tutti gli studi e si personalizza blocco per
        blocco: le modifiche valgono solo per questa azienda.
      </p>

      {gruppi.map((g) => (
        <section key={g.nome} aria-label={g.nome}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.nome}</h2>
          <ul className="mt-2 divide-y rounded-xl border">
            {g.voci.map((v) => (
              <li key={v.code}>
                <Link
                  href={href(v.code)}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  data-slot="voce-corpus"
                >
                  <span className="w-24 shrink-0 font-mono text-[12px] text-muted-foreground">{v.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{v.titolo}</span>
                  {v.rif && (
                    <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{v.rif}</span>
                  )}
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px]">
                    <span className="size-2 rounded-full" style={{ background: COLORE_STATO[v.stato] }} />
                    <span className="text-muted-foreground">{ETICHETTA_STATO[v.stato]}</span>
                  </span>
                  <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                    rev {v.revisione}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
