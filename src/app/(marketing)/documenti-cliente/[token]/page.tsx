import type { Metadata } from "next";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { apriCollegamento } from "@/features/condivisione";
import { LogoOrizzontale } from "@/components/brand/logo";
import { TITOLARE } from "@/lib/legale";

export const dynamic = "force-dynamic";

// Chi apre un collegamento non deve finire negli indici: la pagina contiene i documenti di
// un'azienda, e il token sta nell'indirizzo. `noindex, nofollow` sempre, in ogni esito.
export const metadata: Metadata = {
  title: "I tuoi documenti",
  robots: { index: false, follow: false },
};

const data = (d: Date) =>
  new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

function Cornice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto w-full max-w-3xl px-5 py-4">
          <LogoOrizzontale className="h-9" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">{children}</main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-3xl px-5 py-4 text-xs text-muted-foreground">
          {TITOLARE.ragioneSociale} · P.IVA {TITOLARE.partitaIva} · Dati ospitati nell&apos;Unione Europea
        </p>
      </footer>
    </div>
  );
}

/** I tre modi in cui un collegamento può non funzionare, detti con parole diverse: chi
 *  legge deve capire se deve richiederlo o se non era suo. */
const SPIEGAZIONE = {
  scaduto: {
    titolo: "Questo collegamento è scaduto",
    testo:
      "I collegamenti hanno una durata limitata, per sicurezza. Chiedi al tuo consulente di generarne uno nuovo: ci mette un istante.",
  },
  revocato: {
    titolo: "Questo collegamento è stato disattivato",
    testo:
      "Il tuo consulente lo ha revocato. Se ti servono ancora i documenti, chiediglielo: te ne manderà uno nuovo.",
  },
  inesistente: {
    titolo: "Collegamento non valido",
    testo:
      "L'indirizzo potrebbe essere incompleto: controlla di averlo copiato per intero, oppure chiedi al tuo consulente di rimandartelo.",
  },
} as const;

export default async function DocumentiClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const apertura = await apriCollegamento(token);

  if (apertura.esito !== "ok") {
    const s = SPIEGAZIONE[apertura.esito];
    return (
      <Cornice>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.titolo}</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">{s.testo}</p>
      </Cornice>
    );
  }

  const { azienda, documenti, scadeIl } = apertura;

  return (
    <Cornice>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Documenti di</p>
      <h1 className="font-display mt-2 text-[30px] font-bold leading-tight tracking-[-0.02em]">{azienda}</h1>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
        Qui trovi i documenti di sostenibilità della tua azienda, nella versione pubblicata dal tuo consulente.
        Puoi scaricarli quando vuoi fino al {data(scadeIl)}.
      </p>

      {documenti.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Non ci sono ancora documenti pubblicati.
        </p>
      ) : (
        <ul className="mt-10 divide-y rounded-lg border">
          {documenti.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {d.nome}
                  {d.mostraAnno ? ` ${d.anno}` : ""}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  Revisione {d.versione} · pubblicato il {data(d.pubblicatoIl)}
                </p>
              </div>
              <a
                href={`/api/condivisione/${token}/${d.id}`}
                className="tocco-comodo inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Download className="size-4" /> Scarica
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 flex items-start gap-2 border-t pt-5 text-[13px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Questo collegamento è personale: chi lo riceve può vedere questi documenti. Non pubblicarlo e non
          condividerlo con chi non deve leggerli. Se pensi che sia finito nelle mani sbagliate, avvisa il tuo
          consulente: può disattivarlo in un istante.
        </span>
      </p>
    </Cornice>
  );
}
