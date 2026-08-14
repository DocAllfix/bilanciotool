import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { leggiInvito, giaDentro, type StatoInvito } from "@/features/auth/inviti";
import { ModuloAccesso } from "../../login/modulo";
import { ModuloIscrizione } from "../../registrati/modulo";
import { BottoneAccetta } from "./accetta";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// L'accettazione di un invito.
//
// Questa pagina NON ESISTEVA. L'email diceva «Accetta l'invito» e portava a
// `/accept-invitation/<id>`, che in produzione rispondeva 404: la meta' del flusso che
// conta — entrare davvero nello studio — non e' mai stata percorsa da nessuno, mentre
// gli accessi in piu' si vendono a 200 euro l'anno. Il retro era pronto e ben fatto (chi
// e' invitato non riceve uno studio proprio, la sessione punta subito allo studio
// giusto): mancava solo la porta.
//
// E' resa a ogni richiesta, e deve esserlo: legge la sessione e lo stato dell'invito.
// Non e' una pagina di vetrina.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invito" };

/** Che cosa dire quando l'invito non e' utilizzabile. Stati distinti, rimedi distinti. */
const MESSAGGI: Record<Exclude<StatoInvito, "valido">, { titolo: string; testo: string }> = {
  inesistente: {
    titolo: "Invito non trovato",
    testo:
      "Il collegamento non corrisponde a nessun invito. Controlla di aver aperto l'ultima email ricevuta: un invito rifatto ne annulla uno precedente.",
  },
  scaduto: {
    titolo: "Invito scaduto",
    testo:
      "Questo invito non è più valido. Chiedi a chi ti ha invitato di mandartene uno nuovo: bastano pochi secondi.",
  },
  "gia-accettato": {
    titolo: "Invito già accettato",
    testo: "Fa già parte dello studio. Accedi con la tua email e lo trovi nel portafoglio.",
  },
  annullato: {
    titolo: "Invito annullato",
    testo: "Chi ti ha invitato ha annullato questo invito. Se pensi sia un errore, scrivigli.",
  },
};

function Guscio({ titolo, sotto, children }: { titolo: string; sotto?: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold tracking-tight">{titolo}</h1>
        {sotto && <p className="text-sm text-muted-foreground">{sotto}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NonUtilizzabile({ stato }: { stato: Exclude<StatoInvito, "valido"> }) {
  const m = MESSAGGI[stato];
  return (
    <Guscio titolo={m.titolo} sotto={m.testo}>
      <Button asChild className="w-full">
        <Link href="/login">Vai all&apos;accesso</Link>
      </Button>
    </Guscio>
  );
}

export default async function AccettaInvitoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invito = await leggiInvito(id);

  // Due controlli separati e non uno con `||`: cosi' TypeScript sa, nel secondo, che
  // «valido» e' gia' escluso. Con la condizione unita non lo sapeva, e l'unico modo di
  // farla compilare sarebbe stato un `as` — che avrebbe zittito proprio il controllo
  // utile, quello che aggiungendo uno stato nuovo pretende il suo messaggio.
  if (invito === null) return <NonUtilizzabile stato="inesistente" />;
  if (invito.stato !== "valido") return <NonUtilizzabile stato={invito.stato} />;

  const sessione = await auth.api.getSession({ headers: await headers() });
  const destinazione = `/accept-invitation/${invito.id}`;
  const chiInvita = invito.invitatoDa ? ` da ${invito.invitatoDa}` : "";
  const sotto = `Sei stato invitato${chiInvita} a entrare in ${invito.studio}.`;

  // ── Nessuna sessione: prima si entra, poi si accetta ────────────────────────
  //
  // Le due strade stanno sulla STESSA pagina, e non dietro un collegamento a /login o
  // /registrati: quelle due pagine riportano al portafoglio, e l'invito resterebbe in
  // un'email gia' aperta. La `destinazione` la scrive il server ed e' sempre questa
  // pagina — mai un indirizzo che arriva dal browser.
  if (!sessione?.user) {
    return (
      <Guscio titolo={`Entra in ${invito.studio}`} sotto={sotto}>
        <p className="mb-4 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          L&apos;invito è per <span className="font-medium text-foreground">{invito.email}</span>: usa questo
          indirizzo, altrimenti non potrà essere accettato.
        </p>

        <h2 className="mb-3 text-sm font-medium">Non hai ancora un account</h2>
        <ModuloIscrizione destinazione={destinazione} emailFissa={invito.email} />

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          oppure
          <span className="h-px flex-1 bg-border" />
        </div>

        <h2 className="mb-3 text-sm font-medium">Hai già un account EvalisDeck</h2>
        <ModuloAccesso destinazione={destinazione} idPrefisso="accesso-" />
      </Guscio>
    );
  }

  // ── Sessione di un'altra persona ────────────────────────────────────────────
  //
  // Non si accetta in silenzio con l'account sbagliato: chi lavora su piu' studi ha spesso
  // gia' una sessione aperta, e si ritroverebbe il collega dentro l'organizzazione sbagliata
  // senza aver capito quando.
  if (sessione.user.email.toLowerCase() !== invito.email) {
    return (
      <Guscio
        titolo="Sei entrato con un altro indirizzo"
        sotto={`L'invito è per ${invito.email}, ma la sessione aperta è di ${sessione.user.email}.`}
      >
        <form
          action={async () => {
            "use server";
            await auth.api.signOut({ headers: await headers() });
          }}
        >
          <Button type="submit" variant="outline" className="w-full">
            Esci e usa {invito.email}
          </Button>
        </form>
      </Guscio>
    );
  }

  if (await giaDentro(sessione.user.id, invito.organizationId)) {
    return (
      <Guscio titolo="Fai già parte di questo studio" sotto={`${invito.studio} è già nel tuo portafoglio.`}>
        <Button asChild className="w-full">
          <Link href="/dashboard">Vai al portafoglio</Link>
        </Button>
      </Guscio>
    );
  }

  return (
    <Guscio titolo={`Entra in ${invito.studio}`} sotto={sotto}>
      <BottoneAccetta invitationId={invito.id} studio={invito.studio} />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Entrerai come collaboratore: vedrai le aziende dello studio e potrai lavorarci.
      </p>
    </Guscio>
  );
}
