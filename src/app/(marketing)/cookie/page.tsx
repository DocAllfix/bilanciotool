import type { Metadata } from "next";
import { PaginaLegale } from "@/components/landing/pagina-legale";

export const metadata: Metadata = { title: "Cookie" };

export default function CookiePage() {
  return (
    <PaginaLegale titolo="Cookie policy">
      <p>
        EvalisDeck utilizza esclusivamente <strong>cookie tecnici di sessione</strong>, necessari all&apos;autenticazione e al
        funzionamento della piattaforma. Non utilizziamo cookie di profilazione né strumenti di tracciamento pubblicitario;
        per questo non è richiesto alcun banner di consenso.
      </p>
      <p>Se in futuro venissero introdotti strumenti di analisi, questa pagina e le modalità di consenso saranno aggiornate prima dell&apos;attivazione.</p>
    </PaginaLegale>
  );
}
