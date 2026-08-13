"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { findTourForPath } from "@/lib/tour/registry";
import { avviaTour, tourGiaVisto } from "@/lib/tour/avvia";
import { benvenutoGiaVisto } from "@/lib/tour/presentazione";
import { Button } from "@/components/ui/button";
import { CircleHelp } from "lucide-react";

// Il tour della pagina corrente, a richiesta o alla prima visita.
//
// La regia sta in `lib/tour/avvia.ts`: la usa anche la sequenza di benvenuto, e due
// copie della stessa logica divergono al primo aggiustamento.
//
// - completamento in localStorage (scelta consapevole: zero migrazioni; cambiare
//   browser rifà vedere il tour, meglio che non vederlo mai).
// - prefers-reduced-motion → il tour non parte da solo, resta disponibile dal bottone.

export function HelpButton({ inProva = false }: { inProva?: boolean }) {
  const pathname = usePathname();
  const tour = findTourForPath(pathname);
  const partito = useRef<string | null>(null);

  // Avvio automatico alla prima visita della pagina (dopo il mount dei target).
  useEffect(() => {
    if (!tour) return;
    if (partito.current === tour.pageId) return;
    if (tourGiaVisto(tour.pageId)) return;
    // Finché la sequenza di benvenuto non è stata vista, conduce lei. Il collaudo l'ha
    // trovata così: il velo di questo tour si apriva SOPRA il video, e il pulsante per
    // proseguire diventava incliccabile. Non basta chiedere «giro in corso?»: fra il
    // video e la prima tappa il giro non è ancora cominciato, ed è proprio lì che si
    // sovrapponevano. Il fatto discriminante è il benvenuto ancora da vedere, e lo sa
    // il server — niente gara fra due effetti montati insieme.
    if (inProva && !benvenutoGiaVisto()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    partito.current = tour.pageId;
    const t = setTimeout(() => avviaTour(tour), 1100);
    return () => clearTimeout(t);
  }, [tour, inProva]);

  if (!tour) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed bottom-5 right-5 z-30 shadow-md"
      onClick={() => avviaTour(tour)}
    >
      <CircleHelp className="size-4" /> Tour
    </Button>
  );
}
