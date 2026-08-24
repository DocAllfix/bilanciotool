import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, ShieldQuestion } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { normalizzaCodice } from "@/lib/calc/documenti/codice";
import { verificaCodice } from "@/features/documents/codice";
import { consumaColpo } from "@/features/documents/freno-verifica";
import { edizionePiuRecente } from "@/features/documents/edizione";
import { DOCUMENTI, SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { fmtData } from "@/lib/format";

// La pagina pubblica di verifica.
//
// Chi riceve un documento — una banca, un capofiliera, un ente di certificazione — digita
// il codice stampato nel colophon e vede confermato chi lo ha emesso, per chi, quando e in
// quale revisione. NESSUN contenuto: non è un canale di distribuzione, e chi ha bisogno
// del documento se lo fa mandare da chi glielo ha promesso.
//
// ⚠️ È indicizzabile di proposito, al contrario del portale cliente: quella pagina mostra
// i documenti di un'azienda dietro un token, questa non mostra niente finché non le si dà
// un codice. Ed è una pagina che vogliamo si trovi: è dove un destinatario finisce
// cercando «verifica documento EvalisDeck».
//
// ⚠️ La ricerca sta nell'INDIRIZZO (`?codice=`) e non in uno stato del client: chi
// verifica spesso incolla il collegamento in una mail interna, e un risultato che sparisce
// ricaricando renderebbe la conferma inutilizzabile proprio nel modo in cui la si usa.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifica un documento",
  description:
    "Hai ricevuto un documento prodotto con EvalisDeck? Digita il codice di verifica stampato in fondo e conferma chi lo ha emesso, per quale azienda e in quale revisione.",
  alternates: { canonical: "/verifica" },
};

