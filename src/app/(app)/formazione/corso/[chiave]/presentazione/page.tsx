import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { corsoTrasversale, esisteCorsoTrasversale } from "@/features/formazione";
import { costruisciSlide } from "@/features/formazione/presentazione";
import { pistaPerSlide } from "@/features/formazione/audio";
import { Presentazione } from "@/components/formazione/presentazione";

type Props = { params: Promise<{ chiave: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chiave } = await params;
  if (!esisteCorsoTrasversale(chiave)) return { title: "Formazione" };
  return { title: `${corsoTrasversale(chiave).nome} · presentazione` };
}

export default async function PresentazioneTrasversalePage({ params }: Props) {
  const { chiave } = await params;
  if (!esisteCorsoTrasversale(chiave)) notFound();

  const c = corsoTrasversale(chiave);
  const slide = costruisciSlide([...c.sezioni]);

  return (
    <Presentazione
      slide={slide}
      // ⚠️ Nessuna sezione comune: un corso trasversale non insegna un percorso, quindi non
      // ha «dove sei» né «come si salva». Le sue tracce stanno tutte sotto la propria chiave.
      pista={pistaPerSlide(slide, chiave, [])}
      nomeCorso={c.nome}
      // ⚠️ Non ha un'area, e non gliene si inventa una: il colore d'area dice di che materia
      // si parla, e questo corso parla del mestiere, non di una materia. Prende l'accento.
      tinta={{ tratto: "bg-primary" }}
      href={`/formazione/corso/${chiave}`}
    />
  );
}
