import type { Metadata } from "next";
import Link from "next/link";
import { sessioneStaff } from "../guardia";
import { arriviRecenti, type RigaArrivi } from "@/features/arrivi";
import { giornoItaliano } from "@/lib/calc/comune/tempo-italia";
import { fmtDataBreve } from "@/lib/format";

// GLI ARRIVI DA CAMPAGNA, contati da noi.
//
// ⚠️ È il terzo numero accanto a quelli di Google: i clic che Google Ads fattura, le visite
// che Analytics vede (solo di chi acconsente), e le pagine che si sono davvero aperte con i
// parametri di una campagna. La pagina dice come leggerli insieme, perché presi da soli
// ognuno dei tre sembra contraddire gli altri.
//
// Per chi non è staff l'area NON ESISTE: `sessioneStaff` risponde «non trovata».
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Arrivi da campagna" };

const GIORNI = 30;

type Gruppo = { chiave: string; etichetta: string; arrivi: number; clicAds: number };

function raggruppa(righe: RigaArrivi[], chiave: (r: RigaArrivi) => string, etichetta: (r: RigaArrivi) => string): Gruppo[] {
  const m = new Map<string, Gruppo>();
  for (const r of righe) {
    const k = chiave(r);
    const g = m.get(k) ?? { chiave: k, etichetta: etichetta(r), arrivi: 0, clicAds: 0 };
    g.arrivi += r.conteggio;
    if (r.clicAds) g.clicAds += r.conteggio;
    m.set(k, g);
  }
  return [...m.values()];
}

export default async function ArriviPage() {
  await sessioneStaff();
  const oggi = giornoItaliano(new Date());
  const righe = await arriviRecenti(oggi, GIORNI);

  const totale = righe.reduce((s, r) => s + r.conteggio, 0);
  const totaleAds = righe.reduce((s, r) => s + (r.clicAds ? r.conteggio : 0), 0);
  const perGiorno = raggruppa(righe, (r) => r.giorno, (r) => fmtDataBreve(r.giorno));
  const perCampagna = raggruppa(
    righe,
    (r) => `${r.sorgente}|${r.mezzo}|${r.campagna}`,
    (r) => `${r.sorgente} / ${r.mezzo} / ${r.campagna}`,
  ).sort((a, b) => b.arrivi - a.arrivi);
  const perPagina = raggruppa(righe, (r) => r.pagina, (r) => r.pagina).sort((a, b) => b.arrivi - a.arrivi);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8" data-arrivi-staff>
      <header className="mb-6">
        <p className="text-[12px] text-muted-foreground">
          <Link href="/staff/assistenza" className="hover:underline">
            Coda assistenza
          </Link>{" "}
          · Arrivi da campagna ·{" "}
          <Link href="/staff/partner" className="hover:underline">
            Partner
          </Link>
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Arrivi da campagna</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Le pagine aperte con i parametri di una campagna negli ultimi {GIORNI} giorni, contate da noi senza cookie e
          senza consenso: vale per tutti i visitatori, anche per chi rifiuta.
        </p>
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-[12px] text-muted-foreground">Arrivi</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums" data-totale>
            {totale}
          </dd>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-[12px] text-muted-foreground">Di cui da un clic Google Ads</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums" data-totale-ads>
            {totaleAds}
          </dd>
        </div>
      </dl>

      {totale === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nessun arrivo da campagna in questo periodo.</p>
      ) : (
        <div className="space-y-8">
          <Tabella titolo="Per campagna" colonna="Sorgente / mezzo / campagna" gruppi={perCampagna} />
          <Tabella titolo="Per giorno" colonna="Giorno" gruppi={perGiorno} />
          <Tabella titolo="Pagine d'arrivo" colonna="Pagina" gruppi={perPagina} />
        </div>
      )}

      <section className="mt-10 max-w-prose space-y-2 text-[13px] leading-relaxed text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Come leggerlo accanto a Google</h2>
        <p>
          <strong className="text-foreground">Google Ads</strong> conta i clic sull&apos;annuncio, anche quando la pagina
          non fa in tempo ad aprirsi o chi clicca torna indietro subito. <strong className="text-foreground">Questa
          pagina</strong> conta le pagine che si sono aperte davvero: la differenza con Google Ads sono clic che non sono
          diventati visite. <strong className="text-foreground">Google Analytics</strong> vede solo chi acconsente alle
          statistiche: la differenza fra questa pagina e Analytics è il consenso, non un guasto.
        </p>
        <p>
          Ricaricare una pagina la conta due volte: evitarlo vorrebbe dire ricordare qualcosa nel browser di chi arriva,
          che è proprio ciò che questo conteggio non fa.
        </p>
      </section>
    </div>
  );
}

function Tabella({ titolo, colonna, gruppi }: { titolo: string; colonna: string; gruppi: Gruppo[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{titolo}</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-[13px]">
          <thead className="text-left text-[12px] text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">{colonna}</th>
              <th className="px-4 py-2 text-right font-medium">Arrivi</th>
              <th className="px-4 py-2 text-right font-medium">Da clic Ads</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {gruppi.map((g) => (
              <tr key={g.chiave}>
                <td className="break-all px-4 py-2 font-mono text-[12.5px]">{g.etichetta}</td>
                <td className="px-4 py-2 text-right tabular-nums">{g.arrivi}</td>
                <td className="px-4 py-2 text-right tabular-nums">{g.clicAds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
