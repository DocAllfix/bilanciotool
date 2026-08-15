"use server";

import { z } from "zod";
import { requireStudioAdmin } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import { CHIAVI_PIANO, PIANI, ESTENSIONI, MAX_BLOCCHI_AZIENDE, MAX_ACCESSI_EXTRA } from "@/lib/prezzi";
import { stripeConfigurato } from "@/lib/stripe/client";
import { creaSessioneCheckout } from "./checkout";
import { urlPortale } from "./portale";
import type { ActionEsito } from "@/features/esito";
import { bloccoAlCheckout, messaggioBlocco } from "./gia-abbonato";

// Il pagamento lo avvia solo chi può impegnare lo studio: `requireStudioAdmin`, non
// `requireConsultant`. Un collaboratore invitato non deve poter sottoscrivere un
// abbonamento annuale a nome altrui.

const schema = z.object({
  piano: z.enum(CHIAVI_PIANO as unknown as [string, ...string[]]),
  // I tetti sono gli STESSI del dialogo d'acquisto, e la fonte e' una: il server
  // accettava 500 aziende e 200 accessi mentre il client si fermava a 10 blocchi e 20
  // accessi. Due verita' sullo stesso limite, e quella che decide non era quella scritta.
  aziendeExtra: z.coerce.number().int().min(0).max(MAX_BLOCCHI_AZIENDE * ESTENSIONI.bloccoAziende.aziende).optional(),
  accessiExtra: z.coerce.number().int().min(0).max(MAX_ACCESSI_EXTRA).optional(),
  // `z.boolean()` e NON `z.coerce.boolean()`: con `coerce`, la stringa "false" diventa
  // `true` e aggiunge una riga a pagamento. Dal dialogo arriva un booleano vero, ma un
  // client diverso — o un modulo codificato — no.
  whiteLabel: z.boolean().optional(),
});

export async function apriCheckoutAction(input: unknown): Promise<ActionEsito<{ url: string }>> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, errore: p.error.issues[0]?.message ?? "Dati non validi" };

  const piano = p.data.piano as keyof typeof PIANI;
  if (PIANI[piano].trattativa) {
    return { ok: false, errore: "Il piano Enterprise si concorda: scrivici e prepariamo l'offerta." };
  }
  if (!stripeConfigurato()) {
    return { ok: false, errore: "Il pagamento non è ancora attivo su questo ambiente." };
  }

  try {
    const s = await requireStudioAdmin();

    // ⚠️ Il controllo che manca costa denaro vero: senza, «Passa a questo» apriva un
    // SECONDO abbonamento parallelo, che continuava a fatturare e che il cliente non
    // poteva disdire (il portale ha la disdetta spenta). Sta qui e non solo
    // nell'interfaccia perche' una server action e' un endpoint HTTP.
    const blocco = await bloccoAlCheckout(s.userId, s.orgId);
    if (blocco) return { ok: false, errore: messaggioBlocco(blocco), codice: blocco };

    const { url } = await creaSessioneCheckout({
      userId: s.userId,
      orgId: s.orgId,
      email: s.email,
      piano,
      aziendeExtra: p.data.aziendeExtra,
      accessiExtra: p.data.accessiExtra,
      whiteLabel: p.data.whiteLabel,
    });
    return { ok: true, dati: { url } };
  } catch (e) {
    if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
    // L'errore vero resta nei log: al cliente non serve sapere quale chiave manca.
    console.error("[billing] checkout non aperto:", e);
    return {
      ok: false,
      errore: e instanceof Error && e.message.includes("Enterprise") ? e.message : "Pagamento non disponibile in questo momento. Riprova fra poco.",
    };
  }
}

/**
 * Apre il portale clienti di Stripe: fatture, ricevute, metodo di pagamento.
 *
 * Anche qui `requireStudioAdmin`: la cronologia dei pagamenti dello studio e la carta
 * con cui si paga non sono cose da collaboratore invitato.
 */
export async function apriPortaleAction(): Promise<ActionEsito<{ url: string }>> {
  if (!stripeConfigurato()) {
    return { ok: false, errore: "La gestione del pagamento non è attiva su questo ambiente." };
  }
  try {
    const s = await requireStudioAdmin();
    const url = await urlPortale(s.orgId);
    if (!url) {
      // Studio attivato a mano, senza mai passare da Stripe: non c'è niente da mostrare
      // e mandarlo su una pagina che non lo conosce sarebbe un vicolo cieco.
      return { ok: false, errore: "Non risultano pagamenti con carta su questo studio. Scrivici e ti mandiamo le fatture." };
    }
    return { ok: true, dati: { url } };
  } catch (e) {
    if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
    console.error("[billing] portale non aperto:", e);
    return { ok: false, errore: "Non riesco ad aprire la gestione dell'abbonamento. Riprova fra poco." };
  }
}
