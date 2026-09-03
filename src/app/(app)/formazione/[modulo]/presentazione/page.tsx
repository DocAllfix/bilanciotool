import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { corsoDelModulo, esisteCorso } from "@/features/formazione";
import { costruisciSlide } from "@/features/formazione/presentazione";
import { pistaPerSlide } from "@/features/formazione/audio";
import { MODULI_AZIENDA, AREE } from "@/features/companies/moduli";
import { Presentazione } from "@/components/formazione/presentazione";

type Props = { params: Promise<{ modulo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modulo } = await params;
  if (!esisteCorso(modulo)) return { title: "Formazione" };
  return { title: `${corsoDelModulo(modulo).nome} · presentazione` };
}

export default async function PresentazionePage({ params }: Props) {
  const { modulo } = await params;
  if (!esisteCorso(modulo)) notFound();

  const c = corsoDelModulo(modulo);
  const m = MODULI_AZIENDA.find((x) => x.href === modulo)!;
  const slide = costruisciSlide(c.sezioni);

  return (
    <Presentazione
      slide={slide}
      pista={pistaPerSlide(slide, modulo, c.idComuni)}
      nomeCorso={c.nome}
      tinta={{ tratto: AREE[m.area].colore.tratto }}
      href={`/formazione/${modulo}`}
    />
  );
}
