"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  bannerNascostoSulServer,
  daCaselle,
  iscriviConsenso,
  leggiConsenso,
  scegli,
} from "@/features/consenso/stato";

// Il banner di consenso.
//
// Sostituisce l'informativa a un pulsante che c'era prima: finché il sito usava solo cookie
// tecnici, l'art. 122 del Codice privacy chiedeva l'informativa e NON il consenso, e mettere
// «accetta / rifiuta» avrebbe promesso una scelta che non esisteva. Con Google Analytics la
// situazione cambia: è misurazione di terze parti, e il consenso va chiesto **prima**.
//
// COME SONO DISPOSTI I PULSANTI, e perché non è un dettaglio estetico. Le Linee guida del
// Garante del 10 giugno 2021 chiedono che rifiutare sia facile quanto accettare: stesso
// numero di clic, stessa evidenza, nessuna scelta preselezionata. Qui «Rifiuta» viene
// **prima**, ha la stessa dimensione e sta nello stesso riquadro: nessuna delle due strade
// è più corta dell'altra. La contestazione più frequente riguarda proprio il rifiuto
// nascosto dietro un secondo passaggio.
//
// ⚠️ DUE FINALITÀ, DUE CONSENSI (21 ottobre 2026). Statistiche (Google Analytics) e
// pubblicità (Google Ads) sono scopi diversi, e il Garante chiede che si possa dire sì a
// uno e no all'altro. «Accetta» dà entrambi, «Rifiuta» nessuno, e «Personalizza» apre le
// due caselle, VUOTE: una casella già spuntata non è un consenso.
//
// Non c'è una X per chiudere senza scegliere: chiudere senza decidere lascerebbe lo stato in
// sospeso, e uno stato in sospeso vale come rifiuto — meglio dirlo con un pulsante che
// lasciarlo intuire.

