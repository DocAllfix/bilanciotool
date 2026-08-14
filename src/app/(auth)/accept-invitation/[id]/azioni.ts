"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { EntitlementError } from "@/features/entitlement";
import { leggiInvito } from "@/features/auth/inviti";
import type { ActionEsito } from "@/features/esito";

/**
 * Accetta l'invito per conto di chi ha la sessione.
 *
 * L'identificativo arriva dal client, ed e' l'unica cosa che serve per entrare in uno
 * studio: si ricontrolla qui, non ci si fida della pagina che l'ha reso. Due condizioni,
 * e sono quelle che il plugin da solo non basta a garantire nel modo che vogliamo:
 *
 * 1. l'invito dev'essere ANCORA valido — non scaduto, non gia' usato, non annullato;
 * 2. l'indirizzo dev'essere quello invitato. Senza, chi intercettasse il collegamento
 *    entrerebbe nello studio con un account qualunque.
 *
 * Il limite di posti del piano lo applica l'aggancio in `limite-accessi.ts`, che si mette
 * davanti alla rotta del plugin: qui si traduce solo il suo rifiuto in una frase leggibile.
 */
export async function accettaInvitoAction(invitationId: string): Promise<ActionEsito<{ studio: string }>> {
  const intestazioni = await headers();
  const sessione = await auth.api.getSession({ headers: intestazioni });
  if (!sessione?.user) {
    return { ok: false, errore: "Devi accedere per accettare l'invito.", codice: "non_autenticato" };
  }

  const invito = await leggiInvito(invitationId);
  if (!invito) return { ok: false, errore: "Invito inesistente." };
  if (invito.stato !== "valido") {
    return { ok: false, errore: "Questo invito non è più utilizzabile.", codice: invito.stato };
  }
  if (invito.email !== sessione.user.email.toLowerCase()) {
    return {
      ok: false,
      errore: `L'invito è per ${invito.email}, ma hai fatto l'accesso come ${sessione.user.email}.`,
      codice: "email_diversa",
    };
  }

  try {
    await auth.api.acceptInvitation({ body: { invitationId }, headers: intestazioni });
    return { ok: true, dati: { studio: invito.studio } };
  } catch (e) {
    // Il rifiuto per posti esauriti arriva da qui come errore del plugin: al collega che
    // sta cercando di entrare non serve un codice, serve sapere chi puo' risolverlo.
    if (e instanceof EntitlementError) {
      return { ok: false, errore: e.message, codice: e.code };
    }
    const messaggio = e instanceof Error ? e.message : "";
    if (/posti|accessi|limite/i.test(messaggio)) {
      return {
        ok: false,
        errore:
          "Lo studio ha esaurito gli accessi del suo piano. Chiedi a chi ti ha invitato di liberarne uno o di aggiungerne.",
        codice: "limit_members",
      };
    }
    console.error("[inviti] accettazione fallita per", invitationId, e);
    return { ok: false, errore: "Non è stato possibile accettare l'invito. Riprova fra poco." };
  }
}
