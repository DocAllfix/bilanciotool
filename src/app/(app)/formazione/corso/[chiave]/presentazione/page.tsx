import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { corsoTrasversale, esisteCorsoTrasversale, NUMERI } from "@/features/formazione";
import { costruisciSlideCorso } from "@/features/formazione/presentazione";
import { pistaPerSlide, traccia } from "@/features/formazione/audio";
import type { VoceSlide } from "@/features/formazione/slide-distillate";
import { Presentazione } from "@/components/formazione/presentazione";
import mappaSlide from "../../../../../../../audio-formazione/slide-map.json";

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
  // ⚠️ Nessuna sezione comune: un corso trasversale non insegna un percorso, quindi non
  // ha «dove sei» né «come si salva». Le sue tracce stanno tutte sotto la propria chiave.
  const { slide, momenti } = costruisciSlideCorso([...c.sezioni], {
    corso: chiave,
    idComuni: [],
    mappa: mappaSlide as Record<string, VoceSlide[]>,
    numeri: NUMERI as unknown as Record<string, number>,
    marche: (k) => traccia(k)?.marche ?? [],
  });

  return (
    <Presentazione
      slide={slide}
      pista={pistaPerSlide(slide, chiave, [], momenti)}
      nomeCorso={c.nome}
      // Non ha una norma: in alto a destra dice che cosa insegna, cioè il mestiere.
      norma="Il mestiere del consulente"
      // ⚠️ Non ha un'area, e non gliene si inventa una: il colore d'area dice di che materia
      // si parla, e questo corso parla del mestiere, non di una materia. Prende l'accento.
      tinta={{ tratto: "bg-primary" }}
      href={`/formazione/corso/${chiave}`}
    />
  );
}
