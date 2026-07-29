import { env } from "@/lib/env";

// Email transazionali via Resend, SENZA astrazioni: un renderer + sender thin.
// Senza RESEND_API_KEY il sender è no-op ({sent:false}) e in dev logga il link,
// così signup/inviti funzionano anche senza chiavi. MAI loggare token in produzione.

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));

export function renderEmail(opts: {
  previewText: string;
  heading: string;
  body: string[]; // paragrafi già escapati dal chiamante per le parti dinamiche
  button?: { label: string; url: string };
}): string {
  const { previewText, heading, body, button } = opts;
  const btn = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#1F5A4C;border-radius:8px">
         <a href="${esc(button.url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600">${esc(button.label)}</a>
       </td></tr></table>
       <p style="font-size:12px;color:#6b7280">Se il pulsante non funziona, copia questo indirizzo nel browser:<br>${esc(button.url)}</p>`
    : "";
  return `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#f6f7f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
    <span style="display:none;max-height:0;overflow:hidden">${esc(previewText)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px">
        <tr><td>
          <h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>
          ${body.map((p) => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${p}</p>`).join("")}
          ${btn}
        </td></tr>
      </table>
      <p style="font-size:11px;color:#9ca3af;margin-top:16px">Messaggio automatico — non rispondere a questa email.</p>
    </td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  if (!env.RESEND_API_KEY) return { sent: false };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM ?? "onboarding@resend.dev", to, subject, html }),
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