export default async function VerificaPage({
  searchParams,
}: {
  searchParams: Promise<{ codice?: string }>;
}) {
  const { codice: grezzo } = await searchParams;
  const canonico = grezzo ? normalizzaCodice(grezzo) : null;

  let esito: Awaited<ReturnType<typeof verificaCodice>> = null;
  let frenato: number | null = null;

  // L'edizione corrente del dominio a cui il documento appartiene: serve a dire se
  // quella con cui e' stato prodotto e' stata superata. Una sola query, e solo quando
  // c'e' un esito da mostrare.
  let edizioneCorrente: string | null = null;
  let superata = false;

  if (canonico) {
    const h = await headers();
    // Su Vercel l'indirizzo vero sta in `x-forwarded-for`, e il primo della lista è il
    // client: gli altri sono i proxy attraversati.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "ignoto";
    const freno = await consumaColpo(ip);
    if (freno.passa) esito = await verificaCodice(canonico);
    else frenato = freno.riprovaFra;

    if (esito?.edizione) {
      edizioneCorrente = await edizionePiuRecente(esito.edizione);
      superata = Boolean(edizioneCorrente && edizioneCorrente !== esito.edizione);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-20">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Verifica di autenticità
        </p>
        <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">
          Hai ricevuto un documento? Controlla da dove viene.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Ogni documento prodotto con EvalisDeck porta in fondo un codice nella forma{" "}
          <span className="font-mono">EV-XXXX-XXXX</span>. Digitalo qui: la pagina conferma chi lo ha emesso,
          per quale azienda, quando e in quale revisione. Non mostra il contenuto del documento, e non
          permette di scaricarlo.
        </p>

        <form method="get" className="mt-8 flex flex-wrap items-end gap-3" data-slot="modulo-verifica">
          <div className="min-w-56 flex-1">
            <label htmlFor="codice" className="block text-[13px] font-medium">
              Codice di verifica
            </label>
            <input
              id="codice"
              name="codice"
              defaultValue={grezzo ?? ""}
              placeholder="EV-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-mono text-[15px] uppercase tracking-[0.08em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary px-6 text-[14px] font-medium text-primary-foreground"
          >
            Verifica
          </button>
        </form>

        {frenato !== null && (
          <Riquadro tono="attesa">
            <p className="text-[14px]">
              Troppe verifiche in poco tempo da questo collegamento. Riprova fra {frenato} second
              {frenato === 1 ? "o" : "i"}.
            </p>
          </Riquadro>
        )}

        {frenato === null && grezzo && !canonico && (
          <Riquadro tono="no">
            <p className="text-[14px]">
              <strong>Non è un codice di verifica.</strong> La forma è{" "}
              <span className="font-mono">EV-XXXX-XXXX</span>, otto caratteri dopo il prefisso.
            </p>
            {/* ⚠️ Si dice quali lettere NON esistono, invece di indovinare quale
                intendesse: una lettera indovinata male non produce «non trovato»,
                produce il codice di un ALTRO documento — e la pagina confermerebbe con
                sicurezza il documento sbagliato a chi sta verificando proprio quello. */}
            <p className="mt-2 text-[13px] text-muted-foreground">
              L&apos;alfabeto esclude le lettere e le cifre che si confondono leggendo: non compaiono mai{" "}
              <span className="font-mono">0</span> e <span className="font-mono">O</span>,{" "}
              <span className="font-mono">1</span>, <span className="font-mono">I</span> e{" "}
              <span className="font-mono">L</span>, <span className="font-mono">2</span> e{" "}
              <span className="font-mono">Z</span>, <span className="font-mono">5</span> e{" "}
              <span className="font-mono">S</span>, <span className="font-mono">8</span> e{" "}
              <span className="font-mono">B</span>. Se ne hai digitata una, ricontrolla il documento.
            </p>
          </Riquadro>
        )}

        {frenato === null && canonico && !esito && (
          <Riquadro tono="no">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <ShieldQuestion className="size-5" aria-hidden />
              Nessun documento con questo codice
            </p>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Il codice <span className="font-mono">{canonico}</span> non corrisponde a nessun documento
              emesso. Ricontrolla la trascrizione: se è corretta, il documento non è stato prodotto con
              EvalisDeck, e chi te lo ha consegnato può dirti da dove viene.
            </p>
          </Riquadro>
        )}

        {esito && (
          <Riquadro tono="si">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <CheckCircle2 className="size-5" aria-hidden />
              Documento autentico
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]" data-slot="esito-verifica">
              <Voce k="Documento" v={DOCUMENTI[esito.tipo].nome} />
              <Voce k="Emesso da" v={esito.emittente} />
              <Voce k="Per conto di" v={esito.azienda} />
              {esito.anno !== SENZA_ESERCIZIO && <Voce k="Esercizio" v={String(esito.anno)} />}
              <Voce k="Revisione" v={String(esito.versione)} />
              <Voce k="Data di emissione" v={fmtData(esito.pubblicatoIl.toISOString().slice(0, 10))} />
              {esito.edizione && <Voce k="Edizione dei contenuti" v={esito.edizione} mono />}
              <Voce k="Codice" v={esito.codice} mono />
            </dl>

            {/* ⚠️ È il punto che rende utile la verifica a chi la fa. Un documento resta
                AUTENTICO per sempre — l'emissione è un fatto — ma i contenuti
                metodologici si aggiornano, e un Modello 231 redatto nel 2026 non è
                aggiornato nel 2028. La pagina dice le due cose separatamente, perché
                sono separate: confonderle vorrebbe dire o svalutare un documento
                autentico, o far passare per attuale un documento vecchio. */}
            {superata && (
              <p
                className="mt-5 rounded-lg border px-4 py-3 text-[13px] leading-relaxed"
                style={{ borderColor: "var(--warning)" }}
                data-slot="edizione-superata"
              >
                <strong>Il documento è autentico, ma i contenuti sono di un&apos;edizione precedente.</strong>{" "}
                È stato redatto sull&apos;edizione <span className="font-mono">{esito.edizione}</span>, mentre
                quella corrente è <span className="font-mono">{edizioneCorrente}</span>. Resta valido come atto
                emesso in quella data; se ti serve una fotografia aggiornata, chiedila a chi te lo ha
                consegnato.
              </p>
            )}
            <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">
              Questa pagina conferma <strong>l&apos;emissione</strong>, non il merito: dice che quel documento
              è stato prodotto da quel soggetto per quell&apos;azienda in quella data. Non attesta la
              correttezza dei dati, che resta di chi lo ha redatto, e non è una certificazione.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Il contenuto non è consultabile da qui. Se ti serve il documento, chiedilo a chi te lo ha
              annunciato: è l&apos;unico che può decidere di consegnartelo.
            </p>
          </Riquadro>
        )}

        <div className="mt-14 border-t pt-8">
          <h2 className="font-display text-[19px] font-semibold">Perché esiste questa pagina</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Un bilancio di sostenibilità, una dichiarazione di applicabilità o un attestato di
            autovalutazione arrivano come PDF, e un PDF si modifica. Il codice non lo impedisce: rende il
            documento <strong>attribuibile</strong>. Chi lo riceve può confermare in dieci secondi che quel
            documento è stato emesso da quel soggetto, e chi lo emette sa che il proprio lavoro non si
            confonde con una copia ritoccata.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Produci documenti di questo tipo?{" "}
            <Link href="/#percorsi" className="underline underline-offset-2">
              Guarda come funziona EvalisDeck
            </Link>
            .
          </p>
        </div>
      </main>
      <PiedeMarketing />
    </>
  );
}

function Voce({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-[13px] text-muted-foreground">{k}</dt>
      <dd className={`text-[14px] font-medium ${mono ? "font-mono tracking-[0.06em]" : ""}`}>{v}</dd>
    </>
  );
}

function Riquadro({ tono, children }: { tono: "si" | "no" | "attesa"; children: React.ReactNode }) {
  const bordo =
    tono === "si"
      ? "border-t-2 border-t-[var(--success)]"
      : tono === "no"
        ? "border-t-2 border-t-destructive"
        : "border-t-2 border-t-[var(--warning)]";
  return <div className={`mt-8 rounded-xl border ${bordo} p-6`}>{children}</div>;
}
