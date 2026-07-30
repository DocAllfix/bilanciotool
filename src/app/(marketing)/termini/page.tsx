import type { Metadata } from "next";
import { PaginaLegale } from "@/components/landing/pagina-legale";

export const metadata: Metadata = { title: "Termini e condizioni" };

export default function TerminiPage() {
  return (
    <PaginaLegale titolo="Termini e condizioni">
      <p>
        <strong>Testo definitivo in preparazione a cura del titolare del servizio</strong>: sarà pubblicato qui prima
        dell&apos;apertura commerciale.
      </p>
      <p>
        Impianto commerciale già definito: abbonamento annuale per studio con avviamento incluso nel primo anno e rinnovo a
        prezzo ridotto dagli anni successivi; fino a 10 aziende attive e 5 utenti per studio; la modalità demo consente di
        esplorare il servizio su un&apos;azienda d&apos;esempio senza obbligo d&apos;acquisto. I documenti pubblicati restano
        conservati in versioni immutabili per la durata del rapporto.
      </p>
    </PaginaLegale>
  );
}
