// Il modello grafico delle email, SENZA segreti e senza dipendenze dal server.
//
// Sta separato dall'invio per una ragione pratica: cosi' si puo' rendere in anteprima
// e mettere sotto test senza chiavi e senza spedire niente. Il file che invia importa
// `env`, e chi importa `env` non gira in uno script.

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));

/* I colori del prodotto, convertiti in esadecimale: le email non conoscono `oklch`,
 * e un cliente di posta che non capisce un colore lo rende nero. */
const C = {
  petrolio: "#115952",
  inchiostro: "#13212b",
  fondo: "#f6f8f9",
  carta: "#ffffff",
  bordo: "#dfe3e5",
  tenue: "#5a656c",
  velatura: "#e0efec",
};

const SITO = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").replace(/\/+$/, "");

/**
 * Il modello di tutte le email di servizio.
 *
 * Scritto con le regole della posta e non con quelle del web: tabelle invece di
 * flexbox, stili in riga invece di fogli di stile, larghezza fissa. Outlook usa il
 * motore di Word, e tutto ciò che è nato dopo il 2005 lì non esiste.
 *
 * L'intestazione porta il monogramma MA il nome è testo: quasi tutti i client
 * bloccano le immagini finché non si preme «mostra». Un'intestazione fatta di sola
 * immagine, in quel caso, è una riga vuota — e la prima cosa che il destinatario
 * dovrebbe riconoscere sparisce.
 */
export function renderEmail(opts: {
  previewText: string;
  heading: string;
  /** Paragrafi del corpo: le parti dinamiche vanno già passate da `esc()`. */
  body: string[];
  button?: { label: string; url: string };
  /** Riga in coda al corpo, più piccola: avvertenze, non contenuto. */
  nota?: string;
}): string {
  const { previewText, heading, body, button, nota } = opts;

  const btn = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
         <tr><td align="center" bgcolor="${C.petrolio}" style="border-radius:8px">
           <a href="${esc(button.url)}" style="display:inline-block;padding:13px 26px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(button.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${C.tenue}">Se il pulsante non funziona, copia questo indirizzo nel browser:</p>
       <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(button.url)}" style="color:${C.petrolio}">${esc(button.url)}</a></p>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.fondo};-webkit-font-smoothing:antialiased">
<span style="display:none;font-size:1px;color:${C.fondo};max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(previewText)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fondo}">
  <tr><td align="center" style="padding:32px 16px">

    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%">

      <!-- intestazione: il nome è TESTO, il simbolo è un di più -->
      <tr><td style="padding:0 4px 18px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:9px;vertical-align:middle">
              <img src="${SITO}/brand/derivati/monogramma-256.png" width="26" height="26" alt="" style="display:block;width:26px;height:26px;border:0" />
            </td>
            <td style="vertical-align:middle">
              <span style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.2px;color:${C.inchiostro}">EvalisDeck</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- corpo -->
      <tr><td style="background-color:${C.carta};border:1px solid ${C.bordo};border-radius:14px;padding:36px 34px">
        <h1 style="margin:0 0 18px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:21px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;color:${C.inchiostro}">${esc(heading)}</h1>
        ${body
          .map(
            (p) =>
              `<p style="margin:0 0 14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3d4a53">${p}</p>`,
          )
          .join("")}
        ${btn}
        ${
          nota
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr><td style="background-color:${C.velatura};border-radius:8px;padding:13px 16px"><p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${C.petrolio}">${nota}</p></td></tr></table>`
            : ""
        }
      </td></tr>

      <!-- piede: chi scrive e da dove. Un'email di servizio senza mittente
           identificabile è la prima cosa che un filtro antispam nota. -->
      <tr><td style="padding:22px 8px 0">
        <p style="margin:0 0 5px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.tenue}">
          <strong style="color:#44505a">Evalis S.r.l.</strong> · Via Sandro Botticelli 25, 81031 Aversa (CE) · P. IVA 04868330616
        </p>
        <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.tenue}">
          Messaggio automatico del servizio EvalisDeck. Puoi rispondere: le risposte arrivano a una persona.
          &nbsp;·&nbsp; <a href="${SITO}/privacy" style="color:${C.tenue};text-decoration:underline">Privacy</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

