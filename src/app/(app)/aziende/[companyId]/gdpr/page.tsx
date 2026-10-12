import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireConsultant } from "@/features/auth/guards";
import { leggiPercorsoGdpr, type PercorsoGdprAvviato } from "@/features/gdpr/queries";
import { datiVistaGdpr } from "@/features/gdpr/vista";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";
import { GdprShell } from "@/components/gdpr/gdpr-shell";
import { CreaPercorsoGdpr } from "@/components/gdpr/crea-percorso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Protezione dei dati (GDPR)" };

export default async function GdprPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; anno?: string }>;
}) {
  const { companyId } = await params;
  const { vista, anno } = await searchParams;

  const s = await requireConsultant();
  const p = await leggiPercorsoGdpr(s.userId, s.orgId, companyId);
  // `null`: l'azienda non esiste o è di un altro studio, ed è un 404. Il percorso non
  // avviato è un'altra cosa, e si vede sotto — senza scrivere niente aprendo la pagina.
  if (!p) notFound();
  if (!p.sistema) {
    return (
      <CreaPercorsoGdpr
        companyId={companyId}
        aziendaNome={p.azienda.nome}
        requisiti={p.catalogo.requisiti.length}
        gruppi={p.catalogo.gruppi.length}
        archiviata={p.azienda.stato === "archived"}
      />
    );
  }

  // Il giorno e l'istante li decide il server: le scadenze si calcolano qui.
  const adesso = new Date();
  const oggi = oggiIso(adesso);
  const corrente = Number(oggi.slice(0, 4));
  const chiesto = Number(anno);
  const esercizio = Number.isInteger(chiesto) && chiesto >= corrente - 10 && chiesto <= corrente ? chiesto : corrente;

  return (
    <GdprShell
      companyId={companyId}
      dati={datiVistaGdpr(p as PercorsoGdprAvviato, esercizio, { oggi, adesso })}
      vistaIniziale={vista ?? "quadro"}
      anniDisponibili={Array.from({ length: 4 }, (_, i) => corrente - i)}
    />
  );
}
