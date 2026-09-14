import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sessioneStaff } from "../../guardia";
import { ticketPerStaff, type StatoTicket } from "@/features/assistenza";
import { Conversazione } from "@/components/assistenza/conversazione";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Richiesta in coda" };

export default async function RichiestaStaffPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const s = await sessioneStaff();
  const t = await ticketPerStaff(s.userId, ticketId);
  if (!t) notFound();

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-5 pt-6">
        <Link href="/staff/assistenza" className="text-[12px] text-muted-foreground underline underline-offset-2">
          ← Torna alla coda
        </Link>
      </div>
      <Conversazione
        come="staff"
        ticketId={t.id}
        oggetto={t.oggetto}
        stato={t.stato as StatoTicket}
        messaggi={t.messaggi}
        intestazione={`${t.nome} · ${t.email} · ${t.studio}`}
      />
    </>
  );
}
