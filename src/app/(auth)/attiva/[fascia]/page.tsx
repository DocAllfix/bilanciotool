import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ModuloIscrizione } from "../../registrati/modulo";
import { PIANI, fasceVendibili, aziendeTesto, type PianoKey } from "@/lib/prezzi";

// `/attiva/<fascia>` — la porta di chi ha già scelto la fascia dalla vetrina.
//
// `/attiva` porta sulla pagina dei piani e lì si sceglie; questa porta la scelta con sé,
// e dopo la conferma dell'indirizzo la fascia è già selezionata. Serve alla fascia
// d'ingresso, che dalla home si raggiungeva solo passando dal listino intero: chi segue
// una sola azienda non deve dover capire quale delle quattro è la sua.
//
// ⚠️ È una ROTTA, non un parametro d'indirizzo, come `/attiva`: queste pagine sono
// statiche, e `useSearchParams` su una pagina statica arriva solo dopo l'idratazione —
// il titolo comparirebbe sbagliato e poi cambierebbe sotto gli occhi.
//
// ⚠️ Le fasce le elenca il LISTINO: una fascia nuova ha la sua pagina il giorno stesso,
// e una che non esiste risponde 404 invece di iscrivere qualcuno a niente.

export function generateStaticParams() {
  return fasceVendibili().map((fascia) => ({ fascia }));
}

function piano(fascia: string) {
  return fasceVendibili().includes(fascia as PianoKey) ? PIANI[fascia as PianoKey] : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fascia: string }>;
}): Promise<Metadata> {
  const { fascia } = await params;
  const p = piano(fascia);
  if (!p) return { title: "Attiva" };
  return {
    title: `Attiva «${p.nome}»`,
    description: `${p.descrizione} ${aziendeTesto(p.aziende)} in portafoglio, tutti i percorsi compresi.`,
    robots: { index: false, follow: true },
  };
}

export default async function AttivaFasciaPage({ params }: { params: Promise<{ fascia: string }> }) {
  const { fascia } = await params;
  const p = piano(fascia);
  if (!p) notFound();

  return (
    <ModuloIscrizione
      // La fascia viaggia fino alla pagina dei piani, che è dinamica e può leggere
      // l'indirizzo: lì il dialogo d'acquisto si apre già su questa.
      destinazione={`/impostazioni/abbonamento?fascia=${p.key}`}
      perAcquisto
      titolo={`Attiva «${p.nome}»`}
      sottotitolo={`${aziendeTesto(p.aziende)} in portafoglio e ${p.accessi} accessi, con tutti i percorsi compresi. Crea l'account: al passo dopo scegli come pagare.`}
    />
  );
}
