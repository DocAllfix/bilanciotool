import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudioAdmin } from "@/features/auth/guards";
import { getQuadroAbbonamento } from "@/features/studio/queries";
import { stripe, stripeConfigurato } from "@/lib/stripe/client";
import { euro } from "@/lib/prezzi";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Building2, Share2 } from "lucide-react";

export const metadata: Metadata = { title: "Benvenuto" };
export const dynamic = "force-dynamic";

// Dove si atterra dopo aver pagato.
//
// È il momento in cui nasce il rimpianto: uno studio ha appena speso qualche migliaio
// di euro e, se ritrova la stessa schermata di prima, si chiede che cosa ha comprato.
// Questa pagina fa una cosa sola — mostrare che qualcosa È cambiato — e indica il primo
// passo concreto invece di ringraziare e basta.
//
// ⚠️ NON attiva niente. L'account lo sblocca il webhook, quando Stripe conferma il
// pagamento. Se qui si attivasse leggendo `session_id`, basterebbe indovinare un
// indirizzo per avere il prodotto gratis. Se il webhook non è ancora arrivato — capita,
// sono secondi — lo si dice invece di fingere.

export default async function BenvenutoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const s = await requireStudioAdmin();
  if (!session_id || !stripeConfigurato()) redirect("/impostazioni/abbonamento");

  const quadro = await getQuadroAbbonamento(s.userId, s.orgId);

  // La sessione serve solo a raccontare cosa è stato comprato: l'importo pagato lo
  // dice Stripe, non noi, ed è l'unico modo perché il numero mostrato sia quello vero.
  let pagato: number | null = null;
  try {
    const sessione = await stripe().checkout.sessions.retrieve(session_id);
    // Una sessione di un'altra organizzazione non racconta niente a questa.
    if (sessione.client_reference_id === s.orgId) pagato = sessione.amount_total;
  } catch {
    pagato = null;
  }

  const attivo = quadro.status === "active";

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pagamento ricevuto</h1>
          {pagato !== null && (
            <p className="text-sm text-muted-foreground">
              {euro(pagato)} · la ricevuta arriva da Stripe per email
            </p>
          )}
        </div>
      </div>

      {attivo ? (
        <div className="mt-6 rounded-lg border p-5">
          <p className="text-sm font-medium">
            {quadro.nomePiano ? `Piano ${quadro.nomePiano} attivo.` : "Abbonamento attivo."}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Da adesso puoi creare fino a {quadro.aziendeTotali} aziende e invitare{" "}
            {quadro.accessiTotali} persone. Pubblicare documenti e generare i PDF non è più bloccato.
          </p>
        </div>
      ) : (
        // Il webhook di Stripe arriva in pochi secondi, ma non è istantaneo: dirlo è
        // meglio che mostrare un account ancora bloccato senza spiegazione.
        <div className="mt-6 rounded-lg border border-warning/40 bg-warning-subtle p-5">
          <p className="text-sm font-medium">Stiamo attivando il tuo account.</p>
          <p className="mt-1 text-[13px] leading-relaxed">
            Il pagamento è andato a buon fine. L&apos;attivazione richiede qualche secondo: ricarica
            questa pagina fra poco. Se dopo qualche minuto non è cambiato nulla, scrivici a{" "}
            <a href="mailto:info@evalisdeck.it" className="underline underline-offset-4">
              info@evalisdeck.it
            </a>{" "}
            e lo sistemiamo noi.
          </p>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Da dove si comincia
      </h2>
      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">Crea la prima azienda vera</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              L&apos;azienda dimostrativa resta dov&apos;è e non occupa un posto.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/dashboard">
              Vai <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Share2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium">Consegna i documenti senza allegati</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Dal fascicolo di ogni azienda generi un collegamento a scadenza: il cliente scarica i
              suoi documenti senza registrarsi.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-[13px] text-muted-foreground">
        <Link href="/impostazioni/abbonamento" className="underline underline-offset-4">
          Vedi il tuo abbonamento
        </Link>{" "}
        · <Link href="/guida" className="underline underline-offset-4">Guida all&apos;uso</Link>
      </p>
    </div>
  );
}
