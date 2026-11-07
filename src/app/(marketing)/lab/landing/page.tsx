import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { APERTURA_PREDEFINITA, FORME, TITOLI } from "@/components/landing/apertura-dati";
import { SelettoreLab } from "./selettore";

// IL LABORATORIO DELLA LANDING. ⚠️ TEMPORANEO: si cancella, insieme alle regole CSS
// marcate in `globals.css`, appena il committente ha scelto.
//
// Tutte le combinazioni stanno già nell'HTML statico: il selettore cambia tre attributi
// sulla radice e il CSS nasconde il resto. Niente lettura della richiesta (la pagina resta
// statica), e il collegamento con la scelta si condivide: `?f=fascicolo&t=2&c=petrolio`.
//
// Fuori dagli indici e dalla sitemap.
export const metadata: Metadata = {
  title: "Laboratorio della landing",
  robots: { index: false, follow: false },
};

export default function LaboratorioLanding() {
  return (
    <div
      id="laboratorio"
      className="flex min-h-dvh flex-col bg-background pb-44"
      data-forma={APERTURA_PREDEFINITA.forma}
      data-titolo={APERTURA_PREDEFINITA.titolo}
      data-tema={APERTURA_PREDEFINITA.tema}
    >
      <Landing apertura={{ forme: [...FORME], titoli: TITOLI.map((_, i) => i + 1) }} />
      <SelettoreLab titoli={TITOLI} />
    </div>
  );
}
