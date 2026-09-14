/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { Monogramma } from "@/components/brand/logo";
import type { VoceSlide } from "@/features/formazione/slide-distillate";

// I DODICI LAYOUT DELLE SLIDE, nello stile di Evalis Academy col marchio di EvalisDeck.
//
// ⚠️ Decisioni del committente (14 settembre 2026): la varietà di Academy, costruita sul
// materiale e sulla voce dei nostri corsi; marchio EvalisDeck completo — il monogramma in
// uso e la parola «Evalis Deck» come testo, Bricolage Grotesque per i titoli e Geist Mono
// per i dettagli, i colori del prodotto.
//
// ⚠️ LA TELA HA COLORI PROPRI, e non segue l'interruttore del tema (scelta dichiarata, E1).
// Una presentazione che cambia colore perché qualcuno ha toccato l'interruttore dell'app
// non è più una presentazione: l'alternanza fra fondi chiari e scuri è ciò che dà il ritmo,
// e se il tema scuro rendesse scure anche le slide chiare il ritmo sparirebbe.
//
// ⚠️ I colori stanno in variabili CSS dichiarate UNA volta qui, non in classi costruite a
// stringa: Tailwind genera le utility leggendo il testo, e `bg-${x}` non esiste da nessuna
// parte. È il difetto che lasciò senza fondo quattro aree su cinque.
//
// La tela è 1280 × 720, come le slide di Academy: le misure sono in pixel perché a
// ingrandirla o rimpicciolirla ci pensa `TelaScalata`, identica a sé stessa.

export const TELA_L = 1280;
export const TELA_A = 720;

/** La palette della tela: petrolio EvalisDeck su fondo avorio freddo, e il suo rovescio. */
export const PALETTE: CSSProperties = {
  ["--s-chiaro" as string]: "oklch(0.975 0.006 190)",
  ["--s-scuro" as string]: "oklch(0.235 0.025 205)",
  ["--s-inchiostro" as string]: "oklch(0.25 0.03 205)",
  ["--s-corpo" as string]: "oklch(0.38 0.025 205)",
  ["--s-tenue" as string]: "oklch(0.55 0.02 205)",
  ["--s-carta" as string]: "oklch(0.995 0.003 190)",
  ["--s-linea" as string]: "oklch(0.9 0.012 195)",
  ["--s-accento" as string]: "oklch(0.47 0.075 185)",
  ["--s-accento-scuro" as string]: "oklch(0.78 0.1 178)",
  ["--s-su-scuro" as string]: "oklch(0.88 0.02 195)",
  ["--s-su-scuro-tenue" as string]: "oklch(0.68 0.025 200)",
  ["--s-titolo-su-scuro" as string]: "oklch(0.96 0.01 190)",
  ["--s-linea-su-scuro" as string]: "oklch(0.9 0.02 195 / 0.16)",
};

/** Quali layout vivono su fondo scuro. Il resto è chiaro: è l'alternanza di Academy. */
export function suScuro(v: VoceSlide): boolean {
  if (v.layout === "evidenza") return v.dark !== false;
  return v.layout === "apertura" || v.layout === "definizione";
}

type Punto = { h?: string; d?: string } | string;
const testoPunto = (p: Punto) => (typeof p === "string" ? { h: undefined, d: p } : p);
const due = (n: number) => String(n).padStart(2, "0");

function Num({ n, scuro }: { n: string; scuro: boolean }) {
  return (
    <span
      className="min-w-[26px] font-mono text-[12px]"
      style={{ color: scuro ? "var(--s-accento-scuro)" : "var(--s-accento)" }}
    >
      {n}
    </span>
  );
}

