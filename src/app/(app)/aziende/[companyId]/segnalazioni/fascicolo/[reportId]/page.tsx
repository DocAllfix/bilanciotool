import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getFascicolo } from "@/features/segnalazioni/queries";
import { VistaFascicolo } from "@/components/segnalazioni/vista-fascicolo";

// Il fascicolo ha una PAGINA PROPRIA, e non e' una scelta di navigazione.
//
// `getFascicolo` scrive nel registro degli accessi: chi, quando, quale fascicolo. Con
// una pagina l'evento registrato coincide con un fatto reale — qualcuno ha aperto quel
// fascicolo — e l'indirizzo si puo' correlare al registro. Dentro una scheda della shell
// l'apertura sarebbe una chiamata fra le altre, e il registro finirebbe pieno di righe
// prodotte dal render invece che da una persona.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fascicolo di segnalazione" };

export default async function FascicoloPage({
  params,
}: {
  params: Promise<{ companyId: string; reportId: string }>;
}) {
  const { companyId, reportId } = await params;

  const s = await requireConsultant();
  const fascicolo = await getFascicolo(s.userId, s.orgId, reportId);
  if (!fascicolo) notFound();

  const oggi = new Date().toISOString().slice(0, 10);
  return <VistaFascicolo companyId={companyId} fascicolo={fascicolo} oggi={oggi} />;
}
