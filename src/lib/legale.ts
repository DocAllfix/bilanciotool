// Fatti legali del servizio, in un posto solo.
//
// Stanno qui e non copiati dentro le tre pagine perché sono gli stessi dati che
// servono al piede, ai dati strutturati e alla nota legale dentro l'app: quando
// cambia una sede o una PEC deve cambiare in un punto, non in sei.
//
// I testi delle pagine legali sono redatti sull'architettura reale del servizio
// (misurata, non supposta: fornitori, regioni, cookie effettivamente impostati)
// ma la responsabilità della pubblicazione è del titolare, che li approva prima
// dell'apertura commerciale.

export const TITOLARE = {
  ragioneSociale: "Evalis S.r.l.",
  indirizzo: "Via Sandro Botticelli 25",
  cap: "81031",
  citta: "Aversa",
  provincia: "CE",
  paese: "Italia",
  partitaIva: "04868330616",
  /** Contatto unico per servizio, privacy ed esercizio dei diritti. */
  email: "info@evalisdeck.it",
} as const;

export const SEDE_COMPLETA = `${TITOLARE.indirizzo}, ${TITOLARE.cap} ${TITOLARE.citta} (${TITOLARE.provincia})`;

/** Data di ultima revisione dei testi legali, in ISO. Una sola per tutti e tre:
 *  si rivedono insieme, e tre date diverse in fondo a tre pagine sorelle sono
 *  solo un modo per far sembrare vecchia quella che non è cambiata. */
export const AGGIORNATO_AL = "2026-08-03";

export const AGGIORNATO_AL_ESTESO = new Date(AGGIORNATO_AL).toLocaleDateString("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Fornitori che trattano dati per conto nostro. Verificati sul progetto, non
 *  elencati per abitudine: la regione di Supabase viene dall'host del pooler
 *  (`aws-0-eu-central-1`), quella di Vercel da `vercel.json` (`fra1`). */
export const FORNITORI = [
  {
    nome: "Supabase",
    ruolo: "Banca dati e archiviazione dei file",
    dove: "Unione Europea — AWS Francoforte (eu-central-1)",
    attivo: true,
  },
  {
    nome: "Vercel",
    ruolo: "Erogazione dell'applicazione",
    dove: "Unione Europea — Francoforte (fra1)",
    attivo: true,
  },
  {
    nome: "Resend",
    ruolo: "Invio delle email di servizio (verifica indirizzo, reimpostazione password, inviti)",
    dove: "Unione Europea — Irlanda (eu-west-1)",
    attivo: false,
  },
  {
    nome: "Stripe Payments Europe",
    ruolo: "Incasso dei pagamenti e fatturazione dell'abbonamento",
    dove: "Unione Europea — Irlanda",
    attivo: false,
  },
] as const;

/** Cookie realmente impostati dal servizio. Misurati con il browser, non dedotti:
 *  sul sito pubblico e sulla pagina di accesso non ne viene impostato nessuno,
 *  il solo cookie compare dopo l'autenticazione. */
export const COOKIE = [
  {
    nome: "better-auth.session_token",
    tipo: "Tecnico — autenticazione",
    scopo: "Mantiene l'accesso all'area riservata dopo l'autenticazione e protegge la sessione.",
    durata: "7 giorni",
    note: "httpOnly, SameSite=Lax, Secure su HTTPS: non è leggibile dal codice della pagina.",
  },
] as const;

/** Non sono cookie ma stanno nel browser e vanno dichiarati con gli stessi criteri. */
export const ARCHIVIAZIONE_LOCALE = [
  {
    nome: "evalisdeck-sidebar",
    scopo: "Ricorda se il menu laterale è compresso o esteso.",
    durata: "Finché non si svuotano i dati del browser",
  },
  {
    nome: "evalisdeck-tour:*",
    scopo: "Ricorda quali tour guidati sono già stati visti, per non riproporli.",
    durata: "Finché non si svuotano i dati del browser",
  },
  {
    nome: "evalisdeck-cookie-informativa",
    scopo: "Ricorda che l'informativa breve è già stata letta, per non ripresentarla.",
    durata: "Finché non si svuotano i dati del browser",
  },
  {
    nome: "theme",
    scopo: "Ricorda la scelta fra tema chiaro e scuro.",
    durata: "Finché non si svuotano i dati del browser",
  },
] as const;

/** Limiti del piano, allineati ai valori applicati dal server (`platform_config`). */
export const LIMITI_PIANO = { aziendeAttive: 10, membri: 5 } as const;
