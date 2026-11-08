"use server";

import { z } from "zod";
import { ForbiddenError, requireStudioAdmin } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import { CHIAVI_PIANO, PERIODI, PIANI, inVendita } from "@/lib/prezzi";
import { stripeConfigurato } from "@/lib/stripe/client";
import { creaSessioneCheckout } from "./checkout";
import { urlPortale } from "./portale";
import type { ActionEsito } from "@/features/esito";
import { bloccoAlCheckout, messaggioBlocco } from "./gia-abbonato";
import { GestioneRifiutata, annullaDisdetta, disdiciAbbonamento, passaAllAnnuale } from "./gestione";

// Il pagamento lo avvia solo chi può impegnare lo studio: `requireStudioAdmin`, non
// `requireConsultant`. Un collaboratore invitato non deve poter sottoscrivere un
// abbonamento annuale a nome altrui.

const schema = z.object({
  piano: z.enum(CHIAVI_PIANO as unknown as [string, ...string[]]),
  // L'annuale è il predefinito: è quello che la pagina propone per primo.
  periodo: z.enum(PERIODI as unknown as [string, ...string[]]).default("anno"),
});

export async function apriCheckoutAction(input: unknown): Promise<ActionEsito<{ url: string }>> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, errore: p.error.issues[0]?.message ?? "Dati non validi" };

  const piano = p.data.piano as keyof typeof PIANI;
  const periodo = p.data.periodo as "anno" | "mese";
  if (PIANI[piano].trattativa) {
    return { ok: false, errore: "Il piano Enterprise si concorda: scrivici e prepariamo l'offerta." };
  }
  // ⚠️ Si valida contro ciò che è IN VENDITA, non contro tutte le chiavi di piano: quelle
  // contengono anche le fasce ritirate, che devono restare riconosciute per chi le ha
  // pagate ma non si devono poter comprare da una richiesta costruita a mano.
  if (!inVendita(piano)) {
    return { ok: false, errore: `La fascia «${PIANI[piano].nome}» non è più in vendita: scegli uno dei piani della pagina.` };
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
      periodo,
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
    // ⚠️ UN DIVIETO NON È UN GUASTO, e dirgli «riprova fra poco» è due volte sbagliato:
    // manda una persona a ripremere un pulsante che non funzionerà mai, e nasconde la sola
    // informazione utile, cioè chi glielo può aprire. Finiva anche nei log come errore del
    // sistema, sporcando il posto dove si cercano i guasti veri.
    if (e instanceof ForbiddenError) {
      return {
        ok: false,
        errore:
          "Le fatture e il metodo di pagamento li vede chi amministra lo studio. Chiedi al titolare, oppure fatti dare il ruolo di amministratore.",
      };
    }
    console.error("[billing] portale non aperto:", e);
    return { ok: false, errore: "Non riesco ad aprire la gestione dell'abbonamento. Riprova fra poco." };
  }
}

/** Il comando sull'abbonamento, con le risposte dette nella lingua del cliente. */
async function comandoAbbonamento<T>(
  fai: (userId: string, orgId: string) => Promise<T>,
): Promise<ActionEsito<T>> {
  if (!stripeConfigurato()) {
    return { ok: false, errore: "La gestione del pagamento non è attiva su questo ambiente." };
  }
  try {
    const s = await requireStudioAdmin();
    return { ok: true, dati: await fai(s.userId, s.orgId) };
  } catch (e) {
    if (e instanceof GestioneRifiutata) return { ok: false, errore: e.message, codice: e.codice };
    if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
    if (e instanceof ForbiddenError) {
      return { ok: false, errore: "L'abbonamento lo gestisce chi amministra l'account. Chiedi al titolare." };
    }
    console.error("[billing] comando sull'abbonamento non riuscito:", e);
    return { ok: false, errore: "Non riesco a modificare l'abbonamento adesso. Riprova fra poco." };
  }
}

/** Disdice alla fine del periodo pagato. */
export async function disdiciAbbonamentoAction(): Promise<ActionEsito<null>> {
  return comandoAbbonamento(async (u, o) => {
    await disdiciAbbonamento(u, o);
    return null;
  });
}

/** Ritira la disdetta. */
export async function annullaDisdettaAction(): Promise<ActionEsito<null>> {
  return comandoAbbonamento(async (u, o) => {
    await annullaDisdetta(u, o);
    return null;
  });
}

/** Dal mensile all'annuale. */
export async function passaAllAnnualeAction(): Promise<ActionEsito<{ addebitato: number | null }>> {
  return comandoAbbonamento((u, o) => passaAllAnnuale(u, o));
}