function RigaPunto({ n, p, scuro }: { n: string; p: Punto; scuro: boolean }) {
  const { h, d } = testoPunto(p);
  return (
    <div
      className="flex items-baseline gap-5 border-t py-[11px]"
      style={{ borderColor: scuro ? "var(--s-linea-su-scuro)" : "var(--s-linea)" }}
    >
      <Num n={n} scuro={scuro} />
      <span className="text-[17px] leading-[1.4]" style={{ color: scuro ? "var(--s-su-scuro)" : "var(--s-corpo)" }}>
        {h && (
          <b className="font-semibold" style={{ color: scuro ? "var(--s-titolo-su-scuro)" : "var(--s-inchiostro)" }}>
            {h}
            {d ? " · " : ""}
          </b>
        )}
        {d}
      </span>
    </div>
  );
}

function Titolo({ children, scuro, grande = false }: { children: ReactNode; scuro: boolean; grande?: boolean }) {
  return (
    <h2
      className={`font-display font-semibold leading-[1.06] tracking-[-0.015em] ${grande ? "text-[64px]" : "text-[40px]"}`}
      style={{ color: scuro ? "var(--s-titolo-su-scuro)" : "var(--s-inchiostro)" }}
    >
      {children}
    </h2>
  );
}

function Intro({ testo, scuro }: { testo?: unknown; scuro: boolean }) {
  if (typeof testo !== "string" || !testo) return null;
  return (
    <p className="mt-4 max-w-[82ch] text-[18px] leading-[1.5]" style={{ color: scuro ? "var(--s-su-scuro-tenue)" : "var(--s-tenue)" }}>
      {testo}
    </p>
  );
}

