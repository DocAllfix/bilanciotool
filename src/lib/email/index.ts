import { env } from "@/lib/env";
import { renderEmail, esc } from "./modello";

export { renderEmail, esc };

// Email transazionali via Resend, SENZA astrazioni: un renderer + sender thin.
// Senza RESEND_API_KEY il sender è no-op ({sent:false}) e in dev logga il link,
// così signup/inviti funzionano anche senza chiavi. MAI loggare token in produzione.

async function send(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  if (!env.RESEND_API_KEY) return { sent: false };
  // `reply_to` separato dal mittente: `evalisdeck.it` NON riceve posta, quindi senza
  // questo chi risponde a un'email automatica — e la gente risponde — scrive nel vuoto.
  // È una variabile perché cambierà: oggi è una casella qualsiasi che leggiamo, domani
  // sarà l'assistenza vera, e sostituirla non deve richiedere un rilascio di codice.
  const replyTo = process.env.RESEND_REPLY_TO;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM ?? "onboarding@resend.dev",
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  return { sent: res.ok };
}

function logLinkInDev(kind: string, url: string) {
  if (env.NODE_ENV !== "production") console.log(`[email dev] ${kind}: ${url}`);
}

export async function sendVerificationEmail(to: string, url: string) {
  logLinkInDev("verifica email", url);
  return send(to, "Conferma il tuo indirizzo email", renderEmail({
    previewText: "Conferma il tuo indirizzo per attivare l'account",
    heading: "Conferma il tuo indirizzo email",
    body: ["Per completare la registrazione conferma il tuo indirizzo email."],
    button: { label: "Conferma email", url },
  }));
}

export async function sendResetPasswordEmail(to: string, url: string) {
  logLinkInDev("reset password", url);
  return send(to, "Reimposta la password", renderEmail({
    previewText: "Richiesta di reimpostazione password",
    heading: "Reimposta la password",
    body: ["Abbiamo ricevuto una richiesta di reimpostazione della password. Se non sei stato tu, ignora questa email."],
    button: { label: "Reimposta password", url },
  }));
}

export async function sendOrgInvitationEmail(to: string, orgName: string, url: string) {
  logLinkInDev("invito organizzazione", url);
  return send(to, `Invito a collaborare — ${orgName}`, renderEmail({
    previewText: `Sei stato invitato a collaborare con ${orgName}`,
    heading: "Invito a collaborare",
    body: [`Sei stato invitato a entrare nello studio <b>${esc(orgName)}</b>.`],
    button: { label: "Accetta l'invito", url },
  }));
}

/**
 * Il primo documento pubblicato dallo studio.
 *
 * È il momento in cui il prodotto ha mantenuto la promessa: prima di allora si è
 * compilato, da qui in poi si consegna. L'occasione serve a far scoprire la funzione
 * che nessuno cerca da solo — il collegamento a scadenza con cui l'azienda scarica i
 * propri documenti senza account.
 *
 * Si manda UNA volta per studio, non a ogni pubblicazione: un applauso ripetuto smette
 * di essere un applauso e diventa posta da filtrare.
 */
export async function sendPrimoDocumentoEmail(
  to: string,
  dati: { nomeDocumento: string; azienda: string; url: string; urlAzienda: string },
) {
  return send(
    to,
    `Il tuo primo documento è pronto — ${dati.azienda}`,
    renderEmail({
      previewText: `${dati.nomeDocumento} di ${dati.azienda} è pubblicato.`,
      heading: "Il primo documento è pubblicato",
      body: [
        `Hai pubblicato <b>${esc(dati.nomeDocumento)}</b> per <b>${esc(dati.azienda)}</b>.`,
        "I dati e i calcoli di questa versione sono congelati: le modifiche successive al percorso non la toccano più, e resta la copia che hai consegnato.",
        `Se vuoi che l'azienda lo scarichi da sé, dal suo fascicolo puoi generare un <b>collegamento a scadenza</b>: si apre senza registrarsi e senza password, e puoi disattivarlo quando vuoi. <a href="${esc(dati.urlAzienda)}">Vai al fascicolo di ${esc(dati.azienda)}</a>`,
      ],
      button: { label: "Apri il documento", url: dati.url },
    }),
  );
}

