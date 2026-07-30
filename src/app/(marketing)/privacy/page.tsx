import type { Metadata } from "next";
import { PaginaLegale } from "@/components/landing/pagina-legale";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PaginaLegale titolo="Informativa sulla privacy">
      <p>
        Informativa ai sensi del Regolamento (UE) 2016/679 (GDPR). <strong>Testo definitivo in preparazione a cura del
        titolare del trattamento</strong>: sarà pubblicato qui prima dell&apos;apertura commerciale del servizio.
      </p>
      <p>
        Punti già fissati dall&apos;architettura del servizio: i dati sono ospitati su infrastrutture nell&apos;Unione Europea
        (regione Francoforte); ogni studio è isolato a livello di database; i dati non vengono ceduti a terzi né usati per
        finalità diverse dall&apos;erogazione del servizio; alla cessazione dell&apos;abbonamento l&apos;account passa in sola
        lettura e i dati restano esportabili dal titolare.
      </p>
      <p>Per richieste sul trattamento dei dati: info@evalisdeck.it</p>
    </PaginaLegale>
  );
}