export function BannerCookie() {
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, bannerNascostoSulServer);
  const pathname = usePathname();
  const [personalizza, setPersonalizza] = useState(false);
  const [statistiche, setStatistiche] = useState(false);
  const [pubblicita, setPubblicita] = useState(false);
  const id = useId();
  const riquadro = useRef<HTMLDivElement>(null);

  // Il documento pubblicato è un altro registro, ed è la pagina che Chromium trasforma in
  // PDF: un riquadro fisso in fondo finirebbe stampato dentro il documento del cliente.
  const dentroUnDocumento = pathname?.startsWith("/documento/") ?? false;

  const visibile = consenso === null && !dentroUnDocumento;

  // ⚠️ IL BANNER NON DEVE COPRIRE L'ULTIMA COSA DELLA PAGINA (23 ottobre 2026). È fisso in
  // fondo allo schermo: su un portatile e da telefono copriva «Crea l'account» anche
  // scorrendo fino in fondo, perché la pagina finiva prima che il pulsante potesse salire
  // sopra di lui. Chi si iscriveva doveva rispondere ai cookie per poter premere il pulsante,
  // e il modulo d'iscrizione, diventato più alto col codice partner, l'ha fatto vedere. Finché
  // il banner è aperto la pagina riceve in fondo uno spazio alto quanto lui, misurato e non
  // indovinato: cambia con la larghezza e con «Personalizza» aperto.
  useEffect(() => {
    const el = riquadro.current;
    if (!visibile || !el) return;
    const prima = document.body.style.paddingBottom;
    const misura = () => {
      document.body.style.paddingBottom = `${Math.ceil(el.getBoundingClientRect().height) + 24}px`;
    };
    misura();
    const osserva = new ResizeObserver(misura);
    osserva.observe(el);
    return () => {
      osserva.disconnect();
      document.body.style.paddingBottom = prima;
    };
  }, [visibile]);

  if (!visibile) return null;

  // ⚠️ `data-consenso` e NON `data-modale`, ed è una scelta pagata con un rosso.
  //
  // `data-modale` è ciò che il cancello di `avviaTour` guarda per non aprire un velo sopra
  // una finestra. Segnandolo così, il giro guidato del BENVENUTO smetteva di partire: chi si
  // è appena registrato non ha ancora scelto sui cookie, quindi il banner c'è sempre, e la
  // sequenza video → giro → offerta restava appesa. Due controlli di `qa -- benvenuto`
  // l'hanno detto subito.
  //
  // La vetrina pubblica — dove il richiamo all'acquisto vive nello stesso angolo in basso —
  // guarda questo marcatore per non finirgli sotto.
  //
  // ⚠️ E IL BANNER STA SOPRA IL VELO DEI GIRI GUIDATI (30 settembre 2026). Prima il velo lo
  // copriva: driver.js mette il suo velo a `z-index: 10000` e spegne i clic su tutta la
  // pagina, e «Rifiuta» e «Accetta» restavano visibili e impremibili finché non si chiudeva
  // il giro. Trovato dal collaudo delle impostazioni sull'anteprima, dove la pagina è più
  // lenta e il giro della dashboard arriva PRIMA del clic sul banner; in locale arrivava
  // dopo, ed era verde per fortuna di tempi. Il rimedio non blocca nessun giro — il
  // benvenuto deve poter partire col banner aperto — rende la scelta raggiungibile sempre:
  // `z-[10001]` qui, e i clic restituiti in `globals.css` (`.driver-active [data-consenso]`).
  // Sta sotto il riquadro del giro, che è a un miliardo: non lo copre.
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consenso ai cookie di misurazione"
      data-consenso=""
      ref={riquadro}
      className="fixed inset-x-3 bottom-3 z-[10001] mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-lg print:hidden sm:inset-x-5 sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Usiamo <strong className="font-medium text-foreground">cookie tecnici</strong>, necessari al funzionamento. Con
          il tuo consenso usiamo anche <strong className="font-medium text-foreground">Google Analytics</strong>, per
          capire quali pagine sono utili, e <strong className="font-medium text-foreground">Google Ads</strong>, per
          misurare quali annunci portano visite e richieste. Nessun annuncio personalizzato. Se rifiuti, il sito funziona
          esattamente allo stesso modo. Il dettaglio è nella{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            cookie policy
          </Link>
          .
        </p>
        {/* ⚠️ Da telefono tre pulsanti in fila non ci stanno, e lasciandoli andare a capo
            «Accetta» finiva da solo su una riga, largo il doppio di «Rifiuta»: la disparità
            che le Linee guida vietano. Rifiuta e Accetta stanno sempre affiancati e uguali;
            «Personalizza», che è il passaggio in più, scende sotto. */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-nowrap">
          <Button size="sm" variant="outline" onClick={() => scegli("rifiutato")} className="min-w-24 flex-1 sm:flex-none">
            Rifiuta
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={personalizza}
            aria-controls={`${id}-scelte`}
            onClick={() => setPersonalizza((v) => !v)}
            className="order-last col-span-2 min-w-24 sm:order-none sm:col-span-1 sm:flex-none"
          >
            Personalizza
          </Button>
          <Button size="sm" onClick={() => scegli("accettato")} className="min-w-24 flex-1 sm:flex-none">
            Accetta
          </Button>
        </div>
      </div>
      {personalizza ? (
        <div id={`${id}-scelte`} className="mt-4 border-t pt-4" data-consenso-scelte="">
          <div className="grid gap-3 sm:grid-cols-2">
            <Casella
              id={`${id}-statistiche`}
              titolo="Statistiche"
              testo="Google Analytics: quante visite, da dove, quali pagine. Imposta i cookie _ga."
              valore={statistiche}
              cambia={setStatistiche}
            />
            <Casella
              id={`${id}-pubblicita`}
              titolo="Pubblicità"
              testo="Google Ads: quali annunci portano visite e richieste. Imposta i cookie _gcl. Niente annunci personalizzati."
              valore={pubblicita}
              cambia={setPubblicita}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => scegli(daCaselle(statistiche, pubblicita))}>
              Salva le scelte
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Casella({
  id,
  titolo,
  testo,
  valore,
  cambia,
}: {
  id: string;
  titolo: string;
  testo: string;
  valore: boolean;
  cambia: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer gap-2.5 rounded-lg border p-3 text-[13px] leading-snug">
      <input
        id={id}
        type="checkbox"
        checked={valore}
        onChange={(e) => cambia(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>
        <span className="block font-medium text-foreground">{titolo}</span>
        <span className="text-muted-foreground">{testo}</span>
      </span>
    </label>
  );
}