/**
 * Allarme sui controlli del blog.
 *
 * Va a chi puo' rimediare, non al consulente: se un canonical e' finito sul CMS o la
 * sitemap si e' svuotata, il rimedio e' tecnico.
 *
 * Senza RESEND_API_KEY resta un no-op e il guasto si vede solo nei log di Vercel — dove
 * nessuno guarda finche' non e' tardi. E' il motivo per cui la chiave va messa prima di
 * accendere il blog per i motori.
 */
export async function inviaAllarmeBlog(righe: string[]): Promise<{ sent: boolean }> {
  const destinatario = process.env.BLOG_ALLARME_A;
  if (!destinatario) return { sent: false };
  return send(
    destinatario,
    "[EvalisDeck] Controlli del blog: qualcosa non torna",
    renderEmail({
      previewText: "Uno o piu controlli automatici sul blog sono rossi.",
      heading: "Controlli del blog",
      body: [
        "Uno o più controlli automatici sul blog sono rossi. Finché non si risolvono, il posizionamento degli articoli è a rischio.",
        righe.map(esc).join("<br>"),
      ],
    }),
  );
}

/**
 * Benvenuto, subito dopo che l'account si è sbloccato.
 *
 * Il momento in cui nasce il rimpianto: si è appena speso qualche migliaio di euro e
 * si vorrebbe sapere cosa è cambiato. Dice quello, e indica un primo passo solo.
 */
export async function sendBenvenutoEmail(
  to: string,
  d: { piano: string; aziende: number; accessi: number; url: string },
) {
  return send(
    to,
    `Il tuo abbonamento è attivo — piano ${d.piano}`,
    renderEmail({
      previewText: `Piano ${d.piano} attivo: ${d.aziende} aziende, ${d.accessi} accessi.`,
      heading: "Il tuo abbonamento è attivo",
      body: [
        `Il piano <b>${esc(d.piano)}</b> è attivo. Da adesso puoi seguire fino a <b>${d.aziende} aziende</b> e invitare <b>${d.accessi} persone</b> nello studio.`,
        "Pubblicare documenti, generare i PDF e creare aziende non è più bloccato.",
        "La ricevuta del pagamento ti arriva separatamente da Stripe.",
      ],
      button: { label: "Crea la prima azienda", url: d.url },
    }),
  );
}

/**
 * Pagamento non riuscito.
 *
 * È l'email che salva l'abbonamento: senza, la carta scade, l'account si blocca, e il
 * cliente lo scopre il giorno che gli serve — di solito con una scadenza addosso.
 */
export async function sendPagamentoFallitoEmail(to: string, d: { url: string }) {
  return send(
    to,
    "Non siamo riusciti a rinnovare il tuo abbonamento",
    renderEmail({
      previewText: "Il pagamento non è andato a buon fine: aggiorna il metodo di pagamento.",
      heading: "Il pagamento non è andato a buon fine",
      body: [
        "Non siamo riusciti ad addebitare il rinnovo. Succede spesso per una carta scaduta o per un massimale.",
        "Il tuo account continua a funzionare, ma se il pagamento non va a buon fine nei prossimi giorni passerà in sola lettura: i dati restano tutti, e i documenti pubblicati restano scaricabili.",
      ],
      button: { label: "Aggiorna il metodo di pagamento", url: d.url },
    }),
  );
}

/**
 * Preavviso di rinnovo, una settimana prima.
 *
 * Ricordare a qualcuno che sta per pagare sembra controintuitivo. È invece ciò che
 * evita la contestazione dell'addebito e il «non me l'aspettavo»: su un rinnovo
 * annuale di quattro cifre, la differenza è sostanziale.
 */
export async function sendPreavvisoRinnovoEmail(
  to: string,
  d: { importo: string; quando: string; url: string },
) {
  return send(
    to,
    `Il tuo abbonamento si rinnova il ${d.quando}`,
    renderEmail({
      previewText: `Rinnovo automatico di ${d.importo} il ${d.quando}.`,
      heading: "Il tuo abbonamento si rinnova fra una settimana",
      body: [
        `Il <b>${esc(d.quando)}</b> rinnoveremo automaticamente il tuo abbonamento, con un addebito di <b>${esc(d.importo)}</b>.`,
        "Non devi fare niente. Se vuoi cambiare piano, aggiornare la carta o non rinnovare, puoi farlo da qui fino al giorno prima.",
      ],
      button: { label: "Vedi il tuo abbonamento", url: d.url },
    }),
  );
}
