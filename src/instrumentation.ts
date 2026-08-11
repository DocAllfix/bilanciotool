import * as Sentry from "@sentry/nextjs";
import { configurazioneComune } from "@/lib/sentry-comune";

// Server ed edge. Il client si configura in `instrumentation-client.ts`.
//
// ⚠️ DEVE stare in `src/`, non nella radice: quando il progetto usa la cartella `src`,
// Next cerca il file solo lì. Nella radice viene ignorato in silenzio — Sentry non
// veniva nemmeno inizializzato, e il cruscotto restava vuoto mentre il server
// rispondeva 500.
export async function register() {
  Sentry.init(configurazioneComune);
}

export const onRequestError = Sentry.captureRequestError;
