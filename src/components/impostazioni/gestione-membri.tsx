"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Clock, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Membro, InvitoPendente } from "@/features/studio/queries";
import type { ModuloAzienda } from "@/features/companies/moduli";
import { fmtDataBreve } from "@/lib/format";
import { PercorsiDelMembro, RuoloDelMembro } from "./percorsi-membro";

// Inviti, revoche e rimozioni.
//
// Tutto passa dalle API di Better Auth, che è anche il motivo per cui il limite di accessi
// vive in un aggancio su quelle rotte invece che in una server action: qui il client chiama
// il plugin direttamente, e un controllo scritto altrove non verrebbe attraversato.
//
// L'errore del server si mostra **come arriva**: quando il posto finisce, il messaggio dice
// già «Limite di N membri per studio raggiunto», e riscriverlo qui significherebbe avere due
// versioni della stessa frase che prima o poi si contraddicono.

const data = (d: Date | string) =>
  fmtDataBreve(d);

// Il ruolo come lo legge una persona: «owner» e «member» sono nomi di Better Auth.
const RUOLO: Record<string, string> = { owner: "Titolare", admin: "Amministratore", member: "Collaboratore" };

export function GestioneMembri({
  organizationId,
  membri,
  inviti,
  pieno,
  limite,
  puoGestire,
  ioSono,
  interno = false,
  assegnazioni = {},
}: {
  organizationId: string;
  membri: Membro[];
  inviti: InvitoPendente[];
  pieno: boolean;
  limite: number;
  puoGestire: boolean;
  ioSono: string;
  /** Fascia «Azienda»: ruoli e percorsi assegnati a ciascuno. */
  interno?: boolean;
  assegnazioni?: Record<string, ModuloAzienda[]>;
}) {
  const [email, setEmail] = useState("");
  const [ruoloInvito, setRuoloInvito] = useState<"member" | "admin">("member");
  const [inCorso, setInCorso] = useState(false);
  const router = useRouter();

  async function invita(e: React.FormEvent) {
    e.preventDefault();
    const indirizzo = email.trim().toLowerCase();
    if (!indirizzo) return;
    setInCorso(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email: indirizzo,
        // Negli studi ognuno è un membro come prima; nella fascia «Azienda» si sceglie.
        role: interno ? ruoloInvito : "member",
        organizationId,
      });
      if (error) {
        toast.error(error.message ?? "Invito non riuscito.");
        return;
      }
      toast.success(`Invito inviato a ${indirizzo}.`);
      setEmail("");
      router.refresh();
    } finally {
      setInCorso(false);
    }
  }

  async function revoca(invitationId: string, indirizzo: string) {
    const { error } = await authClient.organization.cancelInvitation({ invitationId });
    if (error) {
      toast.error(error.message ?? "Revoca non riuscita.");
      return;
    }
    toast.success(`Invito a ${indirizzo} revocato.`);
    router.refresh();
  }

  async function rimuovi(memberIdOrEmail: string, nome: string) {
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail,
      organizationId,
    });
    if (error) {
      toast.error(error.message ?? "Rimozione non riuscita.");
      return;
    }
    toast.success(`${nome} non fa più parte ${interno ? "dell'azienda" : "dello studio"}.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {membri.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3" data-membro={m.email}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.nome}</p>
              <p className="truncate text-[13px] text-muted-foreground">{m.email}</p>
            </div>
            {interno && puoGestire && m.ruolo !== "owner" && m.userId !== ioSono ? (
              <RuoloDelMembro memberId={m.id} nome={m.nome} ruolo={m.ruolo === "admin" ? "admin" : "member"} />
            ) : (
              <Badge variant={m.ruolo === "owner" ? "default" : "secondary"}>{RUOLO[m.ruolo] ?? m.ruolo}</Badge>
            )}
            {/* Il titolare non si rimuove, e nessuno rimuove sé stesso: lo studio resterebbe
                senza nessuno che possa amministrarlo. */}
            {puoGestire && m.ruolo !== "owner" && m.userId !== ioSono && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => rimuovi(m.id, m.nome)}
                className="text-muted-foreground hover:text-destructive"
              >
                Rimuovi
              </Button>
            )}
            {/* Solo i collaboratori hanno percorsi assegnati: titolare e amministratori li
                vedono tutti, e una casella spenta accanto a loro direbbe il falso. */}
            {interno && m.ruolo === "member" && (puoGestire ? (
              <PercorsiDelMembro userId={m.userId} nome={m.nome} assegnati={assegnazioni[m.userId] ?? []} />
            ) : (
              <p className="w-full text-[12.5px] text-muted-foreground">
                {(assegnazioni[m.userId] ?? []).length
                  ? `Percorsi assegnati: ${(assegnazioni[m.userId] ?? []).length}`
                  : "Nessun percorso assegnato"}
              </p>
            ))}
          </li>
        ))}
      </ul>

      {inviti.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">In attesa di risposta</h3>
          <ul className="mt-2 divide-y rounded-lg border">
            {inviti.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.email}</p>
                  <p className="text-[12.5px] text-muted-foreground">scade il {data(i.scadeIl)}</p>
                </div>
                {puoGestire && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoca(i.id, i.email)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Revoca l'invito a ${i.email}`}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {puoGestire && (
        <form method="post" onSubmit={invita} className="border-t pt-5">
          <label htmlFor="invita-email" className="text-sm font-medium">
            Invita un collega
          </label>
          {interno && (
            <fieldset className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <legend className="sr-only">Ruolo della persona invitata</legend>
              {(
                [
                  ["member", "Collaboratore", "vede solo i percorsi che gli assegni"],
                  ["admin", "Amministratore", "vede tutto e assegna i percorsi"],
                ] as const
              ).map(([valore, etichetta, cosa]) => (
                <label key={valore} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ruolo-invito"
                    value={valore}
                    checked={ruoloInvito === valore}
                    onChange={() => setRuoloInvito(valore)}
                    className="accent-primary"
                  />
                  <span>
                    {etichetta} <span className="text-muted-foreground">· {cosa}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="invita-email"
              type="email"
              required
              placeholder={interno ? "nome@azienda.it" : "nome@studio.it"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pieno || inCorso}
              className="flex-1"
            />
            <Button type="submit" disabled={pieno || inCorso} className="shrink-0">
              <Mail className="size-4" /> {inCorso ? "Invio…" : "Invia invito"}
            </Button>
          </div>
          {pieno ? (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Hai occupato tutti i {limite} accessi del tuo piano. Rimuovi qualcuno, oppure aggiungi accessi
              dalla scheda Abbonamento.
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {interno
                ? ruoloInvito === "admin"
                  ? "Riceverà un collegamento per entrare. Da amministratore vedrà tutti i percorsi e potrà assegnarli."
                  : "Riceverà un collegamento per entrare. Vedrà i percorsi che gli assegnerai qui, dopo che avrà accettato."
                : "Riceverà un collegamento per entrare nello studio. Vedrà tutte le aziende del portafoglio."}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
