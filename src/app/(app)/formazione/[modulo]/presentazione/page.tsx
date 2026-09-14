import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { corsoDelModulo, esisteCorso, NUMERI } from "@/features/formazione";
import { costruisciSlideCorso } from "@/features/formazione/presentazione";
import { pistaPerSlide, traccia } from "@/features/formazione/audio";
import type { VoceSlide } from "@/features/formazione/slide-distillate";
import { MODULI_AZIENDA, AREE } from "@/features/companies/moduli";
import { Presentazione } from "@/components/formazione/presentazione";
// ⚠️ Il manifesto si importa al BUILD, come quello dell'audio: un `slide.json` nuovo
// pretende `node scripts/raccogli-slide.mjs` e un redeploy, e `slide-json-pure` si accorge
// se il primo passo è stato dimenticato.
import mappaSlide from "../../../../../../audio-formazione/slide-map.json";

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
  const { slide, momenti } = costruisciSlideCorso(c.sezioni, {
    corso: modulo,
    idComuni: c.idComuni,
    mappa: mappaSlide as Record<string, VoceSlide[]>,
    numeri: NUMERI as unknown as Record<string, number>,
    marche: (chiave) => traccia(chiave)?.marche ?? [],
  });

  return (
    <Presentazione
      slide={slide}
      pista={pistaPerSlide(slide, modulo, c.idComuni, momenti)}
      nomeCorso={c.nome}
      norma={c.norma}
      tinta={{ tratto: AREE[m.area].colore.tratto }}
      href={`/formazione/${modulo}`}
    />
  );
}
