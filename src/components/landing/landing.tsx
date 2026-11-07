import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";
import { vetrinaDelModulo } from "@/features/vetrina/registro";
import { PIANI, fasceVendibili } from "@/lib/prezzi";
import { ECOVADIS, ecovadisValido } from "@/lib/ecovadis";
import { SiteHeader } from "./site-header";
import { PiedeMarketing } from "./piede";
import { Reveal } from "./scroll-reveal";
import { Faq } from "./faq";
import { DOMANDE } from "./domande";
import { MITTENTI, PROBLEMI } from "./problemi";
import { NUMERI_VETRINA as NV } from "./numeri-vetrina";
import { BadgeEcoVadis, FirmaEcoVadis } from "./ecovadis";
import { FascicoloVetrina } from "./fascicolo-vetrina";
import { DocumentoVetrina } from "./documento-vetrina";
import { TreGesti, type Gesto } from "./tre-gesti";
// I nomi dei file cambiano col contenuto: li scrive `scripts/foto-gesti.mjs`.
import IMMAGINI_GESTI from "./gesti-immagini.json";
import { APERTURA_PREDEFINITA, SOTTOTITOLO, TITOLI, type Forma } from "./apertura-dati";

// LA LANDING (versione del 7 novembre 2026), costruita sui testi di
// `docs/copy-landing-v3.md`: necessità, utilità, unicità, in otto sezioni.
//
// ⚠️ IL DESTINATARIO è il responsabile interno dell'azienda (decisione del committente,
// 6 novembre 2026); i consulenti hanno una fascia loro e i loro piani.
//
// ⚠️ LA COPY È DURA MA VERA. Ogni richiesta citata sta in `problemi.ts` con la sua fonte,
// e la fonte si stampa sotto il testo.
//
// ⚠️ NESSUNA CIFRA DI PREZZO sulla home: i prezzi stanno su `/prezzi`. Il collaudo
// pubblico cerca gli importi col simbolo dell'euro per verificarlo.
//
// La stessa pagina serve due indirizzi: la home, con la scelta predefinita, e il
// laboratorio (`/lab/landing`), che rende TUTTE le varianti dell'apertura e le fa
// scegliere con gli attributi sulla radice.

/** Il piano dell'azienda che fa da sé: è il cliente primario dal 6 novembre 2026. */
const PIANO_AZIENDA = fasceVendibili().find((k) => PIANI[k].pubblico === "azienda") ?? "azienda";

const GESTI: Gesto[] = [
  {
    titolo: "Rispondi alle domande",
    testo: "Ogni passo ti dice cosa serve e dove trovarlo. Le voci del tuo settore sono già proposte.",
    immagine: IMMAGINI_GESTI.domande,
    alt: "Il registro delle sorgenti dell'inventario GHG, con un'esclusione motivata e le voci proposte dal codice ATECO",
  },
  {
    titolo: "I calcoli si fanno da soli",
    testo: "Emissioni, indicatori, scadenze di legge. Sempre lo stesso numero.",
    immagine: IMMAGINI_GESTI.calcoli,
    alt: "I risultati dell'inventario GHG per categoria, con il doppio Scope 2",
  },
  {
    titolo: "Consegni il documento",
    testo: "Impaginato, congelato, verificabile da chiunque.",
    immagine: IMMAGINI_GESTI.documento,
    alt: "Il rapporto d'inventario impaginato, pronto da consegnare",
  },
];

/** L'anagrafica d'esempio e dove finisce. Gli stessi valori della dimostrativa. */
const DATI_SCRITTI: [string, string][] = [
  ["Ragione sociale", "Corvane Meccanica S.r.l."],
  ["Codice ATECO", "25.62"],
  ["Dipendenti", "48"],
  ["Energia elettrica", "612.000 kWh"],
];
const DATI_PASSATI: [ModuloAzienda, string][] = [
  ["ghg", "612.000 kWh"],
  ["energetico", "612.000 kWh"],
  ["bilancio", "48 dipendenti"],
  ["mog231", "ATECO 25.62"],
  ["gdpr", "Corvane Meccanica"],
];



export type SceltaApertura = { forme: Forma[]; titoli: number[] };

