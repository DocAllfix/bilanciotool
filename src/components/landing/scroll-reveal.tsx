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
