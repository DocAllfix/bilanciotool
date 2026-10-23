import type { Metadata } from "next";
import { ModuloIscrizione } from "../../registrati/modulo";
import { normalizzaCodicePartner } from "@/features/partner/codice";
import { partnerAttivo } from "@/features/partner";

// IL COLLEGAMENTO DEL PARTNER: `evalisdeck.it/partner/NGR`.
//
// Il partner lo manda ai propri clienti, e chi si iscrive da qui trova il codice già scritto.
// È la stessa iscrizione di `/registrati`, con un valore in più: il codice lo verifica e lo
// lega allo studio il server, come quando lo si scrive a mano.
//
// ⚠️ NESSUN COOKIE, NIENTE NEL BROWSER. Il codice vive nell'indirizzo e basta: ricordarlo per
// chi gira il sito e si iscrive più tardi vorrebbe dire conservare nel suo browser un dato
// che serve a pagare una provvigione, e quello il banner dovrebbe chiederlo. Chi esce da qui
// e torna dalla home scrive il codice a mano, o lo attribuisce lo staff.
//
// ⚠️ DINAMICA: legge il registro dei partner a ogni apertura, così un partner nuovo funziona
// subito senza un rilascio. E non si indicizza: è una porta personale, non una pagina.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Crea il tuo account",
  robots: { index: false, follow: false },
};

export default async function PaginaPartner({ params }: { params: Promise<{ codice: string }> }) {
  const { codice: grezzo } = await params;
  const codice = normalizzaCodicePartner(decodeURIComponent(grezzo));
  const partner = codice && codice !== "non-valido" ? await partnerAttivo(codice) : null;

  // Un collegamento storto non deve perdere chi l'ha aperto: si iscrive lo stesso, senza
  // codice, e la pagina dice perché il campo è vuoto.
  if (!partner) {
    return (
      <ModuloIscrizione
        destinazione="/dashboard"
        sottotitolo="Il codice partner di questo collegamento non è attivo: puoi iscriverti lo stesso, e se ti ha presentato un partner scrivi qui sotto il suo codice. Apri il tuo studio in modalità demo, senza impegno."
      />
    );
  }

  const chi = partner.nome && partner.nome !== partner.codice ? partner.nome : partner.codice;
  return (
    <ModuloIscrizione
      destinazione="/dashboard"
      codicePartnerIniziale={partner.codice}
      sottotitolo={`Ti ha presentato EvalisDeck ${chi}: il suo codice partner è già inserito. Apri il tuo studio in modalità demo, con un'azienda di esempio, senza impegno.`}
    />
  );
}
