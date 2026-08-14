import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";
import { prendiInCarico, rilascia, segnaCompletato } from "@/features/billing/idempotenza";
import { gestisciEvento } from "@/features/billing/webhook";

// L'orecchio che sente Stripe.
//
// `nodejs` e non edge: la verifica della firma usa la crittografia di Node. E il corpo
// si legge GREZZO, prima di qualunque parsing: la firma è calcolata sui byte esatti, e
// un JSON riserializzato — anche identico nel contenuto — non combacia più.
//
// Risponde SEMPRE 200 tranne quando la firma non torna o quando il lavoro è fallito
// davvero. Un 500 su un evento che non sappiamo gestire fa accumulare tentativi finché
// Stripe disabilita l'endpoint — e con l'endpoint spento si fermano anche gli eventi
// che pagano gli stipendi.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// L'unica rotta che NON puo' permettersi di essere uccisa era anche l'unica senza tetto
// dichiarato: cron e PDF avevano `maxDuration`, il webhook no, e girava al default di
// piattaforma. Una funzione uccisa a meta' lascia il claim preso, Stripe riceve «gia'
// processato» al ritentativo, e il pagamento sparisce in silenzio.
export const maxDuration = 60;

export async function POST(req: Request) {
  const firma = req.headers.get("stripe-signature");
  if (!firma) return NextResponse.json({ errore: "firma assente" }, { status: 400 });
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("[billing] STRIPE_WEBHOOK_SECRET assente: evento rifiutato");
    return NextResponse.json({ errore: "webhook non configurato" }, { status: 500 });
  }

  const grezzo = await req.text();
  let evento;
  try {
    evento = await stripe().webhooks.constructEventAsync(grezzo, firma, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    // Firma non valida: non è Stripe, o è un tentativo. 400 e nient'altro: non si
    // risponde con dettagli a chi bussa senza credenziali.
    console.error("[billing] firma non valida:", e instanceof Error ? e.message : e);
    return NextResponse.json({ errore: "firma non valida" }, { status: 400 });
  }

  // Il claim PRIMA del lavoro: se lo stesso evento arriva due volte in parallelo, il
  // secondo trova la riga già inserita e si ferma qui.
  if (!(await prendiInCarico(evento.id))) {
    return NextResponse.json({ ok: true, nota: "già processato" });
  }

  try {
    const esito = await gestisciEvento(evento);
    // Il claim si chiude SOLO adesso. Finche' resta `in_corso`, un processo morto a
    // meta' viene ripescato al ritentativo di Stripe invece di essere scambiato per
    // lavoro gia' fatto.
    await segnaCompletato(evento.id);
    return NextResponse.json({ ok: true, ...esito });
  } catch (e) {
    // Il claim si RILASCIA: senza, l'evento resterebbe marcato come fatto mentre non
    // è stato fatto niente, Stripe ritenterebbe, noi risponderemmo «già visto», e un
    // cliente che ha pagato resterebbe bloccato senza che nessun errore lo segnali.
    await rilascia(evento.id);
    console.error("[billing] evento", evento.id, evento.type, "fallito:", e);
    // 500 qui è voluto: Stripe deve ritentare, perché questo evento CONTA.
    return NextResponse.json({ errore: "elaborazione fallita" }, { status: 500 });
  }
}
