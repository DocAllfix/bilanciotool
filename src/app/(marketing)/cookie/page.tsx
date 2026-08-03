import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegale, Sezione, TabellaLegale } from "@/components/landing/pagina-legale";
import { TITOLARE, COOKIE, ARCHIVIAZIONE_LOCALE } from "@/lib/legale";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "Quali cookie usa EvalisDeck: soltanto tecnici, nessuna profilazione. Nomi, durate e finalità, e come gestirli dal browser.",
};

export default function CookiePage() {
  return (
    <PaginaLegale
      titolo="Cookie policy"
      sottotitolo="Quali cookie e quali altri dati vengono conservati nel tuo browser, perché, e per quanto tempo."
    >
      <Sezione n={1} titolo="In breve">
        <p>
          EvalisDeck utilizza <strong>soltanto cookie tecnici</strong>, necessari a farlo funzionare. Non usiamo cookie
          di profilazione, non facciamo pubblicità comportamentale, non abbiamo strumenti di analisi statistica di terze
          parti e non condividiamo dati di navigazione con nessuno.
        </p>
        <p>
          Sul sito pubblico e sulla pagina di accesso <strong>non viene impostato alcun cookie</strong>. L&apos;unico
          cookie compare dopo che ti sei autenticato, e serve a tenerti dentro.
        </p>
      </Sezione>

      <Sezione n={2} titolo="Perché non ti chiediamo un consenso">
        <p>
          I cookie tecnici, cioè quelli strettamente necessari a erogare un servizio richiesto dall&apos;utente, sono
          esclusi dall&apos;obbligo di consenso preventivo: lo prevedono l&apos;articolo 122 del Codice privacy (D.Lgs.
          196/2003) e le Linee guida cookie del Garante del 10 giugno 2021. Per questi è dovuta{" "}
          <strong>l&apos;informativa, non il consenso</strong>.
        </p>
        <p>
          Per questo al primo accesso trovi una nota informativa breve con un solo pulsante di presa visione, e non un
          riquadro con «accetta» e «rifiuta»: proporti una scelta che non esiste sarebbe fuorviante. Se un domani
          introdurremo strumenti di analisi o di altra natura, questa pagina verrà aggiornata e il consenso ti verrà
          chiesto <strong>prima</strong>{" "}dell&apos;attivazione, con possibilità di scelta per singola categoria e di
          revoca in ogni momento.
        </p>
      </Sezione>

      <Sezione n={3} titolo="Cookie utilizzati">
        <TabellaLegale
          intestazioni={["Nome", "Tipo", "Finalità", "Durata"]}
          righe={COOKIE.map((c) => [
            <span key="nome" className="font-mono text-[12.5px]">
              {c.nome}
            </span>,
            c.tipo,
            <span key="scopo">
              {c.scopo}
              <span className="block text-[12px] text-muted-foreground">{c.note}</span>
            </span>,
            c.durata,
          ])}
        />
        <p>
          Sono cookie di prima parte: li imposta il nostro dominio, non soggetti terzi. Alla disconnessione il cookie
          viene rimosso.
        </p>
      </Sezione>

      <Sezione n={4} titolo="Altri dati conservati nel browser">
        <p>
          Oltre ai cookie, la piattaforma conserva alcune preferenze nell&apos;archiviazione locale del browser (
          <span className="font-mono text-[12.5px]">localStorage</span>). Non sono cookie e non vengono trasmesse al
          server, ma vanno dichiarate con gli stessi criteri: restano sul tuo dispositivo finché non svuoti i dati del
          sito.
        </p>
        <TabellaLegale
          intestazioni={["Chiave", "A cosa serve", "Durata"]}
          righe={ARCHIVIAZIONE_LOCALE.map((v) => [
            <span key="nome" className="font-mono text-[12.5px]">
              {v.nome}
            </span>,
            v.scopo,
            v.durata,
          ])}
        />
      </Sezione>

      <Sezione n={5} titolo="Come gestirli o eliminarli">
        <p>
          Puoi bloccare o cancellare cookie e archiviazione locale in qualunque momento dalle impostazioni del tuo
          browser, alla voce dedicata alla privacy o ai dati dei siti. Le istruzioni sono nella documentazione ufficiale
          di{" "}
          <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
            Chrome
          </a>
          ,{" "}
          <a
            href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox-desktop"
            target="_blank"
            rel="noopener noreferrer"
          >
            Firefox
          </a>
          ,{" "}
          <a
            href="https://support.apple.com/it-it/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>{" "}
          e{" "}
          <a
            href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Edge
          </a>
          .
        </p>
        <p>
          Una avvertenza pratica:{" "}
          <strong>bloccare i cookie tecnici impedisce l&apos;accesso all&apos;area riservata</strong>, perché senza il
          cookie di sessione il server non può riconoscerti fra una pagina e la successiva. Il sito pubblico resta
          invece consultabile normalmente.
        </p>
      </Sezione>

      <Sezione n={6} titolo="Riferimenti e contatti">
        <p>
          Titolare del trattamento e finalità sono descritti nell&apos;
          <Link href="/privacy">informativa sulla privacy</Link>. Per domande su questa pagina:{" "}
          <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
        </p>
      </Sezione>
    </PaginaLegale>
  );
}
