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
export const AGGIORNATO_AL = "2026-08-05";

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
  {
    nome: "Sentry (Functional Software, Inc.)",
    ruolo:
      "Registrazione degli errori tecnici dell'applicazione, per accorgersi dei guasti prima che li segnalino gli utenti",
    // Regione europea scelta in fase di attivazione: i dati restano su infrastruttura UE.
    // I contenuti sensibili — credenziali, token, dati delle aziende — sono rimossi prima
    // dell'invio, non dopo: vedi `src/lib/sentry-comune.ts`.
    dove: "Unione Europea — Germania",
    attivo: true,
  },
  {
    nome: "Google Ireland Limited",
    ruolo: "Statistiche di visita del sito pubblico (Google Analytics 4), solo previo consenso",
    // Il contratto è con la società irlandese, ma l'infrastruttura di Google comporta
    // trattamenti anche negli Stati Uniti: si dichiara, non si nasconde dietro «Irlanda».
    dove: "Irlanda, con possibili trasferimenti negli Stati Uniti (EU-US Data Privacy Framework)",
    attivo: true,
  },
] as const;

/** Cookie realmente impostati dal servizio. Misurati con il browser, non dedotti:
 *  senza consenso il sito pubblico non ne imposta nessuno, e nemmeno la pagina di
 *  accesso; il cookie tecnico compare dopo l'autenticazione, quelli di misurazione
 *  solo dopo un consenso esplicito. */
export const COOKIE = [
  {
    nome: "better-auth.session_token",
    tipo: "Tecnico — autenticazione",
    scopo: "Mantiene l'accesso all'area riservata dopo l'autenticazione e protegge la sessione.",
    durata: "7 giorni",
    note: "httpOnly, SameSite=Lax, Secure su HTTPS: non è leggibile dal codice della pagina.",
    consenso: false,
  },
  {
    nome: "_ga",
    tipo: "Statistico — Google Analytics 4",
    scopo:
      "Distingue una visita dall'altra per contare quanti visitatori arrivano e quali pagine leggono.",
    durata: "2 anni",
    note: "Impostato da Google. Nessuna pubblicità e nessuna profilazione: gli usi pubblicitari sono disattivati nella configurazione della proprietà.",
    consenso: true,
  },
  {
    nome: "_ga_0YYSRQL9FL",
    tipo: "Statistico — Google Analytics 4",
    scopo: "Conserva lo stato della sessione di misurazione per questa specifica proprietà.",
    durata: "2 anni",
    note: "Impostato da Google. Il suffisso è l'identificativo della nostra proprietà di misurazione.",
    consenso: true,
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
    nome: "evalisdeck-consenso-v1",
    scopo:
      "Ricorda se hai accettato o rifiutato i cookie di misurazione, per non richiedertelo a ogni pagina.",
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
