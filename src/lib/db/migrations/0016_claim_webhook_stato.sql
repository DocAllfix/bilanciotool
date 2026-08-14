-- Il claim del webhook impara a distinguere «fatto» da «cominciato e mai finito».
--
-- IL DIFETTO. `route.ts` rilascia il claim nel `catch`, che intercetta le eccezioni
-- JavaScript. NON intercetta il timeout della funzione serverless, un OOM, o un guasto
-- del database durante la `rilascia` stessa (che e' essa stessa una scrittura).
--
-- Quando il processo muore a meta', la riga resta. Stripe ritenta, trova il claim, e la
-- rotta risponde `200 {ok:true, nota:"gia' processato"}`. Stripe considera l'evento
-- consegnato e smette di ritentare.
--
-- Un cliente che ha pagato resta bloccato, con 200 su tutta la linea e nessun errore in
-- nessun log. E' il guasto peggiore che questo sistema possa avere: silenzioso, e dalla
-- parte dei soldi.
--
-- La tabella non poteva accorgersene: aveva `event_id` e `processed_at`, e nient'altro.
-- Un claim preso e uno completato erano la stessa riga.
--
-- IL RIMEDIO. Due colonne, e il ripescaggio diventa esprimibile in UNA SOLA istruzione
-- atomica (vedi `idempotenza.ts`): `insert ... on conflict do update ... where` con la
-- condizione «e' in corso da troppo tempo». Chi trova un claim fresco o completato non
-- ottiene righe e si ferma, come prima.
--
-- Perche' cinque minuti: la rotta ora dichiara `maxDuration = 60`, quindi nessuna
-- elaborazione legittima puo' durare oltre un minuto. Un claim ancora `in_corso` dopo
-- cinque e' morto con certezza, non lento.

ALTER TABLE "stripe_processed_event"
  ADD COLUMN IF NOT EXISTS "stato" text NOT NULL DEFAULT 'completato';
--> statement-breakpoint
ALTER TABLE "stripe_processed_event"
  ADD COLUMN IF NOT EXISTS "preso_il" timestamp NOT NULL DEFAULT now();
--> statement-breakpoint

-- Le righe che c'erano gia' sono tutte di eventi andati a buon fine: chi fallisce viene
-- cancellato dal `rilascia`. Il default le marca `completato`, che e' la verita'.
ALTER TABLE "stripe_processed_event"
  ADD CONSTRAINT "stripe_processed_event_stato_ck"
  CHECK ("stato" IN ('in_corso', 'completato'));
--> statement-breakpoint

-- Serve a trovare i claim morti senza scorrere la tabella, e al giro di pulizia.
CREATE INDEX IF NOT EXISTS "stripe_evento_in_corso_idx"
  ON "stripe_processed_event" ("stato", "preso_il");
