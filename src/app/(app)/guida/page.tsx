import type { Metadata } from "next";
import Link from "next/link";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { DOCUMENTI } from "@/features/documents/tipi";
import { RipetiTour } from "@/components/guida/ripeti-tour";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Guida" };

// La guida è generata dal registro dei moduli e da quello dei documenti, non
// ricopiata a mano: un modulo nuovo compare qui da solo, e non può descrivere una
// norma o un documento diversi da quelli che il prodotto produce davvero.

const DOMANDE = [
  {
    d: "Che cosa succede quando pubblico?",
    r: "I dati e tutti i valori calcolati vengono congelati in una versione immutabile. Da quel momento le modifiche al percorso non toccano più il documento pubblicato: resta la copia consegnata. Ripubblicando si ottiene la versione successiva, e le precedenti restano consultabili.",
  },
  {
    d: "Posso correggere un documento già pubblicato?",
    r: "No, ed è voluto: un documento consegnato al cliente non deve poter cambiare alle sue spalle. Si corregge il percorso e si pubblica una versione nuova.",
  },
  {
    d: "I dati si scrivono due volte fra i moduli?",
    r: "No. L'inventario GHG alimenta la sezione emissioni del Bilancio: il Bilancio legge le emissioni dall'inventario della stessa azienda e dello stesso esercizio, non le copia. Se l'inventario cambia, il Bilancio lo vede. È l'unico collegamento automatico fra moduli.",
  },
  {
    d: "Come consegno i documenti all'azienda cliente?",
    r: "Dal fascicolo dell'azienda generi un collegamento a scadenza. Chi lo riceve scarica i documenti pubblicati senza registrarsi e senza password, non occupa un accesso del tuo piano, e tu puoi disattivarlo quando vuoi. Il collegamento si vede una volta sola: copialo subito.",
  },
  {
    d: "Perché alcune voci sono bloccate?",
    r: "In prova sono attive la consultazione e l'azienda dimostrativa; creare aziende, esportare e pubblicare si sbloccano con l'abbonamento. I limiti di aziende e accessi dipendono dal piano e si vedono in Impostazioni.",
  },
  {
    d: "Che cosa contengono i numeri calcolati?",
    r: "Nessun valore derivato è digitato a mano: totali, intensità, indici e punteggi si ricalcolano dai dati inseriti a ogni visualizzazione. L'unico posto dove vengono scritti è lo snapshot di un documento pubblicato.",
  },
];

export default function GuidaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Guida all&apos;uso</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Come è fatto il prodotto, che cosa produce ogni percorso e le risposte alle domande che
        arrivano più spesso.
      </p>

      {/* ── i cinque percorsi ─────────────────────────────────────────────── */}
      <h2 className="mt-9 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        I cinque percorsi
      </h2>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
        Ogni azienda del portafoglio ha gli stessi cinque percorsi, indipendenti fra loro. Si aprono
        dal fascicolo dell&apos;azienda e si possono lasciare a metà: il completamento è contato passo
        per passo.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {MODULI_AZIENDA.map((m) => {
          const doc = DOCUMENTI[m.documento];
          const Icona = m.icona;
          return (
            <div key={m.href} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${m.colore.pieno}`}>
                  <Icona className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold tracking-tight">{m.nome}</h3>
                  <p className="text-[12.5px] text-muted-foreground">{m.norma}</p>
                </div>
              </div>
              <p className="mt-3 text-[13px]">
                Produce <b>{doc.nome}</b>.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {m.perEsercizio
                  ? "Si compila per esercizio: un lavoro distinto per ogni anno, con confronto sull'anno precedente."
                  : "È una fotografia dello stato corrente: non ha esercizi, e le revisioni formano una serie unica."}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── tour ──────────────────────────────────────────────────────────── */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tour guidati
      </h2>
      <div className="mt-3 rounded-lg border p-4">
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Ogni percorso ha un tour che parte da solo la prima volta e si può richiamare dal pulsante{" "}
          <b>Tour</b> in basso a destra. Se vuoi rivederli tutti da capo, azzerali qui.
        </p>
        <div className="mt-3">
          <RipetiTour />
        </div>
      </div>

      {/* ── domande ───────────────────────────────────────────────────────── */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Domande frequenti
      </h2>
      <div className="mt-3 divide-y rounded-lg border">
        {DOMANDE.map((q) => (
          <details key={q.d} className="group px-4 py-3">
            <summary className="cursor-pointer list-none text-[14px] font-medium marker:content-none">
              <span className="text-muted-foreground transition-transform group-open:hidden">+ </span>
              <span className="hidden text-muted-foreground group-open:inline">− </span>
              {q.d}
            </summary>
            <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted-foreground">{q.r}</p>
          </details>
        ))}
      </div>

      {/* ── assistenza ────────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/40 px-4 py-3.5 text-[13px]">
        <p className="text-muted-foreground">
          Non hai trovato la risposta? Scrivi a{" "}
          <a href="mailto:info@evalisdeck.it" className="font-medium text-foreground underline underline-offset-4">
            info@evalisdeck.it
          </a>
        </p>
        <Link href="/impostazioni/abbonamento" className="ml-auto font-medium underline underline-offset-4">
          Piano e limiti del tuo studio
        </Link>
        <Badge variant="outline">Solo italiano, per ora</Badge>
      </div>
    </div>
  );
}
