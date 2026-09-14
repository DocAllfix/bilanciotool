import type { Metadata } from "next";
import { requireActiveOrg } from "@/features/auth/guards";
import { mieiTicket } from "@/features/assistenza";
import { VistaAssistenza } from "@/components/assistenza/vista-assistenza";

// ⚠️ `requireActiveOrg` e non `requireConsultant` con l'entitlement: l'assistenza NON sta
// dietro il paywall. Chi ha l'abbonamento scaduto o il pagamento rifiutato è esattamente
// chi ha bisogno di scrivere.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assistenza" };

export default async function AssistenzaPage() {
  const s = await requireActiveOrg();
  return <VistaAssistenza ticket={await mieiTicket(s.userId, s.orgId)} />;
}
