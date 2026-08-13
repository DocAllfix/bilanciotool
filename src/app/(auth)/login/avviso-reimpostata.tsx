"use client";

import { useSearchParams } from "next/navigation";

// «La password è cambiata, ora usala». Sta in un componente a parte perché
// `useSearchParams` obbliga a un confine di sospensione: messo dentro la pagina,
// toglierebbe alla schermata di accesso la generazione statica — che è il difetto
// costato il 500 sul primo articolo del blog.
export function AvvisoReimpostata() {
  if (useSearchParams().get("reimpostata") !== "1") return null;
  return (
    <p className="mb-4 rounded-lg border border-primary/30 bg-accent px-3 py-2 text-[13px] text-accent-foreground">
      Password aggiornata. Entra con quella nuova.
    </p>
  );
}
