"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { normalizzaCodicePartner } from "./codice";
import { attribuisciDaStaff, rimuoviAttribuzione, studioDelTitolare } from "./index";

// Le azioni dello staff sui partner. Guardia e validazione qui, la logica in `index.ts`.
//
// ⚠️ Il divieto vero non è `requirePlatformAdmin`: è la policy della migrazione 0071, che
// lascia cambiare o togliere un'attribuzione solo nel contesto dello staff.

/** Allinea i metadati degli abbonamenti Stripe dello studio, dove il cruscotto li filtra.
 *  Best-effort: la fonte è il nostro database, e un guasto di Stripe non deve annullare
 *  un'attribuzione già scritta. */
async function allineaStripe(orgId: string, codice: string | null): Promise<void> {
  try {
    const { stripeConfigurato, stripe } = await import("@/lib/stripe/client");
    if (!stripeConfigurato()) return;
    const { withTenant } = await import("@/lib/db/tenant");
    const { stripeCustomer } = await import("@/lib/db/schema");
    const [c] = await withTenant({ platformAdmin: true }, (tx) =>
      tx.select({ id: stripeCustomer.stripeCustomerId }).from(stripeCustomer).where(eq(stripeCustomer.organizationId, orgId)).limit(1),
    );
    if (!c) return;
    const subs = await stripe().subscriptions.list({ customer: c.id, status: "all", limit: 10 });
    for (const sub of subs.data) {
      if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
      // Stripe toglie una chiave dei metadati quando le si assegna la stringa vuota.
      await stripe().subscriptions.update(sub.id, { metadata: { partner: codice ?? "" } });
    }
  } catch (e) {
    console.error("[partner] metadati Stripe non allineati per", orgId, e);
  }
}

export async function attribuisciPartnerAction(dati: {
  email: string;
  codice: string;
  nota: string;
}): Promise<ActionEsito<{ studio: string; prima: string | null }>> {
  try {
    const s = await requirePlatformAdmin();
    const v = z
      .object({
        email: z.string().trim().email("Scrivi l'indirizzo email del titolare dello studio"),
        codice: z.string(),
        nota: z.string().trim().max(500, "Nota: al massimo 500 caratteri"),
      })
      .parse(dati);
    const codice = normalizzaCodicePartner(v.codice);
    if (!codice || codice === "non-valido") return { ok: false, errore: "Scegli il partner" };
    const studio = await studioDelTitolare(v.email);
    if (!studio) return { ok: false, errore: `Nessuno studio ha come titolare ${v.email}.` };
    const { prima } = await attribuisciDaStaff(s.userId, studio.orgId, codice, v.nota || null);
    await allineaStripe(studio.orgId, codice);
    revalidatePath("/staff/partner");
    return { ok: true, dati: { studio: studio.studio, prima } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function rimuoviPartnerAction(orgId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requirePlatformAdmin();
    const id = z.string().min(1).max(100).parse(orgId);
    if (!(await rimuoviAttribuzione(s.userId, id))) return { ok: false, errore: "Questo studio non ha un partner." };
    await allineaStripe(id, null);
    revalidatePath("/staff/partner");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
