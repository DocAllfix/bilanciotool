import { normalizzaArrivo } from "@/lib/calc/arrivi";
import { giornoItaliano } from "@/lib/calc/comune/tempo-italia";
import { frenato } from "@/lib/freno";
import { MASSIMO_ARRIVI_AL_GIORNO, registraArrivo } from "@/features/arrivi";

// La rotta che riceve un arrivo da campagna, mandato dal browser con `sendBeacon`.
//
// ⚠️ Risponde 204 anche quando non conta (tetto raggiunto, database che non risponde): chi
// la chiama è una pagina che se ne sta andando, e un errore non lo leggerebbe nessuno. Il
// guasto vero va nei log. Rifiuta con 400 solo ciò che non è un arrivo.
//
// ⚠️ Nessun indirizzo di rete letto, nemmeno per frenare: il tetto è uno solo, giornaliero,
// per tutti. Un freno per indirizzo vorrebbe dire conservarlo, e la ragione per cui questo
// conteggio non chiede il consenso è proprio che non conserva niente di chi arriva.

const MASSIMO_CORPO = 2000;

export async function POST(req: Request) {
  // Solo dalle nostre pagine: un modulo su un altro sito potrebbe gonfiare i conteggi.
  const sito = req.headers.get("sec-fetch-site");
  if (sito && sito !== "same-origin") return new Response(null, { status: 403 });

  const testo = await req.text();
  if (testo.length > MASSIMO_CORPO) return new Response(null, { status: 413 });
  let corpo: unknown;
  try {
    corpo = JSON.parse(testo);
  } catch {
    return new Response(null, { status: 400 });
  }
  const arrivo = normalizzaArrivo(corpo);
  if (!arrivo) return new Response(null, { status: 400 });

  const giorno = giornoItaliano(new Date());
  try {
    if (!(await frenato(`arrivi:${giorno}`, 86_400_000, MASSIMO_ARRIVI_AL_GIORNO))) {
      await registraArrivo(giorno, arrivo);
    }
  } catch (e) {
    console.error("[arrivi] conteggio non registrato:", e instanceof Error ? e.message : e);
  }
  return new Response(null, { status: 204 });
}
