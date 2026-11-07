"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Il selettore del laboratorio: tre assi, scritti sulla radice e nell'indirizzo.
//
// Lo stato parte da `null` e si legge dall'indirizzo DOPO l'idratazione: la pagina è
// statica, e leggerlo durante il rendering darebbe un HTML diverso fra server e browser.

const FORME = [
  ["fascicolo", "Fascicolo"],
  ["documento", "Documento"],
] as const;
const TEMI = [
  ["petrolio", "Petrolio protagonista"],
  ["sobria", "Sobria"],
] as const;

type Scelta = { forma: string; titolo: number; tema: string };

export function SelettoreLab({ titoli }: { titoli: string[] }) {
  const [s, setS] = useState<Scelta | null>(null);

  useEffect(() => {
    const radice = document.getElementById("laboratorio");
    const q = new URLSearchParams(location.search);
    const f = q.get("f") ?? radice?.dataset.forma ?? "fascicolo";
    const t = Number(q.get("t") ?? radice?.dataset.titolo ?? 1);
    const c = q.get("c") ?? radice?.dataset.tema ?? "petrolio";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- si legge l'indirizzo una volta, dopo l'idratazione: prima non esiste
    setS({
      forma: FORME.some(([k]) => k === f) ? f : "fascicolo",
      titolo: t >= 1 && t <= titoli.length ? t : 1,
      tema: TEMI.some(([k]) => k === c) ? c : "petrolio",
    });
  }, [titoli.length]);

  useEffect(() => {
    if (!s) return;
    const radice = document.getElementById("laboratorio");
    if (!radice) return;
    radice.dataset.forma = s.forma;
    radice.dataset.titolo = String(s.titolo);
    radice.dataset.tema = s.tema;
    history.replaceState(null, "", `${location.pathname}?f=${s.forma}&t=${s.titolo}&c=${s.tema}`);
  }, [s]);

  if (!s) return null;
  const pulsante = (attivo: boolean) =>
    cn(
      "min-h-10 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-150",
      attivo ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent",
    );

  return (
    <aside
      aria-label="Laboratorio"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-3xl border bg-card px-4 pt-3 shadow-2xl shadow-foreground/20 md:left-auto md:right-4 md:mx-0"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="space-y-2.5">
        <Riga etichetta="Immagine">
          {FORME.map(([k, nome]) => (
            <button key={k} type="button" aria-pressed={s.forma === k} className={pulsante(s.forma === k)} onClick={() => setS({ ...s, forma: k })}>
              {nome}
            </button>
          ))}
        </Riga>
        <Riga etichetta="Titolo">
          {titoli.map((titolo, i) => (
            <button
              key={titolo}
              type="button"
              title={titolo}
              aria-label={`Titolo ${i + 1}: ${titolo}`}
              aria-pressed={s.titolo === i + 1}
              className={cn(pulsante(s.titolo === i + 1), "w-10 px-0 tabular-nums")}
              onClick={() => setS({ ...s, titolo: i + 1 })}
            >
              {i + 1}
            </button>
          ))}
        </Riga>
        <Riga etichetta="Colore">
          {TEMI.map(([k, nome]) => (
            <button key={k} type="button" aria-pressed={s.tema === k} className={pulsante(s.tema === k)} onClick={() => setS({ ...s, tema: k })}>
              {nome}
            </button>
          ))}
        </Riga>
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-muted-foreground">
        Pagina di prova: scegli immagine, titolo e colore, poi mandami il collegamento.
      </p>
    </aside>
  );
}

function Riga({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[12px] font-semibold text-muted-foreground">{etichetta}</span>
      <div role="group" aria-label={etichetta} className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}
