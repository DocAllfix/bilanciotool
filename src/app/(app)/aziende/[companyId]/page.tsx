import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConsultant } from "@/features/auth/guards";
import { getFascicolo, listDocumentiAzienda } from "@/features/companies/fascicolo";
import { getStorico } from "@/features/companies/storico";
import { Storico } from "@/components/portfolio/storico";
import { PannelloCondivisione } from "@/components/condivisione/pannello";
import { elencaCollegamenti } from "@/features/condivisione";
import { elencaContatti } from "@/features/companies/contatti";
import { can, getAccountStatus } from "@/features/entitlement";
import { SchedaCliente } from "@/components/portfolio/scheda-cliente";
import { MODULI_AZIENDA, MODULI_PER_AREA } from "@/features/companies/moduli";
import { etichettaDocumento } from "@/features/documents/tipi";
import { Badge } from "@/components/ui/badge";
import { fmtRelativa } from "@/lib/format";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fascicolo azienda" };

// Fascicolo dell'azienda: il posto che mancava.
//
// Prima esistevano solo /aziende/[id]/<modulo>: per passare dalla SoA al
// Bilancio della stessa azienda bisognava tornare al portafoglio. Con due moduli
// si sopportava, con cinque no.

const ETICHETTA_STATO = {
  "non-avviato": "Da avviare",
  "in-corso": "In corso",
  pubblicato: "Pubblicato",
} as const;

