import { db } from "@/lib/db";
import { orgEntitlement, stripeSubscription } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { euro, type PianoKey } from "@/lib/prezzi";
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
 * Quanto addebiterà Stripe al prossimo rinnovo, IVA esclusa, in centesimi.
 *
 * ⚠️ SI CHIEDE A STRIPE, non al listino. Dal 6 novembre 2026 il listino è cambiato, e un
 * abbonamento venduto prima rinnova alle SUE condizioni: lo Schedule a due fasi, il prezzo
 * Fondatore, i blocchi comprati. Il listino corrente direbbe a quel cliente un importo che
 * non pagherà. L'anteprima della prossima fattura è l'unico numero che Stripe addebiterà
 * davvero, e la calcola Stripe con le stesse regole con cui la emetterà.
 *
 * - `null`: nessun abbonamento Stripe (attivazione a mano, a bonifico), o Stripe non ha
 *   risposto: si scrive un importo generico invece di indovinarne uno.
 */
async function importoDelProssimoRinnovo(orgId: string): Promise<number | null> {
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
  if (!sub || !stripeConfigurato()) return null;
  try {
    const anteprima = await stripe().invoices.createPreview({ subscription: sub.id });
    return anteprima.total_excluding_tax ?? anteprima.subtotal ?? null;
  } catch (e) {
    console.error("[rinnovi] anteprima del rinnovo non letta per", orgId, e);
    return null;
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
          // ⚠️ Solo chi rinnova un ANNO. Il mensile riceve la ricevuta di Stripe a ogni
          // addebito: un preavviso al mese sarebbe rumore, e il rumore si smette di leggere.
          // `null` sono gli abbonamenti precedenti al 6 novembre 2026 e le attivazioni a
          // mano: tutti annuali.
          or(eq(orgEntitlement.periodo, "anno"), isNull(orgEntitlement.periodo)),
          // Chi ha disdetto non rinnova: avvisarlo di un addebito che non ci sarà è falso.
          eq(orgEntitlement.disdettaAFinePeriodo, false),
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
    const importo = await importoDelProssimoRinnovo(riga.orgId);
    const base = indirizzoCorrente();
    try {
      const r = await sendPreavvisoRinnovoEmail(destinatario, {
        // «IVA esclusa» e non «+ IVA»: dal 5 ottobre 2026 Stripe Tax aggiunge l'IVA che è
        // dovuta, cioè il 22% a chi è in Italia e niente a un'azienda UE con partita IVA
        // (inversione contabile) o a un cliente extra UE. L'imponibile è l'unico numero
        // vero per tutti.
        importo: importo !== null ? `${euro(importo)} (IVA esclusa)` : "l'importo del tuo piano",
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
