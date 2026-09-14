import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveOrg } from "@/features/auth/guards";
import { mioTicket, type StatoTicket } from "@/features/assistenza";
import { Conversazione } from "@/components/assistenza/conversazione";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Richiesta di assistenza" };

export default async function RichiestaPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const s = await requireActiveOrg();
  // ⚠️ Per chi non l'ha aperta, la richiesta NON ESISTE: nessun «non sei autorizzato», che
  // confermerebbe a un collega che quella richiesta c'è.
  const t = await mioTicket(s.userId, s.orgId, ticketId);
  if (!t) notFound();

  return (
    <Conversazione
      come="utente"
      ticketId={t.id}
      oggetto={t.oggetto}
      stato={t.stato as StatoTicket}
      messaggi={t.messaggi}
    />
  );
}