export default async function FascicoloPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const s = await requireConsultant();
  const [f, documenti, storico, collegamenti, contatti, stato] = await Promise.all([
    getFascicolo(s.userId, s.orgId, companyId),
    listDocumentiAzienda(s.userId, s.orgId, companyId),
    getStorico(s.userId, s.orgId, companyId),
    elencaCollegamenti(s.userId, s.orgId, companyId),
    elencaContatti(s.userId, s.orgId, companyId),
    getAccountStatus(s.userId, s.orgId),
  ]);
  if (!f) notFound();

  const avviati = f.voci.filter((v) => v.stato !== "non-avviato").length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fascicolo</p>
          <h1 className="font-display mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            {f.azienda.nome}
            {f.azienda.isDemo && <Badge variant="outline">Demo</Badge>}
            {f.azienda.stato === "archived" && <Badge variant="outline">In archivio</Badge>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[f.azienda.settore, f.azienda.sede, f.azienda.ateco && `ATECO ${f.azienda.ateco}`]
              .filter(Boolean)
              .join(" · ") || "Profilo da completare"}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Portafoglio
        </Link>
      </div>

      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {avviati}
            <span className="text-muted-foreground">/{f.voci.length}</span>
          </dd>
          <dt className="text-[13px] text-muted-foreground">moduli avviati</dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {f.documentiTotali}
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {f.documentiTotali === 1 ? "documento pubblicato" : "documenti pubblicati"}
          </dt>
        </div>
      </dl>

      {/* I moduli come righe e non come riquadri: si leggono in colonna, si
          confrontano fra loro, e non impongono una griglia che a un numero dispari
          di elementi lascia sempre un buco.
          ⚠️ E ora con l'INTESTAZIONE DI GRUPPO. Finche' le righe erano cinque bastava
          la tinta a dire la materia; undici di fila sono un muro in cui il confine fra
          un gruppo e l'altro si indovina. Le intestazioni si derivano dal registro,
          quindi un percorso nuovo compare da solo nel gruppo giusto — e un gruppo
          rimasto senza percorsi non compare affatto, perche' un titolo sopra il vuoto
          promette qualcosa che non c'e'. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">I percorsi dell&apos;azienda</h2>
        {/* `data-percorsi` e `data-modulo` sono gli ancoraggi dei collaudi: il titolo
            diceva «I cinque percorsi», e un numero scritto in pagina invecchia. Un
            controllo appeso a quella frase diventerebbe rosso il giorno in cui il
            prodotto cresce, per un motivo che col prodotto non c'entra. */}
        <div className="mt-3 space-y-5" data-percorsi="">
          {MODULI_PER_AREA.map((g) => {
            const vociDelGruppo = f.voci.filter((v) => g.moduli.some((m) => m.href === v.modulo));
            if (vociDelGruppo.length === 0) return null;
            return (
              <section key={g.area} aria-labelledby={`gruppo-${g.area}`}>
                <h3
                  id={`gruppo-${g.area}`}
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <span className={`size-2 shrink-0 rounded-full ${g.colore.tratto}`} aria-hidden />
                  {g.nome}
                </h3>
                <ul className="mt-2 divide-y rounded-xl border">
          {vociDelGruppo.map((v) => {
            const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
            return (
              <li key={v.modulo} className="group relative" data-modulo={v.modulo}>
                <Link
                  href={v.href}
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent sm:px-5"
                >
                  <span
                    className={
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border " +
                      (v.stato === "non-avviato"
                        ? "border-dashed text-muted-foreground"
                        : "border-primary/25 bg-primary/8 text-primary")
                    }
                  >
                    <m.icona className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[15px] font-semibold tracking-tight group-hover:text-primary">
                        {m.nome}
                      </span>
                      {v.anno !== null && (
                        <span className="text-[13px] text-muted-foreground" data-slot="kpi">
                          esercizio {v.anno}
                        </span>
                      )}
                      <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        {m.norma}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] text-muted-foreground">
                      {v.stato === "non-avviato" ? (
                        "Non ancora avviato"
                      ) : (
                        <>
                          {v.riempimento && (
                            <span data-slot="kpi">
                              {v.riempimento.valore} {v.riempimento.etichetta}
                            </span>
                          )}
                          {v.pubblicato && (
                            <>
                              {v.riempimento && " · "}
                              versione {v.pubblicato.versione} pubblicata {fmtRelativa(v.pubblicato.quando)}
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </span>
                  <span className="hidden shrink-0 sm:block">
                    <Badge variant={v.stato === "pubblicato" ? "default" : "outline"}>
                      {ETICHETTA_STATO[v.stato]}
                    </Badge>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
                </ul>
              </section>
            );
          })}
        </div>

        {/* ⚠️ Un collegamento SOLO, e fuori dalle card. Ogni percorso è già un `Link` che
            copre tutta la riga: un secondo collegamento dentro sarebbe annidato — HTML non
            valido e una trappola al clic, perché il bersaglio dipenderebbe dal pixel. Qui
            sta sotto, dove uno guarda dopo aver letto l'elenco e essersi chiesto come si
            conduce. */}
        <p className="mt-5 border-t pt-4 text-[13px] text-muted-foreground">
          Non sai da dove cominciare?{" "}
          <Link href="/formazione" className="underline underline-offset-4 hover:text-primary">
            La formazione
          </Link>{" "}
          spiega ogni percorso: dove si prendono i dati, che cosa controlla la verifica, che cosa
          succede quando si pubblica.
        </p>
      </div>

      {/* Compare da solo quando c'è qualcosa da mostrare: con una sola versione
          pubblicata non esiste un andamento, e un grafico a un punto è rumore. */}
      <Storico serie={storico} />

      {/* La scheda del cliente: anagrafica e rubrica. Sta nel fascicolo e non in una
          pagina sua — una voce in piu' nella barra laterale sarebbe la cosa che la
          riorganizzazione in tre gruppi e' servita a togliere. */}
      <SchedaCliente
        companyId={companyId}
        azienda={f.azienda}
        contatti={contatti}
        soloLettura={!can(stato, "write_data") || f.azienda.stato === "archived"}
      />

      {/* Sta qui e non nelle impostazioni: il collegamento riguarda UNA azienda, e si
          genera guardando i documenti che si sta per condividere. */}
      <PannelloCondivisione companyId={companyId} collegamenti={collegamenti} />

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documenti pubblicati</h2>
        {documenti.length === 0 ? (
          <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
            Ancora nessuno. Completa un percorso e pubblica la prima versione: da quel momento resta congelata e
            consultabile per sempre, anche se i dati vivi cambiano.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border">
            {documenti.map((d) => (
              <li key={d.id}>
                <a
                  href={`/documento/${d.id}`}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent sm:px-5"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                    {etichettaDocumento(d.tipo, d.anno, true)}
                    <span className="text-muted-foreground"> · v{d.versione}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{fmtRelativa(d.publishedAt)}</span>
                  <ExternalLink
                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
