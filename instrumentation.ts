import * as Sentry from "@sentry/nextjs";
import { configurazioneComune } from "@/lib/sentry-comune";

// Server ed edge. Il client si configura in `instrumentation-client.ts`.
export async function register() {
  Sentry.init(configurazioneComune);
}

export const onRequestError = Sentry.captureRequestError;
