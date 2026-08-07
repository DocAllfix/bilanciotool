import type { Metadata } from "next";
import { SchedeImpostazioni } from "@/components/impostazioni/schede";

export const metadata: Metadata = { title: "Impostazioni" };

// Le tre schede delle impostazioni.
//
// Sono rotte vere e non pannelli in una pagina sola: un indirizzo per scheda si condivide,
// sopravvive al tasto indietro, e il paywall può mandare direttamente all'abbonamento invece
// che «alle impostazioni, poi cerca».
export default function ImpostazioniLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <SchedeImpostazioni />
      <div className="mt-8">{children}</div>
    </div>
  );
}
