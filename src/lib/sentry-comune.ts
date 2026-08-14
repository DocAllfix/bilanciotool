// Configurazione condivisa di Sentry, uguale su client, server ed edge.
//
// Il filtro sui dati NON è un di più: uno stack trace si porta dietro l'ambiente in cui
// è nato, e nel nostro ambiente ci sono chiavi di Stripe, token di sessione e indirizzi
// email di clienti. Mandarli a un fornitore terzo sarebbe una comunicazione di dati che
// la nostra informativa non prevede — e il modo più stupido di perdere una chiave.
//
// ⚠️ La pulizia avviene SUL POSTO, e solo sui rami dove i segreti finiscono davvero.
// La prima versione ricostruiva l'intero evento proprietà per proprietà: il risultato
// somigliava a un evento ma non lo era più, e Sentry lo scartava prima di spedirlo. Il
// sintomo era il peggiore possibile — nessun errore, nessun avviso, solo un cruscotto
// vuoto mentre il server rispondeva 500. Un filtro che rompe ciò che filtra è peggio di
// nessun filtro, perché toglie anche la possibilità di accorgersene.

/** Le chiavi il cui VALORE non deve mai uscire da qui. */
const SEGRETI = /(secret|token|password|authorization|cookie|api[-_]?key|whsec|^sk_|bearer)/i;

/** Sostituisce i valori sensibili dentro un dizionario piatto, senza ricrearlo. */
function mascheraQui(obj: Record<string, unknown> | undefined): void {
  if (!obj || typeof obj !== "object") return;
  for (const chiave of Object.keys(obj)) {
    if (SEGRETI.test(chiave)) obj[chiave] = "[rimosso]";
  }
}

type EventoSentry = {
  request?: { headers?: Record<string, unknown>; cookies?: unknown; data?: unknown };
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown> | undefined>;
};

export const configurazioneComune = {
  // `process.env` e NON `env` di `@/lib/env`: questo file gira anche nel browser
  // (`instrumentation-client.ts`), e `env.ts` ha una trappola che esplode se arriva al
  // client. La variabile e' comunque DICHIARATA la', cosi' esiste in un posto solo e
  // qualcuno la vede: senza DSN Sentry parte e non riporta niente, in silenzio.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Nessun campione delle prestazioni: costa quota e non risolve nessun problema che
  // abbiamo oggi. Si accende il giorno che una pagina sarà lenta e non si capirà perché.
  tracesSampleRate: 0,
  // In sviluppo gli errori si vedono nel terminale: mandarli a Sentry riempirebbe la
  // quota di problemi che stiamo già guardando.
  enabled: process.env.NODE_ENV === "production",
  // I dati personali non si mandano di default: nessun indirizzo IP, nessuna
  // intestazione, nessun corpo di richiesta, salvo ciò che serve a capire il guasto.
  sendDefaultPii: false,

  beforeSend<T>(evento: T): T {
    const e = evento as EventoSentry;
    mascheraQui(e.request?.headers);
    mascheraQui(e.extra);
    mascheraQui(e.tags);
    // I cookie interi si buttano: contengono la sessione, e nessun guasto si diagnostica
    // leggendoli.
    if (e.request && "cookies" in e.request) e.request.cookies = "[rimosso]";
    for (const contesto of Object.values(e.contexts ?? {})) mascheraQui(contesto);
    // Si restituisce l'evento ORIGINALE, modificato: ricostruirlo lo renderebbe
    // irriconoscibile a chi lo deve spedire.
    return evento;
  },
};
