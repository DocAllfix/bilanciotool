import type { Metadata } from "next";
import Link from "next/link";
import type Stripe from "stripe";
import { sessioneStaff } from "../guardia";
import { elencoPerPartner, type StudioAttribuito } from "@/features/partner";
import { stripe, stripeConfigurato } from "@/lib/stripe/client";
import { euro } from "@/lib/calc/compensi/importi";
import { fmtDataBreve } from "@/lib/format";
import { AttribuzioneManuale, RimuoviAttribuzione } from "@/components/staff/partner";

// I PARTNER E LE LORO PROVVIGIONI.
//
// ⚠️ Gli importi si leggono da STRIPE, a ogni apertura, e non stanno nel nostro database
// (regola della migrazione 0017): il denaro vive lì, ed è già immutabile e autorevole. Una
// nostra copia divergerebbe in silenzio al primo rimborso fatto dal cruscotto.
//
// Per chi non è staff l'area NON ESISTE: `sessioneStaff` risponde «non trovata».
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partner" };

const TIPI: Record<string, string> = {
  subscription_create: "Primo anno",
  subscription_cycle: "Rinnovo",
  subscription_update: "Modifica",
};

type Fattura = { id: string; numero: string | null; pagataIl: Date; tipo: string; imponibile: number; totale: number };

/** Le fatture pagate di uno studio. Se Stripe non risponde, si dice: `null`, non «nessuna». */
async function fattureDi(s: StudioAttribuito): Promise<Fattura[] | null> {
  if (!s.stripeCustomerId) return [];
  try {
    const r = await stripe().invoices.list({ customer: s.stripeCustomerId, status: "paid", limit: 100 });
    return r.data.map((f: Stripe.Invoice) => ({
      id: f.id ?? "",
      numero: f.number,
      pagataIl: new Date((f.status_transitions.paid_at ?? f.created) * 1000),
      tipo: TIPI[f.billing_reason ?? ""] ?? "Altro",
      imponibile: f.total_excluding_tax ?? f.total,
      totale: f.total,
    }));
  } catch (e) {
    console.error("[partner] fatture non lette per", s.organizationId, e);
    return null;
  }
}

export default async function PartnerPage() {
  const s = await sessioneStaff();
  const { partner, studi } = await elencoPerPartner(s.userId);
  const conStripe = stripeConfigurato();
  const fatture = new Map<string, Fattura[] | null>(
    await Promise.all(studi.map(async (st) => [st.organizationId, conStripe ? await fattureDi(st) : []] as const)),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8" data-partner-staff>
      <header className="mb-6">
        <p className="text-[12px] text-muted-foreground">
          <Link href="/staff/assistenza" className="hover:underline">
            Coda assistenza
          </Link>{" "}
          ·{" "}
          <Link href="/staff/arrivi" className="hover:underline">
            Arrivi da campagna
          </Link>{" "}
          · Partner
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Partner</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Gli studi attribuiti a ciascun partner e le loro fatture pagate, primo anno e rinnovi. L&apos;imponibile è
          quello di Stripe: la provvigione si calcola su questo.
        </p>
      </header>

      {partner.map((p) => {
        const suoi = studi.filter((st) => st.codice === p.codice);
        const tutte = suoi.flatMap((st) => fatture.get(st.organizationId) ?? []);
        const totale = tutte.reduce((somma, f) => somma + f.imponibile, 0);
        const incomplete = suoi.some((st) => fatture.get(st.organizationId) === null);
        return (
          <section key={p.codice} className="mb-10" data-partner={p.codice}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {p.codice}
                {p.nome !== p.codice ? <span className="font-normal text-muted-foreground"> — {p.nome}</span> : null}
              </h2>
              <p className="text-sm text-muted-foreground">
                {suoi.length} {suoi.length === 1 ? "studio" : "studi"} · imponibile pagato{" "}
                <span className="font-semibold text-foreground tabular-nums" data-totale-partner>
                  {euro(totale)} €
                </span>
                {incomplete ? " (parziale: Stripe non ha risposto per uno studio)" : ""}
              </p>
            </div>

            {suoi.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nessuno studio attribuito.</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {suoi.map((st) => {
                  const f = fatture.has(st.organizationId) ? (fatture.get(st.organizationId) ?? null) : [];
                  return (
                    <li key={st.organizationId} className="px-4 py-3" data-studio={st.organizationId}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{st.studio}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {st.titolare ?? "titolare non trovato"} ·{" "}
                            {st.origine === "registrazione" ? "scritto all'iscrizione" : "attribuito dallo staff"} il{" "}
                            {fmtDataBreve(st.attribuitaIl)}
                            {st.nota ? ` · ${st.nota}` : ""}
                          </p>
                        </div>
                        <RimuoviAttribuzione orgId={st.organizationId} studio={st.studio} codice={st.codice} />
                      </div>
                      {f === null ? (
                        <p className="mt-2 text-[12px] text-destructive">Le fatture non si sono potute leggere da Stripe.</p>
                      ) : f.length === 0 ? (
                        <p className="mt-2 text-[12px] text-muted-foreground">Nessuna fattura pagata.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-[12.5px]">
                            <thead className="text-left text-muted-foreground">
                              <tr>
                                <th className="py-1 pr-3 font-medium">Pagata il</th>
                                <th className="py-1 pr-3 font-medium">Tipo</th>
                                <th className="py-1 pr-3 font-medium">Fattura</th>
                                <th className="py-1 pr-3 text-right font-medium">Imponibile</th>
                                <th className="py-1 text-right font-medium">Totale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {f.map((x) => (
                                <tr key={x.id} className="border-t" data-fattura>
                                  <td className="py-1 pr-3">{fmtDataBreve(x.pagataIl)}</td>
                                  <td className="py-1 pr-3">{x.tipo}</td>
                                  <td className="py-1 pr-3 font-mono">{x.numero ?? "—"}</td>
                                  <td className="py-1 pr-3 text-right tabular-nums">{euro(x.imponibile)} €</td>
                                  <td className="py-1 text-right tabular-nums">{euro(x.totale)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <section className="mt-10">
        <h2 className="mb-1 text-sm font-semibold">Attribuisci a mano</h2>
        <p className="mb-3 max-w-prose text-[13px] text-muted-foreground">
          Per il cliente di un partner che all&apos;iscrizione non ha scritto il codice. Se lo studio ha già un partner,
          viene spostato; resta scritto nel registro attività chi l&apos;ha fatto e quando.
        </p>
        <AttribuzioneManuale partner={partner} />
      </section>
    </div>
  );
}
