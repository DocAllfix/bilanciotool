"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CampoCasella } from "@/components/comune/percorso";
import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";
import { assegnaPercorsoAction, cambiaRuoloAction } from "@/features/studio/assegnazioni-actions";
import { cn } from "@/lib/utils";

// Fascia «Azienda»: che cosa fa ciascuno.
//
// ⚠️ Una casella per percorso, e ogni casella salva SOLO sé stessa (\`assegnaPercorsoAction\`
// con lo stato voluto). Nessun «Salva» in fondo che rimandi l'elenco intero: due
// amministratori che assegnano insieme si cancellerebbero a vicenda.

export function PercorsiDelMembro({
  userId,
  nome,
  assegnati,
}: {
  userId: string;
  nome: string;
  assegnati: readonly ModuloAzienda[];
}) {
  return (
    <fieldset className="mt-3 w-full rounded-md border bg-muted/30 px-3 py-3" data-percorsi-membro={userId}>
      <legend className="px-1 text-[12px] font-medium text-muted-foreground">Percorsi di {nome}</legend>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {MODULI_PER_AREA.map((g) => (
          <div key={g.area}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={cn("size-2 shrink-0 rounded-full", g.colore.tratto)} aria-hidden />
              {g.nome}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {g.moduli.map((m) => (
                <CampoCasella
                  key={m.href}
                  id={`percorso-${userId}-${m.href}`}
                  etichetta={m.nome}
                  valore={assegnati.includes(m.href)}
                  salva={(acceso) => assegnaPercorsoAction({ userId, modulo: m.href, acceso })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Amministratore o collaboratore: due bottoni, quello attivo premuto. */
export function RuoloDelMembro({
  memberId,
  nome,
  ruolo,
}: {
  memberId: string;
  nome: string;
  ruolo: "admin" | "member";
}) {
  const router = useRouter();
  const [attuale, setAttuale] = useState(ruolo);
  const [inCorso, avvia] = useTransition();
  const scegli = (nuovo: "admin" | "member") => {
    if (nuovo === attuale) return;
    const prima = attuale;
    setAttuale(nuovo);
    avvia(async () => {
      const esito = await cambiaRuoloAction({ memberId, ruolo: nuovo });
      if (!esito.ok) {
        setAttuale(prima);
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });
  };
  return (
    <div role="group" aria-label={`Ruolo di ${nome}`} className="inline-flex rounded-md border p-0.5">
      {(
        [
          ["admin", "Amministratore"],
          ["member", "Collaboratore"],
        ] as const
      ).map(([valore, etichetta]) => (
        <button
          key={valore}
          type="button"
          aria-pressed={attuale === valore}
          disabled={inCorso}
          onClick={() => scegli(valore)}
          className={cn(
            "rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
            attuale === valore ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {etichetta}
        </button>
      ))}
    </div>
  );
}
