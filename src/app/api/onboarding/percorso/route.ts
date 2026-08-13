import { NextResponse } from "next/server";
import { requireActiveOrg } from "@/features/auth/guards";
import { getStatiPortafoglio } from "@/features/companies/stati-moduli";
import { MODULI_AZIENDA } from "@/features/companies/moduli";

export const dynamic = "force-dynamic";

// L'itinerario della presentazione: quali pagine visitare, in quale ordine.
//
// Lo calcola il server perché dipende dai dati: quale azienda è quella dimostrativa e
// quale esercizio ha ciascun modulo. Scritto nel client sarebbe una lista di indirizzi
// indovinati, e la prima tappa su un esercizio inesistente porterebbe il nuovo cliente
// su una pagina vuota — dopo un video che gli ha appena promesso il contrario.
//
// Si chiede una volta sola, quando la sequenza parte davvero: non è un costo che paga
// ogni pagina dell'applicazione.

export type Tappa = { path: string; pageId: string };

export async function GET() {
  let s;
  try {
    s = await requireActiveOrg();
  } catch {
    return new NextResponse(null, { status: 401 });
  }

  const { aziende } = await getStatiPortafoglio(s.userId, s.orgId);
  // L'azienda dimostrativa è quella già compilata: è lì che il giro ha qualcosa da
  // mostrare. Se manca (studio che ha già cancellato la demo) resta la sola dashboard.
  const demo = aziende.find((a) => a.isDemo) ?? aziende[0];
  const tappe: Tappa[] = [{ path: "/dashboard", pageId: "portfolio" }];

  if (demo) {
    for (const m of MODULI_AZIENDA) {
      const stato = demo.moduli.find((x) => x.modulo === m.href);
      // Un modulo mai avviato non si visita: mostrerebbe la pagina di creazione, non
      // il modulo. La presentazione fa vedere il prodotto pieno, non i suoi vuoti.
      if (!stato || stato.stato === "non-avviato") continue;
      if (m.perEsercizio) {
        if (stato.anno === null) continue;
        tappe.push({ path: `/aziende/${demo.id}/${m.href}/${stato.anno}`, pageId: m.href });
      } else {
        tappe.push({ path: `/aziende/${demo.id}/${m.href}`, pageId: m.href });
      }
    }
  }

  return NextResponse.json({ tappe });
}
