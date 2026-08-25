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

  // ⚠️ PRIMA OGNI GRUPPO, POI SI RIEMPIE FINO AL TETTO.
  //
  // I moduli sono undici: un giro che li attraversasse tutti sarebbe di dodici tappe, e
  // chi si è appena registrato lo chiuderebbe a metà — e chi chiude un tour dice «basta
  // spiegazioni», non «basta prodotto». Serve quindi un tetto, ed è TETTO.
  //
  // La regola era «una tappa per area», e con cinque aree dava sei tappe. Passando ai
  // tre gruppi del committente quella stessa regola ne avrebbe date **quattro**, in
  // silenzio: un giro più corto di un terzo, deciso da nessuno, come effetto collaterale
  // di una riorganizzazione della navigazione. Il tetto non deve dipendere da quanti
  // gruppi ci sono: quello è un numero che cambia per ragioni sue.
  //
  // Quindi due passate. La prima prende un modulo per gruppo, e garantisce che chi
  // guarda impari la cosa che serve davvero — **quali sono i gruppi** — invece di quante
  // sono le pagine. La seconda riempie fino a `TETTO` con quello che resta, in ordine di
  // registro. Gli altri si trovano dal fascicolo, che è dove un consulente li cerca.
  const TETTO = 6;
  const scelti = new Set<string>();

  /** La tappa di un modulo, o `null` se non è visitabile. */
  const tappaDi = (m: (typeof MODULI_AZIENDA)[number]): Tappa | null => {
    const stato = demo?.moduli.find((x) => x.modulo === m.href);
    // Un modulo mai avviato non si visita: mostrerebbe la pagina di creazione, non il
    // modulo. La presentazione fa vedere il prodotto pieno, non i suoi vuoti.
    if (!stato || stato.stato === "non-avviato") return null;
    if (m.perEsercizio) {
      if (stato.anno === null) return null;
      return { path: `/aziende/${demo!.id}/${m.href}/${stato.anno}`, pageId: m.href };
    }
    return { path: `/aziende/${demo!.id}/${m.href}`, pageId: m.href };
  };

  if (demo) {
    const gruppiVisti = new Set<string>();
    for (const m of MODULI_AZIENDA) {
      if (gruppiVisti.has(m.area) || tappe.length >= TETTO) continue;
      const t = tappaDi(m);
      if (!t) continue;
      tappe.push(t);
      scelti.add(m.href);
      gruppiVisti.add(m.area);
    }
    for (const m of MODULI_AZIENDA) {
      if (tappe.length >= TETTO) break;
      if (scelti.has(m.href)) continue;
      const t = tappaDi(m);
      if (t) {
        tappe.push(t);
        scelti.add(m.href);
      }
    }
  }

  return NextResponse.json({ tappe });
}
