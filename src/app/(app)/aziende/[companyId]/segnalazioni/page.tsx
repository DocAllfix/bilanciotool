import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSegnalazioni } from "@/features/segnalazioni/queries";
import { SegnalazioniShell } from "@/components/segnalazioni/segnalazioni-shell";
import { CreaAssetto } from "@/components/segnalazioni/crea-assetto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestione delle segnalazioni" };

export default async function SegnalazioniPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { companyId } = await params;
  const { vista } = await searchParams;

  const s = await requireConsultant();
  const dati = await getSegnalazioni(s.userId, s.orgId, companyId);
  // `null` significa che l'azienda non esiste o e' di un altro studio: e' un 404. La
  // gestione non ancora avviata e' un'altra cosa, e si vede sotto.
  if (!dati) notFound();

  if (!dati.assetto) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Canale interno di segnalazione · D.Lgs. 24/2023
        </p>
        <CreaAssetto companyId={companyId} />
      </div>
    );
  }

  // La data si calcola QUI, sul server, e scende come prop: in un componente client
  // sarebbe l'orologio del browser, e i termini «in scadenza» cambierebbero fra il
  // render del server e l'idratazione.
  const oggi = new Date().toISOString().slice(0, 10);
  return (
    <SegnalazioniShell
      companyId={companyId}
      dati={{ ...dati, assetto: dati.assetto }}
      vistaIniziale={vista ?? "quadro"}
      oggi={oggi}
    />
  );
}
