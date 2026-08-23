"use client";

import Link from "next/link";
import type { VoceRegistro } from "@/features/corpus/letture";

// L'elenco dei registri di un modulo.
//
// ⚠️ Questa vista mancava a TUTTI i moduli, ed è la parte dove il consulente registra
// l'evidenza operativa del sistema: aspetti ambientali, non conformità, audit, obblighi,
// scadenze. Nel Sistema integrato QAS gli aspetti ambientali e i pericoli SSL non hanno
// una vista propria — sono due di questi registri, con una colonna calcolata — quindi
// senza questa superficie due dei tre motori di quel modulo non hanno da dove leggere.

export function VistaRegistri({
  registri,
  href,
}: {
  registri: readonly VoceRegistro[];
  /** L'indirizzo di un registro. Lo costruisce il modulo: il corpus è condiviso. */
  href: (registerId: string) => string;
}) {
  if (!registri.length) {
    return (
      <p className="rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
        Nessun registro previsto da questo sistema.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-tour="corpus-registri">
      <p className="text-sm text-muted-foreground">
        Le registrazioni che costituiscono l&apos;evidenza operativa del sistema. Ogni registro ha il proprio
        modulo del corpus come intestazione stampata.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {registri.map((r) => (
          <li key={r.registerId}>
            <Link
              href={href(r.registerId)}
              className="block h-full rounded-xl border p-4 transition-colors hover:bg-muted/40"
              data-slot="scheda-registro"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.modCode ?? "—"}
                  {r.capitolo ? ` · punto ${r.capitolo}` : ""}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                  style={{
                    background: r.righe ? "var(--primary)" : "var(--muted)",
                    color: r.righe ? "white" : "var(--muted-foreground)",
                  }}
                  data-slot="conteggio-registro"
                >
                  {r.righe}
                </span>
              </span>
              <span className="mt-1.5 block text-[14px] font-medium">{r.nome}</span>
              {r.descrizione && (
                <span className="mt-1 block text-[12px] text-muted-foreground">{r.descrizione}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
