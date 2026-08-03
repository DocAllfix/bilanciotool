"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// Informativa breve al primo accesso.
//
// NON è un banner di consenso, ed è una scelta, non una dimenticanza: il
// servizio usa soltanto cookie tecnici, per i quali l'art. 122 del Codice
// privacy e le Linee guida del Garante del 10 giugno 2021 richiedono
// l'informativa e NON il consenso. Un riquadro con «accetta» e «rifiuta»
// prometterebbe una scelta che non esiste, e il rifiuto non potrebbe funzionare:
// senza cookie di sessione non si entra nell'area riservata.
//
// Se un domani entrasse una analitica, questo componente diventa un consenso
// vero (categorie, revoca, blocco preventivo degli script): la nota si
// sostituisce, non si smonta.

const CHIAVE = "evalisdeck-cookie-informativa";

// L'archiviazione locale è stato ESTERNO al React: si legge con
// useSyncExternalStore e non con un effetto che chiama setState, così non c'è
// un doppio render a ogni pagina e l'istantanea lato server è esplicita.
let letta: boolean | null = null;
const ascoltatori = new Set<() => void>();

function leggi(): boolean {
  if (letta === null) {
    try {
      letta = localStorage.getItem(CHIAVE) !== null;
    } catch {
      // Archiviazione negata (navigazione privata restrittiva): non insistiamo.
      // Meglio nessuna nota che una nota su ogni singola pagina.
      letta = true;
    }
  }
  return letta;
}

/** Lato server la diamo per letta: così non viene resa nell'HTML e non c'è
 *  nessun lampo per chi l'ha già chiusa. */
const lettaSulServer = () => true;

function iscrivi(avvisa: () => void) {
  ascoltatori.add(avvisa);
  return () => {
    ascoltatori.delete(avvisa);
  };
}

function segnaLetta() {
  try {
    localStorage.setItem(CHIAVE, "1");
  } catch {
    // Se non possiamo ricordarlo fra le visite, almeno non la ripresentiamo ora.
  }
  letta = true;
  for (const avvisa of ascoltatori) avvisa();
}

export function InformativaCookie() {
  const giaLetta = useSyncExternalStore(iscrivi, leggi, lettaSulServer);
  const pathname = usePathname();

  // Il documento pubblicato è un altro registro, e soprattutto è la pagina che
  // Chromium trasforma in PDF: una nota fissa in fondo finirebbe stampata dentro
  // il documento consegnato al cliente.
  const dentroUnDocumento = pathname?.startsWith("/documento/") ?? false;

  if (giaLetta || dentroUnDocumento) return null;

  return (
    <div
      role="region"
      aria-label="Informativa sui cookie"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-lg print:hidden sm:inset-x-5 sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Questo sito usa <strong className="font-medium text-foreground">soltanto cookie tecnici</strong>, necessari
          all&apos;accesso e al funzionamento della piattaforma. Nessuna profilazione, nessuna pubblicità, nessuna
          statistica di terze parti: per questo non ti chiediamo un consenso, ma vogliamo che tu lo sappia. Il dettaglio
          è nella{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            cookie policy
          </Link>{" "}
          e nell&apos;
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            informativa privacy
          </Link>
          .
        </p>
        <Button size="sm" onClick={segnaLetta} className="shrink-0 sm:min-w-28">
          Ho capito
        </Button>
      </div>
    </div>
  );
}
