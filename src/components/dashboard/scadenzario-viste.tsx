"use client";

import { useState } from "react";
import Link from "next/link";

import { MODULI_AZIENDA, AREE, type AreaModuli } from "@/features/companies/moduli";
import { testoMotivo, type VoceScadenzario } from "@/features/companies/scadenzario-voce";
import { cn } from "@/lib/utils";

/**
 * Lo scadenzario, guardato da tre lati.
 *
 * ⚠️ È PRESENTAZIONE, NON DATI. `VoceScadenzario` porta già azienda e percorso, e l'area si
 * ricava dal registro: le tre viste lavorano sullo stesso elenco, in memoria. Non c'è una
 * sola query in più, e conta — la dashboard è la pagina più lenta del prodotto, e un
 * viaggio al database costa fra i 70 e i 144 millisecondi mentre filtrare una lista di
 * qualche decina di voci non costa niente.
 *
 * ⚠️ E LE TRE VISTE NON RIPETONO LA STESSA LISTA. Per urgenza la domanda è «cosa faccio
 * adesso», e la risposta è un elenco di cose. Per cliente e per ambito le domande sono
 * «chi è più indietro» e «dove sono indietro»: la risposta è una riga per gruppo, col
 * conto e la cosa più urgente. Tre copie dello stesso elenco sarebbero tre modi di
 * scorrere, non tre modi di capire.
 *
 * ⚠️ L'azienda dimostrativa non arriva qui: il chiamante passa solo le voci vere. La
 * stessa azienda non può essere fuori da un conteggio e dentro un altro, ed è la regola
 * per cui i limiti del piano la escludono già.
 */

type Vista = "urgenza" | "cliente" | "ambito";

const VISTE: [Vista, string][] = [
  ["urgenza", "Per urgenza"],
  ["cliente", "Per cliente"],
  ["ambito", "Per ambito"],
];

/** Un gruppo: un'etichetta, quante voci, e la più urgente. */
type Gruppo = {
  chiave: string;
  etichetta: string;
  tratto?: string;
  voci: VoceScadenzario[];
};

function perCliente(voci: VoceScadenzario[]): Gruppo[] {
  const m = new Map<string, Gruppo>();
  for (const v of voci) {
    const g = m.get(v.companyId) ?? { chiave: v.companyId, etichetta: v.companyNome, voci: [] };
    g.voci.push(v);
    m.set(v.companyId, g);
  }
  // Più voci in sospeso = più indietro. A parità, il più urgente per primo: l'elenco
  // arriva già ordinato per priorità, quindi la prima voce di ogni gruppo è la sua.
  return [...m.values()].sort((a, z) => z.voci.length - a.voci.length || a.voci[0]!.priorita - z.voci[0]!.priorita);
}

function perAmbito(voci: VoceScadenzario[]): Gruppo[] {
  const m = new Map<AreaModuli, Gruppo>();
  for (const v of voci) {
    const modulo = MODULI_AZIENDA.find((x) => x.href === v.modulo);
    if (!modulo) continue;
    const area = modulo.area;
    const g =
      m.get(area) ?? { chiave: area, etichetta: AREE[area].nome, tratto: AREE[area].colore.tratto, voci: [] };
    g.voci.push(v);
    m.set(area, g);
  }
  return [...m.values()].sort((a, z) => z.voci.length - a.voci.length);
}

function RigaGruppo({ g }: { g: Gruppo }) {
  const prima = g.voci[0]!;
  const modulo = MODULI_AZIENDA.find((x) => x.href === prima.modulo)!;
  return (
    <li>
      <Link
        href={prima.href}
        className="group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
      >
        {g.tratto ? (
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", g.tratto)} aria-hidden />
        ) : (
          <modulo.icona
            className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
            strokeWidth={1.75}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium leading-snug">{g.etichetta}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground" data-slot="kpi">
              {g.voci.length}
            </span>
          </span>
          {/* La più urgente del gruppo: senza, il conto dice quanto ma non che cosa. */}
          <span className="block truncate text-[12px] text-muted-foreground">
            {g.tratto ? `${prima.companyNome} · ` : ""}
            {modulo.nome}
            {prima.anno !== null ? ` ${prima.anno}` : ""} · {testoMotivo(prima.motivo)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ScadenzarioViste({ voci }: { voci: VoceScadenzario[] }) {
  const [vista, setVista] = useState<Vista>("urgenza");

  const gruppi = vista === "cliente" ? perCliente(voci) : vista === "ambito" ? perAmbito(voci) : [];
  const quanti = vista === "urgenza" ? voci.length : gruppi.length;
  const mostrati = vista === "urgenza" ? 6 : 5;

  return (
    <>
      {/* ⚠️ Comando OTTIMISTICO: la vista cambia subito con lo stato locale, senza
          chiedere niente al server. È la regola nata in Fase 12: un interruttore che il
          server non rivalida deve rispondere all'istante, o si legge come rotto. */}
      <div className="mt-2 flex gap-1" role="tablist" aria-label="Come raggruppare">
        {VISTE.map(([v, etichetta]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={vista === v}
            onClick={() => setVista(v)}
            className={cn(
              "tocco-comodo rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors",
              vista === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {etichetta}
          </button>
        ))}
      </div>

      <ul className="mt-2 space-y-1" data-scadenzario={vista}>
        {vista === "urgenza"
          ? voci.slice(0, mostrati).map((v) => {
              const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
              return (
                <li key={`${v.companyId}-${v.modulo}`}>
                  <Link
                    href={v.href}
                    className="group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <m.icona
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 flex-1">
                      {/* ⚠️ Va a capo, non tronca: il nome del percorso è lo stesso che
                          compare nel fascicolo e nella barra laterale, e due dei dodici
                          sono lunghi. Un nome corto e DIVERSO da quello del resto del
                          prodotto è il difetto per cui è stato tolto il campo `etichetta`. */}
                      <span className="block text-[13px] font-medium leading-snug">
                        {m.nome}
                        {v.anno !== null && <span className="text-muted-foreground"> · {v.anno}</span>}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {v.companyNome} · {testoMotivo(v.motivo)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })
          : gruppi.slice(0, mostrati).map((g) => <RigaGruppo key={g.chiave} g={g} />)}
      </ul>

      {quanti > mostrati && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          e {vista === "urgenza" ? "altri" : vista === "cliente" ? "altri clienti" : "altri ambiti"}:{" "}
          {quanti - mostrati}
        </p>
      )}
    </>
  );
}
