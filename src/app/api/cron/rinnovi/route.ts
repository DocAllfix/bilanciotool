import { db } from "@/lib/db";
import { orgEntitlement, stripeSubscription } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, isNotNull, notInArray } from "drizzle-orm";
import { euro, importoDelPreavviso, type PianoKey, type RigaPreavviso } from "@/lib/prezzi";
import { stripe, stripeConfigurato } from "@/lib/stripe/client";
import { titolareDelloStudio } from "@/features/billing/provisioning";
import { sendPreavvisoRinnovoEmail } from "@/lib/email";
import { withTenant } from "@/lib/db/tenant";
import { bearerCoincide } from "@/lib/segreti";
import { indirizzoCorrente } from "@/lib/indirizzo";

// Il preavviso di rinnovo, sette giorni prima dell'addebito.
//
// Ricordare a qualcuno che sta per pagare sembra il contrario del proprio interesse.
// È invece ciò che evita la contestazione dell'addebito e il «non me l'aspettavo»: su
// un rinnovo annuale di quattro cifre, quella differenza vale più dell'abbonamento che
// si teme di perdere. E un cliente che disdice avvisato è comunque meglio di uno che
// apre una disputa con la banca.
//
// Gira una volta al giorno e guarda una finestra di UN giorno: chi rinnova esattamente
// fra sette giorni. Una finestra più larga manderebbe lo stesso avviso più volte.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GIORNO = 86_400_000;

/**
 * Le righe dell'abbonamento Stripe dello studio, per sapere QUANTO si addebiterà.
 *
 * ⚠️ Il nostro database non le conserva: sa il piano, non se lo studio è un Fondatore né
 * quanti blocchi ha comprato. La verità su cosa pagherà il cliente sta su Stripe, ed è lì
 * che la chiede anche il webhook quando costruisce lo Schedule.
 *
 * - `null`: nessun abbonamento Stripe (studio attivato a mano, a bonifico);
 * - `"ignoto"`: c'è, ma Stripe non ha risposto — si scrive un importo generico invece di
 *   indovinarne uno.
 */
async function righeDelloStudio(orgId: string): Promise<RigaPreavviso[] | null | "ignoto"> {
  const [sub] = await withTenant({ orgId, platformAdmin: true }, (tx) =>
    tx
      .select({ id: stripeSubscription.stripeSubscriptionId })
      .from(stripeSubscription)
      .where(
        and(
          eq(stripeSubscription.organizationId, orgId),
          notInArray(stripeSubscription.status, ["canceled", "incomplete_expired"]),
        ),
      )
      .orderBy(desc(stripeSubscription.updatedAt))
      .limit(1),
  );
  if (!sub) return null;
  if (!stripeConfigurato()) return "ignoto";
  try {
    const abb = await stripe().subscriptions.retrieve(sub.id, { expand: ["items.data.price"] });
    return abb.items.data.map((r) => ({
      lookup: r.price.lookup_key ?? null,
      importoUnitario: r.price.unit_amount ?? null,
      quantita: r.quantity ?? 1,
      ricorrente: Boolean(r.price.recurring),
    }));
  } catch (e) {
    console.error("[rinnovi] righe dell'abbonamento non lette per", orgId, e);
    return "ignoto";
  }
}

export async function GET(req: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!bearerCoincide(req.headers.get("authorization"), segreto)) {
    return new Response(null, { status: 404 });
  }

  const ora = Date.now();
  const da = new Date(ora + 7 * GIORNO);
  const a = new Date(ora + 8 * GIORNO);

  // `platformAdmin`: questo giro guarda TUTTI gli studi, e non ha una sessione da cui
  // ricavarne uno. E' esattamente il caso per cui la valvola esiste. Senza, con la
  // connessione ristretta la lista tornerebbe vuota e i promemoria di rinnovo
  // smetterebbero di partire **in silenzio** — nessun errore, nessuna email, e ce ne
  // accorgeremmo dai mancati rinnovi.
  const inScadenza = await withTenant({ platformAdmin: true }, (tx) =>
    tx
      .select({
        orgId: orgEntitlement.organizationId,
        piano: orgEntitlement.piano,
        quando: orgEntitlement.currentPeriodEnd,
      })
      .from(orgEntitlement)
      .where(
        and(
          eq(orgEntitlement.status, "active"),
          isNotNull(orgEntitlement.currentPeriodEnd),
          gte(orgEntitlement.currentPeriodEnd, da),
          lte(orgEntitlement.currentPeriodEnd, a),
        ),
      ),
  );

  const esiti: { orgId: string; inviata: boolean; motivo?: string }[] = [];
  for (const riga of inScadenza) {
    const piano = riga.piano as PianoKey | null;
    if (!piano || !riga.quando) {
      esiti.push({ orgId: riga.orgId, inviata: false, motivo: "senza piano" });
      continue;
    }
    const destinatario = await titolareDelloStudio(riga.orgId);
    if (!destinatario) {
      esiti.push({ orgId: riga.orgId, inviata: false, motivo: "nessun titolare" });
      continue;
    }
    // Il rinnovo si paga al prezzo di RINNOVO, che è quello che l'abbonamento ha nella
    // seconda fase: dire l'importo del primo anno sarebbe un preavviso sbagliato, e
    // peggiore del silenzio.
    // ⚠️ E si chiede alle RIGHE dell'abbonamento, non al solo piano: prima un Fondatore
    // leggeva 1.032 € invece di 825,60 €, e chi aveva blocchi il solo piano.
    const righe = await righeDelloStudio(riga.orgId);
    const importo = righe === "ignoto" ? null : importoDelPreavviso(piano, righe);
    const base = indirizzoCorrente();
    try {
      const r = await sendPreavvisoRinnovoEmail(destinatario, {
        importo: importo !== null ? euro(importo) : "l'importo del tuo piano",
        quando: riga.quando.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }),
        url: `${base}/impostazioni/abbonamento`,
      });
      esiti.push({ orgId: riga.orgId, inviata: r.sent });
    } catch (e) {
      console.error("[rinnovi] preavviso non inviato a", riga.orgId, e);
      esiti.push({ orgId: riga.orgId, inviata: false, motivo: "invio fallito" });
    }
  }

  return Response.json({ ok: true, trovati: inScadenza.length, esiti });
}
