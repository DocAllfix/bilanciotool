import { and, count, eq } from "drizzle-orm";
import { orgEntitlement } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { FASCIA_INTRODUZIONE, POSTI_INTRODUZIONE } from "@/lib/prezzi";

// Quanti posti restano al prezzo d'introduzione.
//
// ⚠️ IL NUMERO È VERO, ed è l'unica ragione per cui la vetrina può dirlo. Si contano le
// attivazioni della fascia d'ingresso: quando arrivano al tetto, il richiamo smette da solo
// di promettere quel prezzo. Un contatore scritto a mano sarebbe una scarsità inventata —
// vietata, e su un prodotto che vende conformità anche stupida.
//
// ⚠️ `platformAdmin`: questa lettura non ha una sessione da cui ricavare l'organizzazione, e
// `org_entitlement` è una tabella tenant con la sua policy. In produzione la connessione è
// `app_rls`: senza la valvola la `count` tornerebbe ZERO — cioè «tutti i posti liberi», per
// sempre, e nessun errore da nessuna parte. È lo stesso caso del cron dei rinnovi.
//
// Non esce niente di nessuno: un intero, e il tetto che è già scritto nel listino.

export const revalidate = 60;

export async function GET() {
  try {
    const [r] = await withTenant({ platformAdmin: true }, (tx) =>
      tx
        .select({ n: count() })
        .from(orgEntitlement)
        .where(and(eq(orgEntitlement.piano, FASCIA_INTRODUZIONE), eq(orgEntitlement.status, "active"))),
    );

    const usati = r?.n ?? 0;
    return Response.json(
      { tetto: POSTI_INTRODUZIONE, rimasti: Math.max(0, POSTI_INTRODUZIONE - usati) },
      { headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
    );
  } catch (e) {
    // Il database non risponde: il richiamo deve comparire lo stesso, solo senza la riga sui
    // posti. Meglio un banner senza scarsità che una pagina pubblica rotta — e mai un numero
    // inventato come ripiego.
    console.error("[vetrina] conteggio dei posti non riuscito:", e);
    return Response.json({ tetto: POSTI_INTRODUZIONE, rimasti: null }, { status: 200 });
  }
}
