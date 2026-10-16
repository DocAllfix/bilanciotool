import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireConsultant } from "@/features/auth/guards";
import { leggiPercorsoPas, type PercorsoPasAvviato } from "@/features/pas/queries";
import { datiVistaPas } from "@/features/pas/vista";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";
import { PasShell } from "@/components/pas/pas-shell";
import { CreaPercorsoPas } from "@/components/pas/crea-percorso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sistema di gestione sociale (PAS 24000)" };

export default async function PasPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; anno?: string }>;
}) {
  const { companyId } = await params;
  const { vista, anno } = await searchParams;

  const s = await requireConsultant();
  const p = await leggiPercorsoPas(s.userId, s.orgId, companyId);
  // `null`: l'azienda non esiste o è di un altro studio, ed è un 404. Il percorso non
  // avviato è un'altra cosa, e si vede sotto — senza scrivere niente aprendo la pagina.
  if (!p) notFound();
  if (!p.sistema) {
    const natura = (n: string) => p.catalogo.requisiti.filter((r) => p.catalogo.gruppi.find((g) => g.key === r.gruppoKey)?.natura === n).length;
    return (
      <CreaPercorsoPas
        companyId={companyId}
        aziendaNome={p.azienda.nome}
        requisiti={p.catalogo.requisiti.length}
        sistema={natura("sistema")}
        allegato={natura("allegato")}
        parti={p.catalogo.partiTipo.length}
        rischi={p.catalogo.rischiTipo.length}
        archiviata={p.azienda.stato === "archived"}
      />
    );
  }

  // Il giorno lo decide il server: l'età dei reclami e le azioni scadute si calcolano qui.
  const oggi = oggiIso(new Date());
  const corrente = Number(oggi.slice(0, 4));
  const chiesto = Number(anno);
  const esercizio = Number.isInteger(chiesto) && chiesto >= corrente - 10 && chiesto <= corrente ? chiesto : corrente;

  return (
    <PasShell
      companyId={companyId}
      dati={datiVistaPas(p as PercorsoPasAvviato, esercizio, oggi)}
      vistaIniziale={vista ?? "quadro"}
      anniDisponibili={Array.from({ length: 4 }, (_, i) => corrente - i)}
    />
  );
}
