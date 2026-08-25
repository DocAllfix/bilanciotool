import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConsultant } from "@/features/auth/guards";
import { getProgramma } from "@/features/sgesg/programma";
import { elencaSchede } from "@/features/sgesg/schede";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fase del metodo ESG" };

// Le schede di una fase. Righe e non riquadri: si leggono in colonna e si confrontano,
// e a un numero dispari non lasciano un buco in griglia.

export default async function FaseSgesgPage({
  params,
}: {
  params: Promise<{ companyId: string; anno: string; fase: string }>;
}) {
  const { companyId, anno, fase } = await params;
  const n = Number(anno);
  if (!Number.isInteger(n)) notFound();

  const s = await requireConsultant();
  const vista = await getProgramma(s.userId, s.orgId, companyId, n);
  if (!vista) notFound();
  const def = vista.fasi.find((f) => f.key === fase);
  if (!def) notFound();

  const schede = await elencaSchede(s.userId, s.orgId, vista.programma.id, fase);
  const completate = schede.filter((x) => x.stato === "completata").length;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href={`/aziende/${companyId}/sgesg/${n}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Le fasi del metodo
      </Link>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{def.codice}</p>
      <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">{def.nome}</h1>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">{def.scopo}</p>

      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-schede-complete={completate}>
            {completate}
            <span className="text-muted-foreground">/{schede.length}</span>
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {completate === 1 ? "scheda completata" : "schede completate"}
          </dt>
        </div>
      </dl>

      <ul className="mt-6 divide-y rounded-xl border" data-schede="">
        {schede.map((x) => (
          <li key={x.key} className="group relative" data-scheda-voce={x.key}>
            <Link
              href={`/aziende/${companyId}/sgesg/${n}/${fase}/${x.key}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent sm:px-5"
            >
              <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {x.codice?.replace("FORM-", "") ?? x.key}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-tight group-hover:text-primary">
                  {x.titolo}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {x.haLogica
                    ? "Registro a righe: compilazione dedicata in arrivo"
                    : x.stato === "non_aperta"
                      ? `${x.campi} ${x.campi === 1 ? "campo" : "campi"}, non ancora aperta`
                      : `${x.compilati} di ${x.campi} ${x.campi === 1 ? "campo" : "campi"} compilati`}
                </span>
              </span>
              <span className="hidden shrink-0 sm:block">
                {x.haLogica ? (
                  <Badge variant="outline">Tabella</Badge>
                ) : x.stato === "completata" ? (
                  <Badge>Completata</Badge>
                ) : x.stato === "bozza" ? (
                  <Badge variant="outline">In bozza</Badge>
                ) : null}
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
