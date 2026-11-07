import Link from "next/link";
import { ArrowRight, FolderOpen, Repeat2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { vetrinaDelModulo } from "@/features/vetrina/registro";
import { PIANI, fasceVendibili, fasceConsulenti } from "@/lib/prezzi";
import { ECOVADIS, ecovadisValido } from "@/lib/ecovadis";
import { SiteHeader } from "./site-header";
import { PiedeMarketing } from "./piede";
import { Reveal } from "./scroll-reveal";
import { migliaia } from "./migliaia";
import { Faq } from "./faq";
import { DOMANDE } from "./domande";
import { MITTENTI, PROBLEMI } from "./problemi";
import { NUMERI_VETRINA as NV } from "./numeri-vetrina";
import { BadgeEcoVadis, FirmaEcoVadis } from "./ecovadis";
import { FascicoloVetrina } from "./fascicolo-vetrina";
import { DocumentoVetrina } from "./documento-vetrina";
import { TreGesti, type Gesto } from "./tre-gesti";
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
/** La capienza più alta che si compra online, per la sezione dei consulenti. */
const MASSIMO_CONSULENTI = Math.max(...fasceConsulenti().map((k) => PIANI[k].aziende));

const GESTI: Gesto[] = [
  {
    titolo: "Rispondi alle domande",
    testo:
      "Ogni passo dice cosa serve, perché la norma lo chiede e dove trovarlo. Le voci tipiche del tuo settore arrivano già proposte.",
    immagine: "/landing/gesti/domande.webp",
    alt: "Il registro delle sorgenti dell'inventario GHG, con un'esclusione motivata e le voci proposte dal codice ATECO",
  },
  {
    titolo: "I calcoli si fanno da soli",
    testo: "Emissioni, indicatori, scadenze di legge: lo stesso numero ogni volta, col metodo accanto.",
    immagine: "/landing/gesti/calcoli.webp",
    alt: "I risultati dell'inventario GHG per categoria, con il doppio Scope 2",
  },
  {
    titolo: "Consegni il documento",
    testo: "Impaginato e congelato, con un codice che chiunque può verificare.",
    immagine: "/landing/gesti/documento.webp",
    alt: "Il rapporto d'inventario impaginato, pronto da consegnare",
  },
];

const UNICITA = [
  {
    icona: FolderOpen,
    titolo: "Tutto nello stesso posto",
    testo: "Percorsi, esercizi e documenti pubblicati dell'azienda, in un fascicolo solo.",
  },
  {
    icona: Repeat2,
    titolo: "Un dato si scrive una volta",
    testo: "L'anagrafica passa in ogni percorso, i consumi fra inventario, bilancio energetico e indicatori.",
  },
  {
    icona: Users,
    titolo: "Ognuno la sua parte",
    testo: `${PIANI[PIANO_AZIENDA].accessi} accessi nel piano per l'azienda, ciascuno sui percorsi che gli assegni. Il documento esce uno.`,
  },
  {
    icona: ShieldCheck,
    titolo: "Ogni documento si verifica",
    testo: "Ogni versione è congelata e porta un codice pubblico: cliente e auditor controllano che sia autentico.",
  },
];

const ACQUISTO = [
  ["Carta o bonifico", "Con la carta si attiva in pochi secondi. Ti serve l'ordine d'acquisto? Ti mandiamo il preventivo."],
  ["Quattordici giorni", "Rimborso integrale, se non hai ancora pubblicato un documento."],
  ["Si disdice quando vuoi", "Dalla pagina dell'abbonamento. I dati restano tuoi e consultabili."],
] as const;

export type SceltaApertura = { forme: Forma[]; titoli: number[] };

export function Landing({ apertura }: { apertura?: SceltaApertura }) {
  const forme = apertura?.forme ?? [APERTURA_PREDEFINITA.forma];
  const titoli = apertura?.titoli ?? [APERTURA_PREDEFINITA.titolo];
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
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
        <section id="problema" className="scroll-mt-20 border-b border-tema-bordo bg-tema-superficie text-tema-testo">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <h2 className="font-display max-w-xl text-headline font-bold text-balance">
                Le richieste arrivano. Da quattro parti.
              </h2>
            </Reveal>
            <div className="mt-12">
              {MITTENTI.map((mittente) => (
                <Reveal key={mittente}>
                  <div className="grid gap-x-10 gap-y-4 border-t border-tema-bordo py-8 md:grid-cols-[11rem_1fr]">
                    <p className="font-display text-title font-bold">{mittente}</p>
                    <div className="grid gap-7 md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
                      {PROBLEMI.filter((p) => p.mittente === mittente).map((p) => (
                        <div key={p.titolo} className="max-w-xl">
                          <h3 className="text-[17px] font-semibold leading-snug">{p.titolo}</h3>
                          <p className="mt-2 text-[15px] leading-relaxed text-tema-attenuato">{p.testo}</p>
                          <p className="mt-3 font-mono text-fonte text-tema-attenuato" data-fonte>
                            {p.fonte}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================== COME FUNZIONA */}
        <section id="come-funziona" className="scroll-mt-20 border-b">
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
        <section id="percorsi" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
                <div className="max-w-xl">
                  <h2 className="font-display text-headline font-bold text-balance">
                    {NV.percorsi} percorsi. Apri quelli che ti servono.
                  </h2>
                  <p className="mt-4 text-lead text-muted-foreground">
                    Un abbonamento li comprende tutti. Si parte da ciò che ti chiedono adesso, il resto aspetta senza
                    ingombrare.
                  </p>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                  {MODULI_PER_AREA.map((g) => (
                    <li key={g.area} data-gruppo={g.area} className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", g.colore.tratto)} aria-hidden />
                      <span className="font-medium">{g.nome}</span>
                      <span className="tabular-nums text-muted-foreground">{g.moduli.length}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* ⚠️ Una griglia di percorsi, non di schede: nessun riquadro, l'icona del percorso
                nel colore del suo gruppo. Sedici voci in quattro colonne stanno in una
                schermata anche da telefono, cosa che un elenco con i passi non faceva (da
                sola, quella versione contava 1.369 parole). I passi stanno nelle pagine. */}
            <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
              {MODULI_PER_AREA.flatMap((g) => g.moduli).map((m) => {
                const v = vetrinaDelModulo(m.href);
                const Icona = m.icona;
                const corpo = (
                  <>
                    <span className={cn("flex size-11 items-center justify-center rounded-lg border transition-colors duration-150", m.colore.tenue)} aria-hidden>
                      <Icona className="size-5" />
                    </span>
                    <span className="mt-3 block text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
                      {m.nome}
                    </span>
                    <span className="mt-1 block font-mono text-[11.5px] leading-snug text-muted-foreground">{m.norma}</span>
                  </>
                );
                return (
                  <li key={m.href} data-modulo={m.href}>
                    {v ? (
                      <Link href={`/percorsi/${v.slug}`} className="group block">
                        {corpo}
                      </Link>
                    ) : (
                      corpo
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-14 border-t pt-5 text-[13px] text-muted-foreground">
              {NV.percorsi} percorsi in {NV.gruppi} gruppi, {NV.tipiDocumento} tipi di documento,{" "}
              {migliaia(NV.requisiti)} requisiti e controlli catalogati, {migliaia(NV.corpus)} procedure e moduli pronti.
            </p>
          </div>
        </section>

        {/* ========================================================== L'UNICITÀ */}
        {/* L'ancora resta `#metodo`: la usano il menu, il piede e la firma EcoVadis. */}
        <section id="metodo" className="scroll-mt-20 border-b bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-16 md:py-28">
            <Reveal>
              <h2 className="font-display text-headline font-bold text-balance">
                {NV.percorsi} percorsi, un solo fascicolo.
              </h2>
              <p className="mt-4 text-lead text-muted-foreground">
                Non sono {NV.percorsi} programmi messi insieme: un dato si scrive una volta e passa in ogni percorso.
              </p>
              <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
                Dentro c&apos;è il metodo di un consulente: guide per ogni tema, esclusioni sempre motivate, controlli di
                coerenza prima dell&apos;auditor.
              </p>
            </Reveal>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {UNICITA.map(({ icona: Icona, titolo, testo }) => (
                <Reveal key={titolo}>
                  <div className="border-t border-foreground/15 pt-5">
                    <Icona className="size-5 text-primary" aria-hidden />
                    <h3 className="font-display mt-3 text-title font-semibold">{titolo}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{testo}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================= PER I CONSULENTI */}
        <section id="consulenti" className="scroll-mt-20 border-b">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-12 gap-y-6 px-5 py-14">
            <div className="max-w-2xl">
              <h2 className="font-display text-title font-bold md:text-[1.625rem] md:leading-tight">
                Segui più aziende? Lo stesso metodo, per tutte.
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Un fascicolo per cliente, i documenti col marchio del tuo studio, un collegamento da cui il cliente scarica
                i suoi. Fino a {MASSIMO_CONSULENTI} aziende, e oltre su accordo.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/prezzi">I piani per i consulenti</Link>
            </Button>
          </div>
        </section>

        {/* ========================================================= COME SI ACQUISTA */}
        {/* ⚠️ I PREZZI RESTANO FUORI dalla home, per scelta: stanno su /prezzi. Ma «niente
            prezzi» non significa «niente informazioni»: qui si dice che cosa si compra, come
            si paga, come si disdice. */}
        <section id="acquisto" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-headline font-bold text-balance">Un abbonamento, tutto compreso.</h2>
                <p className="mt-4 text-lead text-muted-foreground">
                  Tutti i percorsi, documenti senza limite di numero, gli accessi per i colleghi. Annuale o mensile,
                  allo stesso prezzo a ogni rinnovo.
                </p>
              </div>
            </Reveal>
            <ul className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-3">
              {ACQUISTO.map(([t, d]) => (
                <li key={t} className="border-t pt-5">
                  <h3 className="text-[16px] font-semibold">{t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild data-tour="cta-acquisto">
                <Link href={`/attiva/${PIANO_AZIENDA}`}>
                  Attiva il servizio <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/prezzi">Vedi i prezzi</Link>
              </Button>
              <Link href="/prezzi#enterprise" className="ml-1 text-[14px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Oltre {MASSIMO_CONSULENTI} aziende? Contattaci
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================== FAQ */}
        <section id="faq" className="scroll-mt-20 border-b">
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
              <div id="evalis" className="mt-16 flex max-w-3xl scroll-mt-20 items-start gap-5 border-t border-vetrina-petrolio-border pt-8">
                <BadgeEcoVadis dimensione={88} className="shrink-0" />
                {/* ⚠️ Il limite si dichiara con queste parole, e il collaudo `ecovadis` le cerca:
                    EcoVadis è un rating di Evalis come organizzazione, non del software. */}
                <p className="text-[14px] leading-relaxed text-vetrina-petrolio-muted">
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
