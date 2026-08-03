import type { Metadata } from "next";
import Link from "next/link";
import { requireConsultant } from "@/features/auth/guards";
import { listArchivioDocumenti } from "@/features/documents/archivio";
import { DOCUMENTI, TIPI_DOCUMENTO, etichettaDocumento, type TipoDocumento } from "@/features/documents/tipi";
import { Badge } from "@/components/ui/badge";
import { fmtRelativa } from "@/lib/format";
import { ExternalLink, FileStack, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documenti" };

// Archivio dei documenti pubblicati dallo studio.
//
// Prima si vedevano solo gli ultimi cinque nella colonna della dashboard: un
// documento pubblicato l'anno scorso era di fatto irraggiungibile se non
// ripassando dall'azienda e dal modulo che lo aveva prodotto.
//
// I filtri stanno nell'indirizzo e non in uno stato del client: una ricerca
// filtrata si può mandare a un collega, e tornando indietro si ritrova.

export default async function DocumentiPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; azienda?: string }>;
}) {
  const { tipo, azienda } = await searchParams;
  const s = await requireConsultant();

  const tipoFiltro = TIPI_DOCUMENTO.includes(tipo as TipoDocumento) ? (tipo as TipoDocumento) : null;
  const { documenti, aziende, conteggiPerTipo, totale } = await listArchivioDocumenti(s.userId, s.orgId, {
    tipo: tipoFiltro,
    companyId: azienda ?? null,
  });

  const rotta = (t: string | null, a: string | null) => {
    const p = new URLSearchParams();
    if (t) p.set("tipo", t);
    if (a) p.set("azienda", a);
    const q = p.toString();
    return q ? `/documenti?${q}` : "/documenti";
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Documenti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ogni versione pubblicata dallo studio, congelata al momento della pubblicazione.
        </p>
      </div>

      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {totale}
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {totale === 1 ? "versione pubblicata" : "versioni pubblicate"}
          </dt>
        </div>
        {documenti.length !== totale && (
          <div className="flex items-baseline gap-2">
            <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
              {documenti.length}
            </dd>
            <dt className="text-[13px] text-muted-foreground">in questo filtro</dt>
          </div>
        )}
      </dl>

      {/* Filtri come collegamenti: stanno nell'indirizzo, quindi sono
          condivisibili e sopravvivono al tasto indietro. */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tipo</span>
          <Filtro href={rotta(null, azienda ?? null)} attivo={!tipoFiltro} etichetta={`Tutti (${totale})`} />
          {TIPI_DOCUMENTO.map((t) => (
            <Filtro
              key={t}
              href={rotta(t, azienda ?? null)}
              attivo={tipoFiltro === t}
              etichetta={`${DOCUMENTI[t].breve} (${conteggiPerTipo[t] ?? 0})`}
            />
          ))}
        </div>
        {aziende.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Azienda</span>
            <Filtro href={rotta(tipo ?? null, null)} attivo={!azienda} etichetta="Tutte" />
            {aziende.map((a) => (
              <Filtro
                key={a.id}
                href={rotta(tipo ?? null, a.id)}
                attivo={azienda === a.id}
                etichetta={`${a.nome} (${a.n})`}
              />
            ))}
          </div>
        )}
      </div>

      {documenti.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <FileStack className="size-6" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            {totale === 0 ? "Nessun documento pubblicato" : "Nessun documento con questo filtro"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {totale === 0
              ? "Completa un percorso e pubblica la prima versione: da quel momento resta congelata per sempre."
              : "Prova a togliere un filtro per allargare la ricerca."}
          </p>
          {totale > 0 && (
            <Link href="/documenti" className="mt-4 text-sm font-medium text-primary hover:underline">
              Mostra tutti
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-xl border">
          {documenti.map((d) => (
            <li key={d.id}>
              <a
                href={`/documento/${d.id}`}
                target="_blank"
                rel="noopener"
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent sm:px-5"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    {etichettaDocumento(d.tipo, d.anno, true)}
                    <span className="text-muted-foreground"> · v{d.versione}</span>
                  </span>
                  <span className="block truncate text-[12px] text-muted-foreground">{d.companyNome}</span>
                </span>
                {d.versione > 1 && (
                  <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                    revisione
                  </Badge>
                )}
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
  );
}

function Filtro({ href, attivo, etichetta }: { href: string; attivo: boolean; etichetta: string }) {
  return (
    <Link
      href={href}
      aria-current={attivo ? "true" : undefined}
      className={
        "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors " +
        (attivo
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:border-foreground/25 hover:text-foreground")
      }
    >
      {etichetta}
    </Link>
  );
}
