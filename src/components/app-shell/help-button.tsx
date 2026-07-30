"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { findTourForPath, type TourDef } from "@/lib/tour/registry";
import { Button } from "@/components/ui/button";
import { CircleHelp } from "lucide-react";

// Tour guidati (driver.js). Regole ereditate e verificate dalla reference:
// - bug v1.x: la X non chiude da sola → onCloseClick DEVE chiamare destroy();
//   e se definisci onDestroyStarted devi chiamare destroy() tu, o Done/ESC/overlay
//   smettono di funzionare.
// - completamento in localStorage (scelta consapevole: zero migrazioni; cambiare
//   browser rifà vedere il tour, meglio che non vederlo mai).
// - prefers-reduced-motion → il tour non parte da solo, resta disponibile dal bottone.

const chiave = (pageId: string) => `evalisdeck-tour:${pageId}`;

function avvia(tour: TourDef) {
  // Solo i passi il cui elemento esiste in pagina (stati diversi = passi diversi).
  const steps = tour.steps
    .filter((s) => !s.element || document.querySelector(s.element))
    .map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.description },
    }));
  if (!steps.length) return;

  const d: Driver = driver({
    showProgress: true,
    smoothScroll: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    popoverClass: "evalisdeck-popover",
    nextBtnText: "Avanti",
    prevBtnText: "Indietro",
    doneBtnText: "Fine",
    progressText: "{{current}} di {{total}}",
    steps,
    onCloseClick: () => d.destroy(),
    onDestroyStarted: () => {
      localStorage.setItem(chiave(tour.pageId), "1");
      d.destroy();
    },
  });
  d.drive();
}

export function HelpButton() {
  const pathname = usePathname();
  const tour = findTourForPath(pathname);
  const partito = useRef<string | null>(null);

  // Avvio automatico alla prima visita della pagina (dopo il mount dei target).
  useEffect(() => {
    if (!tour) return;
    if (partito.current === tour.pageId) return;
    if (localStorage.getItem(chiave(tour.pageId))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    partito.current = tour.pageId;
    const t = setTimeout(() => avvia(tour), 1100);
    return () => clearTimeout(t);
  }, [tour]);

  if (!tour) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed bottom-5 right-5 z-30 shadow-md"
      onClick={() => {
        localStorage.removeItem(chiave(tour.pageId));
        avvia(tour);
      }}
    >
      <CircleHelp className="size-4" /> Tour
    </Button>
  );
}