export function Landing({ apertura }: { apertura?: SceltaApertura }) {
  const forme = apertura?.forme ?? [APERTURA_PREDEFINITA.forma];
  const titoli = apertura?.titoli ?? [APERTURA_PREDEFINITA.titolo];
  return (
    <>
      <SiteHeader />
      {/* `text-pretty` si eredita: niente parole orfane in fondo ai paragrafi. I titoli
          portano `text-balance`, che lo sovrascrive. */}
      <main className="flex-1 text-pretty">
        {/* ============================================================ APERTURA */}
        {/* ⚠️ Niente animazione d'entrata sul titolo: è l'elemento che il browser misura per
            primo, e non deve mai partire trasparente. */}
        <section className="border-b">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-[1fr_1fr] md:gap-16 md:py-20">
            <div>
              {titoli.map((t) => (
                <h1 key={t} data-t={t} className="font-display text-display font-bold text-balance text-tema-titolo">
                  {TITOLI[t - 1]}
                </h1>
              ))}
              <p className="mt-6 max-w-[34rem] text-lead text-muted-foreground">{SOTTOTITOLO}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-demo">
                  <Link href="/registrati">
                    Prova la demo <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/prezzi">Vedi i prezzi</Link>
                </Button>
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Un&apos;azienda d&apos;esempio già compilata, nessuna carta richiesta.
              </p>
              {/* ⚠️ La strada d'acquisto sta sopra la piega anche da telefono (regola del 13
                  agosto 2026, nata da un cliente vero: «se voglio acquistare senza demo non è
                  previsto?»). La verifica `tutto-pubblico` la misura. */}
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Hai già deciso?{" "}
                <Link href={`/attiva/${PIANO_AZIENDA}`} className="font-medium text-foreground underline underline-offset-2">
                  Attiva il servizio
                </Link>
                <span aria-hidden> · </span>
                <Link href="/#consulenti" className="font-medium text-foreground underline underline-offset-2">
                  Sei un consulente?
                </Link>
              </p>
              <FirmaEcoVadis />
            </div>
            <div>
              {forme.map((f) => (
                <div key={f} data-f={f}>
                  {f === "fascicolo" ? <FascicoloVetrina /> : <DocumentoVetrina />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================== CHE COSA TI CHIEDONO */}
        {/* ⚠️ Righe a tutta larghezza, una frase grande per mittente (7 novembre 2026, critica di
            Axialoop): i riquadri con l'occhiello maiuscolo erano la parte più «elenco» della
            pagina. Il mittente sta in tondo, nel colore d'accento. La legge ha una frase sola in
            grande, la più dura, e le altre tre in una riga corta: restano tutte, ognuna con la
            sua soglia e la sua fonte. */}
        <section id="problema" className="scroll-mt-20 border-b border-tema-bordo bg-tema-superficie text-tema-testo">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <h2 className="font-display max-w-2xl text-headline font-bold text-balance">
                Te lo chiederanno. Da quattro parti.
              </h2>
            </Reveal>
            <div className="mt-12">
              {MITTENTI.map((mittente) => {
                const [p, ...altre] = PROBLEMI.filter((x) => x.mittente === mittente);
                return (
                  <Reveal key={mittente}>
                    <div className="grid gap-x-10 gap-y-3 border-t border-tema-bordo py-8 md:grid-cols-[12rem_1fr] md:py-10">
                      <p className="text-[15px] font-semibold text-tema-accento md:pt-2">{mittente}</p>
                      <div>
                        <h3 className="font-display max-w-3xl text-[clamp(1.75rem,1.2rem+2.2vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.02em] text-balance">
                          {p.titolo}
                        </h3>
                        <p className="mt-3 text-[16px] leading-relaxed text-tema-attenuato">{p.testo}</p>
                        <p className="mt-2 font-mono text-fonte text-tema-attenuato" data-fonte>
                          {p.fonte}
                        </p>
                        {altre.length > 0 && (
                          <ul className="mt-7 grid gap-x-8 gap-y-4 border-t border-tema-bordo pt-6 md:grid-cols-3">
                            {altre.map((a) => (
                              <li key={a.titolo}>
                                <p className="text-[15px] font-semibold leading-snug text-balance">{a.titolo}</p>
                                <p className="mt-1.5 font-mono text-fonte text-tema-attenuato" data-fonte>
                                  {a.fonte}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <p className="font-display mt-4 border-t border-tema-bordo pt-10 text-headline font-bold text-balance">
              Ognuno vuole un documento. Non una risposta a voce.
            </p>
          </div>
        </section>

        {/* ========================================================== COME FUNZIONA */}
        <section id="come-funziona" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <h2 className="font-display max-w-xl text-headline font-bold text-balance">
                Tre gesti. Il resto lo fa la piattaforma.
              </h2>
            </Reveal>
            <div className="mt-12">
              <TreGesti gesti={GESTI} />
            </div>
          </div>
        </section>

        {/* ============================================================== I PERCORSI */}
        {/* ⚠️ Icone che si aprono, alla maniera di una schermata di applicazioni (7 novembre
            2026, richiesta del committente e critica di Axialoop). L'oggetto cliccabile è la
            TESSERA col nome sotto, non una card: niente bordo, niente «Apri» ripetuto sedici
            volte. Che si clicchi lo dicono il puntatore, la tessera che sale col suo colore al
            passaggio (solo dove il passaggio esiste: `hover:` in Tailwind 4 è già dentro
            `@media (hover: hover)`), la pressione e l'anello di fuoco. Un pannello solo, coi tre
            gruppi su tre righe di lunghezza diversa: i conteggi diversi rompono da soli
            l'uniformità. */}
        <section id="percorsi" className="scroll-mt-20 bg-muted/50">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <h2 className="font-display max-w-xl text-headline font-bold text-balance">
                {NV.percorsi} percorsi. Apri quelli che ti servono.
              </h2>
            </Reveal>
            <div className="mt-12 rounded-3xl border bg-card px-5 py-2 shadow-sm md:px-8 md:py-4">
              {MODULI_PER_AREA.map((g) => (
                <div
                  key={g.area}
                  data-gruppo={g.area}
                  className="grid gap-x-8 gap-y-5 border-b py-7 last:border-b-0 md:grid-cols-[10rem_1fr] md:py-9"
                >
                  <p className="flex items-center gap-2.5 text-[15px] font-semibold md:pt-4">
                    <span data-tratto className={cn("size-2.5 shrink-0 rounded-full", g.colore.tratto)} aria-hidden />
                    {g.nome}
                    <span className="font-normal tabular-nums text-muted-foreground">{g.moduli.length}</span>
                  </p>
                  <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:flex sm:flex-wrap sm:gap-x-2">
                    {g.moduli.map((m) => {
                      const v = vetrinaDelModulo(m.href);
                      const Icona = m.icona;
                      return (
                        <li key={m.href} data-modulo={m.href} className="sm:w-[7rem]">
                          <Link
                            href={v ? `/percorsi/${v.slug}` : "/#percorsi"}
                            className="group flex min-h-[88px] cursor-pointer flex-col items-center text-center outline-none"
                            style={{ "--ombra": `var(--area-${g.area})` } as React.CSSProperties}
                          >
                            <span
                              className={cn(
                                "flex size-14 items-center justify-center rounded-[16px] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-[3px] group-hover:shadow-[0_8px_20px_-8px_var(--ombra)] group-active:scale-[0.96] group-active:duration-100 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card sm:size-16 sm:rounded-[18px]",
                                m.colore.pieno,
                              )}
                              aria-hidden
                            >
                              <Icona className="size-6 sm:size-7" strokeWidth={1.75} />
                            </span>
                            <span className="mt-2.5 text-[12.5px] font-medium leading-[1.3] hyphens-auto underline-offset-4 group-hover:underline sm:line-clamp-3 sm:text-[13px]">
                              {m.nome}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================== L'UNICITÀ */}
        {/* L'ancora resta `#metodo`: la usano il menu, il piede e la firma EcoVadis.
            ⚠️ Si MOSTRA il dato che passa, non lo si dice: a sinistra l'anagrafica dell'azienda
            d'esempio, a destra gli stessi valori dentro i percorsi. I passaggi sono quelli veri
            del prodotto (anagrafica copiata all'avvio, consumi proposti fra inventario e
            bilancio energetico, ATECO che propone i reati 231), e i numeri quelli della
            dimostrativa: chi entra nella demo li ritrova uguali. */}
        <section id="metodo" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-headline font-bold text-balance">
                  {NV.percorsi} percorsi, un solo fascicolo.
                </h2>
                <p className="mt-4 text-lead text-muted-foreground">Un dato si scrive una volta e passa dove serve.</p>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)] md:gap-8" aria-hidden>
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-[13px] font-semibold text-muted-foreground">Anagrafica, scritta una volta</p>
                  <dl className="mt-3 divide-y text-[14px]">
                    {DATI_SCRITTI.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-medium tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <ArrowRight className="mx-auto size-6 rotate-90 text-primary md:rotate-0" />
                <ul className="space-y-2">
                  {DATI_PASSATI.map(([modulo, valore]) => {
                    const m = MODULI_PER_AREA.flatMap((g) => g.moduli).find((x) => x.href === modulo)!;
                    const Icona = m.icona;
                    return (
                      <li key={modulo} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
                        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", m.colore.pieno)}>
                          <Icona className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug sm:truncate">{m.nome}</span>
                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[12.5px] font-medium tabular-nums text-primary">
                          {valore}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>

            <p className="mt-10 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
              E ogni documento esce congelato, con un codice che chiunque può verificare.
            </p>
          </div>
        </section>

        {/* ===================================================== ABBONAMENTO E CONSULENTI */}
        {/* ⚠️ Una sezione sola a due colonne (critica di Axialoop): erano due strisce sottili di
            fila con la stessa forma. Nell'abbonamento solo il rimando ai prezzi, come chiesto dal
            committente: come si paga e come si disdice lo dicono la pagina dei prezzi e le sue
            domande. I prezzi restano FUORI dalla home. Le ancore `#acquisto` (menu, piede) e
            `#consulenti` (apertura) restano. */}
        <section id="acquisto" className="scroll-mt-20 bg-muted/50">
          <div className="mx-auto grid w-full max-w-6xl divide-y px-5 md:grid-cols-2 md:divide-x md:divide-y-0">
            <Reveal>
              <div className="py-14 md:py-20 md:pr-12">
                <h2 className="font-display text-headline font-bold text-balance">Un abbonamento, tutti i percorsi.</h2>
                <Button size="lg" className="mt-8" asChild data-tour="cta-acquisto">
                  <Link href="/prezzi">
                    Vedi i prezzi <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal>
              <div id="consulenti" className="scroll-mt-20 py-14 md:py-20 md:pl-12">
                <h2 className="font-display text-headline font-bold text-balance">Segui più aziende?</h2>
                <p className="mt-3 text-lead text-muted-foreground">Un fascicolo per cliente, col marchio del tuo studio.</p>
                <Button size="lg" variant="outline" className="mt-8" asChild>
                  <Link href="/prezzi">I piani per i consulenti</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================== FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-16 md:py-28">
            <h2 className="font-display text-headline font-bold">Domande frequenti</h2>
            <Faq domande={DOMANDE} />
          </div>
        </section>

        {/* ============================================================== CHIUSURA */}
        <section className="bg-vetrina-petrolio text-vetrina-petrolio-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <h2 className="font-display max-w-3xl text-headline font-bold text-balance">
              La prossima richiesta arriverà. Falla trovare pronta.
            </h2>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" className="bg-vetrina-petrolio-accento text-vetrina-petrolio hover:bg-vetrina-petrolio-accento/90" asChild>
                <Link href="/registrati">
                  Prova la demo <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-vetrina-petrolio-border bg-transparent text-vetrina-petrolio-foreground hover:bg-vetrina-petrolio-foreground/10 hover:text-vetrina-petrolio-foreground"
                asChild
              >
                <Link href="/prezzi">Vedi i prezzi</Link>
              </Button>
            </div>
            {ecovadisValido() && (
              <div id="evalis" className="mt-16 flex max-w-2xl scroll-mt-20 items-start gap-5 border-t border-vetrina-petrolio-border pt-8">
                <BadgeEcoVadis dimensione={88} className="shrink-0" />
                {/* ⚠️ Il limite si dichiara con queste parole, e il collaudo `ecovadis` le cerca:
                    EcoVadis è un rating di Evalis come organizzazione, non del software. */}
                <p className="max-w-[65ch] text-[14px] leading-relaxed text-vetrina-petrolio-muted">
                  EvalisDeck è sviluppato per {ECOVADIS.azienda}, valutata EcoVadis {ECOVADIS.medaglia} con{" "}
                  {ECOVADIS.punteggio}/100, {ECOVADIS.percentile}° percentile. Non è una certificazione del software: la
                  valutazione riguarda {ECOVADIS.azienda} come organizzazione e non certifica EvalisDeck né i documenti che
                  produce.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <PiedeMarketing />
    </>
  );
}
