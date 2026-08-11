// Configurazione condivisa di Sentry, uguale su client, server ed edge.
//
// Il filtro sui dati NON è un di più: uno stack trace si porta dietro l'ambiente in cui
// è nato, e nel nostro ambiente ci sono chiavi di Stripe, token di sessione e indirizzi
// email di clienti. Mandarli a un fornitore terzo sarebbe una comunicazione di dati che
// la nostra informativa non prevede — e sarebbe anche il modo più stupido di perdere una
// chiave segreta.

/** Le chiavi il cui VALORE non deve mai uscire da qui. */
const SEGRETI = /(secret|token|password|authorization|cookie|api[-_]?key|whsec|sk_live|sk_test)/i;

export const configurazioneComune = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Nessun campione delle prestazioni: costa quota e non risolve nessun problema che
  // abbiamo oggi. Si accende il giorno che una pagina sarà lenta e non si capirà perché.
  tracesSampleRate: 0,
  // In sviluppo gli errori si vedono nel terminale: mandarli a Sentry riempirebbe la
  // quota di problemi che stiamo già guardando.
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  beforeSend<T>(evento: T): T {
    return ripulisci(evento) as T;
  },
};

/** Sostituisce i valori sensibili ovunque compaiano, per quanto in profondità. */
function ripulisci(v: unknown, profondita = 0): unknown {
  if (profondita > 8 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => ripulisci(x, profondita + 1));
  const out: Record<string, unknown> = {};
  for (const [k, valore] of Object.entries(v as Record<string, unknown>)) {
    out[k] = SEGRETI.test(k) ? "[rimosso]" : ripulisci(valore, profondita + 1);
  }
  return out;
}
