import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Headphones, Play } from "lucide-react";

import { corsoDelModulo, esisteCorso } from "@/features/formazione";
import { MODULI_AZIENDA, AREE } from "@/features/companies/moduli";
import { SezioneCorso } from "@/components/formazione/corso";
import { SelettoreCorsi } from "@/components/formazione/selettore";
import { IndiceCorso } from "@/components/formazione/indice";
import { tempoDaDedicare, formattaDurata } from "@/features/formazione/tempo";
import { minutiDiVoce } from "@/features/formazione/audio";

type Props = { params: Promise<{ modulo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modulo } = await params;
  if (!esisteCorso(modulo)) return { title: "Formazione" };
  return { title: `Formazione · ${corsoDelModulo(modulo).nome}` };
}

export default async function CorsoPage({ params }: Props) {
  const { modulo } = await params;
  // ⚠️ Un percorso inventato nell'indirizzo deve dare 404, non una pagina vuota: una
  // pagina che si apre e non contiene niente si legge come un guasto del prodotto.
  if (!esisteCorso(modulo)) notFound();

  const c = corsoDelModulo(modulo);
  const m = MODULI_AZIENDA.find((x) => x.href === modulo)!;
  const area = AREE[m.area];
  const voce = minutiDiVoce(c.modulo, c.sezioni, c.idComuni);

  return (
    // ⚠️ IL TERZO REGISTRO, MA CONTENUTO. Il prodotto ne ha già due — l'app densa e il
    // documento editoriale — e DESIGN.md dice che il contrasto fra i due è il lusso. La
    // formazione è il terzo, e si stacca per RITMO: più aria fra le sezioni, una colonna
    // di lettura più larga, il colore dell'area come filo. Niente bande a piena larghezza
    // né numeri giganti: sarebbe il template generico che PRODUCT.md nomina fra le
    // anti-reference, e il committente ha chiesto esplicitamente che non stacchi troppo.
    <div className="mx-auto w-full max-w-6xl pb-24">
      <Link
        href="/formazione"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Formazione
      </Link>

      <header className="mt-4 flex gap-4">
        {/* Il filo del colore d'area: dice la materia senza colorare mezza pagina. */}
        <span className={`mt-1 w-0.5 shrink-0 rounded-full ${area.colore.tratto}`} aria-hidden />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <m.icona className="size-3.5" strokeWidth={2} aria-hidden />
            {area.nome}
          </p>
          <h1 className="font-display mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em]">{c.nome}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="font-mono">{c.norma}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              <span data-slot="kpi">{formattaDurata(tempoDaDedicare(c.minuti))}</span> da dedicare
            </span>
            <span>
              <span data-slot="kpi">{c.sezioni.length}</span> sezioni
            </span>
            {voce.totale > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-primary">
                <Headphones className="size-3.5" aria-hidden />
                <span data-slot="kpi">{voce.totale}</span> minuti di voce
              </span>
            )}
          </p>
        </div>
      </header>

      {/* ⚠️ La presentazione e' una SECONDA vista, non un'alternativa che sostituisce
          questa. La pagina che scorre resta l'ingresso normale perche' dalla seconda volta
          in poi si cerca una cosa sola, e in una presentazione non si cerca. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/formazione/${c.modulo}/presentazione`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[14.5px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow"
        >
          <Play className="size-4" strokeWidth={2.5} aria-hidden />
          Segui la presentazione
        </Link>
        <p className="text-[13px] text-muted-foreground">
          Una schermata per volta, con la voce che spiega. Qui sotto lo stesso corso, da leggere.
        </p>
      </div>

      <SelettoreCorsi corrente={c.modulo} />

      {!c.completo && (
        <div className="mt-6 max-w-prose rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3">
          <p className="text-[13px] font-semibold text-warning">La parte specifica è in preparazione</p>
          <p className="mt-1 text-[14px] leading-relaxed text-foreground/85">
            Questo corso spiega come si usa il prodotto: dove sei, come si salva, che cosa controlla la
            verifica e che cosa succede quando pubblichi. Le sezioni sul metodo di questo percorso non
            ci sono ancora. Nel frattempo la{" "}
            <Link href="/guida" className="underline underline-offset-4">
              guida
            </Link>{" "}
            e il tour della pagina restano a disposizione.
          </p>
        </div>
      )}

      {/* ⚠️ L'indice sta A LATO sulle larghezze grandi e SOPRA sulle piccole, e segue la
          lettura. Un corso è lungo: sapere dove si è e quanto manca è la differenza fra
          leggere e scorrere, e su un telefono una colonna laterale sarebbe mezza pagina
          di sommario prima della prima riga di testo. */}
      <div className="mt-8 gap-10 lg:flex lg:items-start">
        <IndiceCorso sezioni={c.sezioni.map((s) => ({ id: s.id, titolo: s.titolo, minuti: s.minuti }))} />

        <div className="mt-8 min-w-0 flex-1 space-y-12 lg:mt-0" data-sezioni="">
          {c.sezioni.map((s, i) => (
            <SezioneCorso
              key={s.id}
              sezione={s}
              indice={i + 1}
              tinta={{ tratto: area.colore.tratto, testo: m.colore.tenue }}
            />
          ))}

          <div className="border-t pt-6">
            <p className="text-[13.5px] text-muted-foreground">
              Per le domande che non trovano risposta qui, la{" "}
              <Link href="/guida" className="underline underline-offset-4 hover:text-primary">
                guida all&apos;uso
              </Link>{" "}
              raccoglie le più frequenti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
