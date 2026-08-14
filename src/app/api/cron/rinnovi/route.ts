import { db } from "@/lib/db";
import { orgEntitlement } from "@/lib/db/schema";
import { and, eq, gte, lte, isNotNull } from "drizzle-orm";
import { PIANI, prezzoDiVendita, euro, type PianoKey } from "@/lib/prezzi";
import { titolareDelloStudio } from "@/features/billing/provisioning";
import { sendPreavvisoRinnovoEmail } from "@/lib/email";
import { withTenant } from "@/lib/db/tenant";
import { bearerCoincide } from "@/lib/segreti";

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
    const prezzo = prezzoDiVendita(PIANI[piano], "rinnovo");
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    try {
      const r = await sendPreavvisoRinnovoEmail(destinatario, {
        importo: prezzo ? euro(prezzo.importo) : "l'importo del tuo piano",
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