/** Il corpo di ciascun layout. Header e footer li mette `SlideDistillata`. */
function Corpo({ v, scuro }: { v: VoceSlide; scuro: boolean }) {
  const titolo = String(v.titolo ?? "");
  switch (v.layout) {
    case "apertura": {
      const agenda = (v.agenda as string[] | undefined) ?? [];
      return (
        <>
          {typeof v.eyebrow === "string" && (
            <p className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--s-su-scuro-tenue)" }}>
              {v.eyebrow}
            </p>
          )}
          <h2
            className="font-display text-[64px] font-semibold leading-[0.98] tracking-[-0.02em]"
            style={{ color: "var(--s-accento-scuro)" }}
          >
            {titolo}
          </h2>
          {typeof v.sottotitolo === "string" && (
            <p className="font-display mt-2.5 text-[34px] font-semibold" style={{ color: "var(--s-titolo-su-scuro)" }}>
              {v.sottotitolo}
            </p>
          )}
          <Intro testo={v.testo} scuro />
          {agenda.length > 0 && (
            <div className="mt-[26px] grid grid-cols-2 gap-x-14">
              {agenda.map((a, i) => (
                <RigaPunto key={i} n={due(i + 1)} p={a} scuro />
              ))}
            </div>
          )}
        </>
      );
    }

    case "chiusura":
    case "punti":
    case "split": {
      const punti = (v.punti as Punto[] | undefined) ?? [];
      const segno = (i: number) => (v.numerati === false ? "·" : due(i + 1));
      if (v.layout === "split") {
        return (
          <div className="grid grid-cols-[2fr_3fr] items-start gap-14">
            <div>
              <Titolo scuro={false}>{titolo}</Titolo>
              <Intro testo={v.lead} scuro={false} />
            </div>
            <div>
              {punti.map((p, i) => (
                <RigaPunto key={i} n={segno(i)} p={p} scuro={false} />
              ))}
            </div>
          </div>
        );
      }
      const colonne = (v.colonne as number | undefined) ?? (punti.length > 4 ? 2 : 1);
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <Intro testo={v.intro ?? v.testo} scuro={false} />
          <div className={`mt-6 ${colonne === 2 ? "grid grid-cols-2 gap-x-14" : ""}`}>
            {punti.map((p, i) => (
              <RigaPunto key={i} n={segno(i)} p={p} scuro={false} />
            ))}
          </div>
          {v.layout === "chiusura" && v.prossimo && typeof v.prossimo === "object" && (
            <div className="mt-[26px] flex items-center gap-[26px] rounded-[14px] px-7 py-[22px]" style={{ background: "var(--s-scuro)" }}>
              <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--s-accento-scuro)" }}>
                Prossimo →
              </span>
              <div>
                <p className="font-display text-[20px] font-bold" style={{ color: "var(--s-titolo-su-scuro)" }}>
                  {String((v.prossimo as { titolo?: string }).titolo ?? "")}
                </p>
                {(v.prossimo as { testo?: string }).testo && (
                  <p className="mt-1 text-[14px]" style={{ color: "var(--s-su-scuro-tenue)" }}>
                    {(v.prossimo as { testo?: string }).testo}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      );
    }

    case "cards": {
      const cards = (v.cards as { h: string; d?: string }[] | undefined) ?? [];
      const cols = cards.length <= 3 ? cards.length : 3;
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <div
            className={`mt-[26px] grid gap-4 ${cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {cards.map((c, i) => (
              <div key={i} className="rounded-xl border p-[26px]" style={{ background: "var(--s-carta)", borderColor: "var(--s-linea)" }}>
                <p className="mb-3.5 font-mono text-[13px]" style={{ color: "var(--s-accento)" }}>
                  {due(i + 1)}
                </p>
                <p className="font-display mb-2 text-[20px] font-semibold leading-[1.2]" style={{ color: "var(--s-inchiostro)" }}>
                  {c.h}
                </p>
                {c.d && (
                  <p className="text-[15px] leading-[1.5]" style={{ color: "var(--s-tenue)" }}>
                    {c.d}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    case "definizione": {
      const punti = (v.punti as Punto[] | undefined) ?? [];
      return (
        <>
          {typeof v.eyebrow === "string" && (
            <p className="mb-3.5 font-mono text-[13px] uppercase tracking-[0.2em]" style={{ color: "var(--s-accento-scuro)" }}>
              {v.eyebrow}
            </p>
          )}
          <h2 className="font-display mb-[22px] text-[52px] font-bold leading-none tracking-[-0.02em]" style={{ color: "var(--s-titolo-su-scuro)" }}>
            {titolo}
          </h2>
          {/* ⚠️ Non una striscia laterale colorata: il divieto di DESIGN.md vale anche qui.
              La definizione si stacca per misura e peso, e per un filo che la PRECEDE. */}
          <div className="mb-2 h-px w-16" style={{ background: "var(--s-accento-scuro)" }} aria-hidden />
          <p className="mt-4 max-w-[70ch] text-[23px] font-medium leading-[1.4]" style={{ color: "var(--s-titolo-su-scuro)" }}>
            {String(v.definizione ?? "")}
          </p>
          {punti.length > 0 && (
            <div className="mt-[30px]">
              {punti.map((p, i) => (
                <RigaPunto key={i} n={due(i + 1)} p={p} scuro />
              ))}
            </div>
          )}
        </>
      );
    }

    case "flusso": {
      const passi = (v.passi as { h: string; d?: string }[] | undefined) ?? [];
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <Intro testo={v.intro} scuro={false} />
          <div className="mt-7 flex items-stretch gap-2">
            {passi.map((p, i) => (
              <div key={i} className="contents">
                <div className="flex-1 rounded-xl border p-[22px]" style={{ background: "var(--s-carta)", borderColor: "var(--s-linea)" }}>
                  <p className="mb-3 font-mono text-[13px]" style={{ color: "var(--s-accento)" }}>
                    {due(i + 1)}
                  </p>
                  <p className="font-display mb-1.5 text-[19px] font-semibold leading-[1.2]" style={{ color: "var(--s-inchiostro)" }}>
                    {p.h}
                  </p>
                  {p.d && (
                    <p className="text-[14px] leading-[1.5]" style={{ color: "var(--s-tenue)" }}>
                      {p.d}
                    </p>
                  )}
                </div>
                {i < passi.length - 1 && (
                  <span className="self-center text-[22px]" style={{ color: "var(--s-accento)" }} aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    case "confronto": {
      const colonna = (c: { h?: string; sub?: string; punti?: Punto[] } | undefined) => (
        <div>
          <p className="font-display mb-1.5 text-[24px] font-semibold" style={{ color: "var(--s-inchiostro)" }}>
            {c?.h}
          </p>
          {c?.sub && (
            <p className="mb-2.5 font-mono text-[14px] uppercase tracking-[0.12em]" style={{ color: "var(--s-accento)" }}>
              {c.sub}
            </p>
          )}
          {(c?.punti ?? []).map((p, i) => (
            <div key={i} className="flex items-baseline gap-3.5 border-t py-2.5" style={{ borderColor: "var(--s-linea)" }}>
              <span className="text-[13px]" style={{ color: "var(--s-accento)" }} aria-hidden>
                ◆
              </span>
              <span className="text-[16px] leading-[1.45]" style={{ color: "var(--s-corpo)" }}>
                {testoPunto(p).d ?? testoPunto(p).h}
              </span>
            </div>
          ))}
        </div>
      );
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <Intro testo={v.intro} scuro={false} />
          <div className="mt-7 grid grid-cols-2 gap-14">
            {colonna(v.a as never)}
            {colonna(v.b as never)}
          </div>
        </>
      );
    }

    case "evidenza":
      return (
        <>
          {typeof v.eyebrow === "string" && (
            <p
              className="mb-5 font-mono text-[13px] uppercase tracking-[0.2em]"
              style={{ color: scuro ? "var(--s-accento-scuro)" : "var(--s-accento)" }}
            >
              {v.eyebrow}
            </p>
          )}
          <p
            className="font-display max-w-[26ch] text-[46px] font-semibold leading-[1.18] tracking-[-0.015em]"
            style={{ color: scuro ? "var(--s-titolo-su-scuro)" : "var(--s-inchiostro)" }}
          >
            {titolo}
          </p>
          <Intro testo={v.testo} scuro={scuro} />
        </>
      );

    case "numeri": {
      const numeri = (v.numeri as { n: string; h: string; d?: string }[] | undefined) ?? [];
      // ⚠️ Il valore NON va a capo, e la misura si sceglie sul più LUNGO della slide. A 70 px
      // fisso, «250 addetti» su tre colonne andava su due righe e staccava la sua etichetta
      // dalle altre due: l'ha visto la foto, non il controllo sui tagli — non sforava, si
      // spezzava. Una misura per slide e non per valore, perché numeri di altezze diverse
      // sulla stessa riga si leggono come importanze diverse.
      const piuLungo = Math.max(...numeri.map((x) => x.n.length), 0) * Math.max(numeri.length, 1);
      const misura = piuLungo <= 12 ? "text-[70px]" : piuLungo <= 24 ? "text-[56px]" : piuLungo <= 36 ? "text-[44px]" : "text-[36px]";
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <Intro testo={v.intro} scuro={false} />
          <div className="mt-[34px] flex gap-12">
            {numeri.map((x, i) => (
              <div key={i} className="flex-1">
                <p className={`font-display ${misura} whitespace-nowrap font-bold leading-none tracking-[-0.02em] tabular-nums`} style={{ color: "var(--s-accento)" }}>
                  {x.n}
                </p>
                <p className="font-display mt-2 text-[20px] font-semibold leading-[1.2]" style={{ color: "var(--s-inchiostro)" }}>
                  {x.h}
                </p>
                {x.d && (
                  <p className="mt-1.5 text-[14px] leading-[1.5]" style={{ color: "var(--s-tenue)" }}>
                    {x.d}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    case "timeline": {
      const tappe = (v.tappe as { t: string; h: string; d?: string }[] | undefined) ?? [];
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <Intro testo={v.intro} scuro={false} />
          <div className="mt-[30px] flex">
            {tappe.map((t, i) => (
              <div key={i} className={`flex-1 ${i < tappe.length - 1 ? "pr-5" : ""}`}>
                <p className="font-display text-[26px] font-bold tracking-[-0.01em]" style={{ color: "var(--s-accento)" }}>
                  {t.t}
                </p>
                <div className="my-2.5 flex h-3.5 items-center">
                  <span className="size-[11px] shrink-0 rounded-full" style={{ background: "var(--s-accento)" }} />
                  <span className="h-0.5 flex-1" style={{ background: i < tappe.length - 1 ? "var(--s-linea)" : "transparent" }} />
                </div>
                <p className="font-display mb-1.5 text-[17px] font-semibold leading-[1.2]" style={{ color: "var(--s-inchiostro)" }}>
                  {t.h}
                </p>
                {t.d && (
                  <p className="text-[14px] leading-[1.5]" style={{ color: "var(--s-tenue)" }}>
                    {t.d}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    case "tabella": {
      const cols = (v.cols as string[] | undefined) ?? [];
      const righe = (v.righe as string[][] | undefined) ?? [];
      return (
        <>
          <Titolo scuro={false}>{titolo}</Titolo>
          <table className="mt-[26px] w-full border-collapse">
            <thead>
              <tr>
                {cols.map((c, i) => (
                  <th
                    key={i}
                    className="border-b-2 px-[18px] pb-3 text-left font-mono text-[11px] font-normal uppercase tracking-[0.14em]"
                    style={{ color: "var(--s-accento)", borderColor: "var(--s-linea)" }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r, i) => (
                <tr key={i}>
                  {r.map((cella, ci) => (
                    <td
                      key={ci}
                      className={`border-b px-[18px] py-[13px] align-top leading-[1.4] ${ci === 0 ? "text-[16px] font-semibold" : "text-[15px]"}`}
                      style={{ borderColor: "var(--s-linea)", color: ci === 0 ? "var(--s-inchiostro)" : "var(--s-corpo)" }}
                    >
                      {cella}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }
  }
}

/**
 * Una slide distillata sulla tela 1280 × 720: intestazione, corpo, piede col marchio.
 *
 * ⚠️ `data-tela` porta `overflow: hidden` ed è ciò che il controllo sui tagli misura: un
 * corpo più alto della tela si TAGLIA invece di scorrere, e il collaudo lo confronta con
 * l'altezza disponibile. Una slide che scorre dentro una presentazione non è una slide.
 */
export function SlideDistillata({
  voce,
  corso,
  norma,
  sezione,
}: {
  /** Già coi numeri sostituiti. */
  voce: VoceSlide;
  corso: string;
  norma: string;
  sezione: string;
}) {
  const scuro = suScuro(voce);
  const colore = scuro ? "var(--s-su-scuro-tenue)" : "var(--s-tenue)";
  return (
    <section
      data-tela
      data-layout={voce.layout}
      data-scuro={scuro ? "" : undefined}
      className="flex flex-col overflow-hidden px-20 py-[58px] font-sans"
      style={{ ...PALETTE, width: TELA_L, height: TELA_A, background: scuro ? "var(--s-scuro)" : "var(--s-chiaro)" }}
    >
      <header className="flex items-start justify-between gap-8">
        <span
          className="truncate font-mono text-[11px] uppercase tracking-[0.24em]"
          style={{ color: scuro ? "var(--s-accento-scuro)" : "var(--s-accento)" }}
        >
          {corso}
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: colore }}>
          {norma}
        </span>
      </header>

      <div data-corpo className="flex min-h-0 flex-1 flex-col justify-center py-10">
        <Corpo v={voce} scuro={scuro} />
      </div>

      <footer
        className="flex items-center justify-between border-t pt-[22px]"
        style={{ borderColor: scuro ? "var(--s-linea-su-scuro)" : "var(--s-linea)" }}
      >
        {/* Il marchio in uso: il monogramma in oro (regge su entrambi i fondi) e il nome
            come TESTO, come in `components/brand/logo.tsx`. */}
        <span className="inline-flex items-center gap-2.5" role="img" aria-label="Evalis Deck">
          <Monogramma suScuro={scuro} className="h-7 w-auto" />
          <span
            className="font-display text-[16px] font-semibold leading-none tracking-[-0.01em]"
            style={{ color: scuro ? "var(--s-accento-scuro)" : "var(--s-accento)" }}
          >
            Evalis Deck
          </span>
        </span>
        <span className="max-w-[60%] truncate font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: colore }}>
          {sezione}
        </span>
      </footer>
    </section>
  );
}
