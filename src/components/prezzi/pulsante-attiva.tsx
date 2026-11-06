"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hrefAttiva, usePeriodo } from "@/components/prezzi/periodo";
import type { PianoKey } from "@/lib/prezzi";

/** Il pulsante d'attivazione di una scheda, che porta con sé il periodo scelto. */
export function PulsanteAttiva({
  piano,
  etichetta = "Attiva questo piano",
  variante = "default",
}: {
  piano: PianoKey;
  etichetta?: string;
  variante?: "default" | "outline";
}) {
  const { periodo } = usePeriodo();
  return (
    <Button asChild className="w-full" variant={variante}>
      <Link href={hrefAttiva(piano, periodo)} data-attiva={piano}>
        {etichetta}
      </Link>
    </Button>
  );
}
