import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConsultant } from "@/features/auth/guards";
import { getProgramma } from "@/features/sgesg/programma";
import { elencaSchede } from "@/features/sgesg/schede";
import { pontiDelProgramma, testoPonte } from "@/features/sgesg/ponti";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
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

  const [schede, ponti] = await Promise.all([
    elencaSchede(s.userId, s.orgId, vista.programma.id, fase),
    pontiDelProgramma(s.userId, s.orgId, companyId, n),
  ]);
  const ponte = ponti.find((x) => x.faseKey === fase) ?? null;
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

      {/* ⚠️ IL PONTE, quando questa fase ne ha uno. Tre fasi su otto chiedono cose che
          il prodotto fa gia': la materialita', le emissioni e i capitoli. Qui si mostra
          lo STATO di quel percorso e ci si va dentro — il dato resta dove nasce.
          Copiarlo qui «cosi' si vede senza cambiare pagina» significherebbe averlo in
          due posti, e un dato in due posti e' un dato in nessun posto. */}
      {ponte && (
        <section className="mt-6" aria-labelledby="ponte" data-ponte={ponte.modulo}>
          <h2 id="ponte" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Questa fase si lavora nel percorso dedicato
          </h2>
          <Link
            href={ponte.href}
            data-ponte-href=""
            className="group mt-3 flex items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-accent"
          >
            <span
              className={
                "flex size-10 shrink-0 items-center justify-center rounded-lg border " +
                (ponte.stato === "mancante"
                  ? "border-dashed text-muted-foreground"
                  : "border-primary/25 bg-primary/8 text-primary")
              }
            >
              {(() => {
                const m = MODULI_AZIENDA.find((x) => x.href === ponte.modulo)!;
                return <m.icona className="size-5" strokeWidth={1.75} />;
              })()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-[15px] font-semibold tracking-tight group-hover:text-primary">
                  {ponte.titolo}
                </span>
                <Badge variant={ponte.stato === "pronto" ? "default" : "outline"} data-ponte-stato={ponte.stato}>
                  {testoPonte(ponte.stato)}
                </Badge>
              </span>
              <span className="mt-1 block max-w-prose text-[13px] leading-relaxed text-muted-foreground">
                {ponte.richiesta}
              </span>
              {ponte.dettaglio && (
                <span className="mt-1 block text-[13px] font-medium" data-slot="kpi">
                  {ponte.dettaglio}
                </span>
              )}
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </Link>
          {/* ⚠️ Detto a chiare lettere: il ponte NON avanza la fase. Lo stato della fase
              e' una dichiarazione del consulente, e dedurla da un dato tecnico gli
              toglierebbe di mano un giudizio che e' suo. */}
          <p className="mt-2 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
            Lo stato qui sopra è letto dal percorso, non copiato: se cambia lì, cambia qui. La fase resta
            da chiudere a mano, quando lo decidi tu.
          </p>
        </section>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Le schede della fase
      </h2>
      <ul className="mt-3 divide-y rounded-xl border" data-schede="">
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
