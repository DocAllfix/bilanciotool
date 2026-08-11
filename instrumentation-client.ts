import * as Sentry from "@sentry/nextjs";
import { configurazioneComune } from "@/lib/sentry-comune";

// Il browser. `replaysSessionSampleRate` resta a zero: registrare le sessioni degli
// utenti significherebbe filmare i dati delle aziende dei nostri clienti, e la nostra
// informativa non lo prevede.
Sentry.init({
  ...configurazioneComune,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
