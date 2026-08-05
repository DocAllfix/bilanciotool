import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegale, Sezione, TabellaLegale } from "@/components/landing/pagina-legale";
import { PreferenzeCookie } from "@/components/legal/preferenze-cookie";
import { TITOLARE, COOKIE, ARCHIVIAZIONE_LOCALE } from "@/lib/legale";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "Quali cookie usa EvalisDeck: tecnici sempre, statistici solo con il tuo consenso. Nomi, durate, finalità e come revocare.",
};

export default function CookiePage() {
  return (
    <PaginaLegale
      titolo="Cookie policy"
      sottotitolo="Quali cookie e quali altri dati vengono conservati nel tuo browser, perché, e per quanto tempo."
    >
      <Sezione n={1} titolo="In breve">
        <p>
          EvalisDeck usa <strong>cookie tecnici</strong>, necessari a farlo funzionare, e{" "}
          <strong>cookie statistici di Google Analytics</strong> che vengono attivati <strong>solo se acconsenti</strong>
          . Non usiamo cookie di profilazione pubblicitaria, non facciamo pubblicità comportamentale e non vendiamo dati
          di navigazione a nessuno.
        </p>
        <p>
          Finché non esprimi una scelta, <strong>non viene impostato alcun cookie statistico e non viene inviata alcuna
          richiesta ai server di Google</strong>: lo script di misurazione non viene proprio scaricato. Il cookie tecnico
          di sessione compare invece dopo che ti sei autenticato, e serve a tenerti dentro.
        </p>
        <p>
          Se rifiuti, il sito e la piattaforma funzionano esattamente allo stesso modo: non perdi nessuna funzione.
        </p>
      </Sezione>

      <Sezione n={2} titolo="Perché per alcuni ti chiediamo il consenso e per altri no">
        <p>
          I <strong>cookie tecnici</strong>, cioè quelli strettamente necessari a erogare un servizio che hai richiesto,
          sono esclusi dall&apos;obbligo di consenso preventivo: lo prevedono l&apos;articolo 122 del Codice privacy
          (D.Lgs. 196/2003) e le Linee guida cookie del Garante del 10 giugno 2021. Per questi è dovuta{" "}
          <strong>l&apos;informativa, non il consenso</strong>: sono quelli che tengono aperta la tua sessione.
        </p>
        <p>
          I <strong>cookie statistici di Google Analytics</strong> stanno invece fuori da quella esclusione, perché
          comportano un servizio di misurazione fornito da un soggetto terzo. Per questi il consenso è{" "}
          <strong>preventivo, libero e revocabile</strong>: te lo chiediamo prima di attivarli, con «Accetta» e «Rifiuta»
          nello stesso riquadro, alla stessa portata e con lo stesso numero di clic. Nessuna casella è preselezionata, e
          chiudere il riquadro senza scegliere non vale come consenso.
        </p>
        <p>
          Puoi cambiare idea in qualunque momento con <strong>«Preferenze cookie»</strong>, in fondo a ogni pagina: la
          scelta precedente viene cancellata, la misurazione si spegne subito e il riquadro torna a chiedertelo.
        </p>
      </Sezione>

      <Sezione n={3} titolo="Cookie utilizzati">
        <TabellaLegale
          intestazioni={["Nome", "Tipo", "Finalità", "Durata", "Consenso"]}
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
            c.consenso ? "Richiesto" : "Non richiesto",
          ])}
        />
        <p>
          Il cookie di sessione è di prima parte: lo imposta il nostro dominio, e alla disconnessione viene rimosso. I
          due cookie di Google Analytics sono di terza parte, li imposta Google, e compaiono{" "}
          <strong>soltanto dopo che hai accettato</strong>.
        </p>
        <p>
          Nella proprietà di misurazione abbiamo disattivato i <em>Segnali Google</em>, la personalizzazione degli
          annunci e la condivisione dei dati con gli altri servizi di Google: le statistiche restano statistiche e non
          alimentano profili pubblicitari. La conservazione dei dati è impostata a 14 mesi.
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

      <Sezione n={5} titolo="Revocare il consenso o cambiare idea">
        <p>
          Il modo più diretto è il comando <strong>«Preferenze cookie»</strong> in fondo a ogni pagina pubblica: azzera
          la scelta registrata, spegne immediatamente la misurazione e ti ripropone il riquadro. Non devi cercare nulla
          nelle impostazioni del browser, e non serve scriverci.
        </p>
        <p className="not-prose">
          <PreferenzeCookie className="cursor-pointer font-medium text-primary underline underline-offset-4 hover:no-underline" />{" "}
          <span className="text-muted-foreground">— apre il riquadro di scelta qui, adesso.</span>
        </p>
        <p>
          La revoca vale per il futuro: i dati statistici già raccolti restano nei rapporti aggregati di Google fino alla
          scadenza dei 14 mesi di conservazione. Se vuoi che i cookie già presenti spariscano subito dal tuo dispositivo,
          cancellali dal browser come descritto qui sotto.
        </p>
      </Sezione>

      <Sezione n={6} titolo="Come gestirli o eliminarli dal browser">
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

      <Sezione n={7} titolo="Riferimenti e contatti">
        <p>
          Titolare del trattamento e finalità sono descritti nell&apos;
          <Link href="/privacy">informativa sulla privacy</Link>. Per domande su questa pagina:{" "}
          <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
        </p>
      </Sezione>
    </PaginaLegale>
  );
}
