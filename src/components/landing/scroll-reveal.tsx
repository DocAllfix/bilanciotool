"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Reveal allo scroll: translate+fade una volta sola, disattivato con
// prefers-reduced-motion (regola DESIGN.md). Niente librerie.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibile(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisibile(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", visibile ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Le migliaia col punto, a mano: `toLocaleString` dipende dall'ICU, e server e browser ne hanno due diversi. */
export const migliaia = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Contatore animato per la banda numeri.
//
// ⚠️ Il valore di partenza è quello VERO, non zero: la pagina è statica, e l'HTML che
// leggono un motore di ricerca o chi non ha JavaScript diceva «0 controlli». Si azzera
// solo nel browser, prima di animare.
export function Contatore({ fino, suffisso = "" }: { fino: number; suffisso?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valore, setValore] = useState(fino);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValore(fino);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // Già sullo schermo all'arrivo: niente animazione, il numero resta quello vero.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setValore(0);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const inizio = performance.now();
        const durata = 900;
        const tick = (t: number) => {
          const p = Math.min(1, (t - inizio) / durata);
          setValore(Math.round(fino * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fino]);

  return (
    <span ref={ref} data-slot="kpi">
      {migliaia(valore)}
      {suffisso}
    </span>
  );
}
