-- Il registro delle CAPACITÀ: perché uno studio ha la capacità che ha, e chi gliel'ha data.
--
-- ── Perché questo, e non una copia del registro monetario di Stripe ───────────
--
-- Il nostro database non contiene un solo importo: nessun `amount`, nessuna fattura,
-- nessun rimborso, nessun saldo, una sola valuta. Non chiamiamo mai `paymentIntents`,
-- `charges`, `refunds` o `capture`: il perimetro di produzione è quattro chiamate che
-- creano. Il denaro vive tutto in Stripe, che è già un registro immutabile e autorevole.
--
-- Righe `initiated / authorized / captured / refunded` registrerebbero cose che non
-- facciamo, copiate da un sistema che le ha già, con l'unica certezza di divergere in
-- silenzio ogni volta che qualcuno tocca il cruscotto Stripe. E non soddisferebbero
-- nessun obbligo: quello fiscale italiano è la fattura elettronica via SdI, che è un
-- altro sistema.
--
-- Quello che invece è NOSTRO, e che oggi si perde, è la capacità: `org_entitlement` è una
-- riga sola, sovrascritta dall'ultimo evento arrivato. Dopo un anno di rinnovi nessuno
-- può più dire quando uno studio è stato attivato la prima volta, quale evento Stripe gli
-- ha dato il white label, o perché è finito in sola lettura.
--
-- ── Come si incastra ──────────────────────────────────────────────────────────
--
-- `org_entitlement` RESTA, e nessuno dei 117 punti che leggono l'entitlement cambia: è la
-- cache dello stato corrente. Questo è la storia. Si scrivono insieme, nella stessa
-- transazione, dallo stesso posto.

CREATE TABLE IF NOT EXISTS "entitlement_event" (
  "id" bigserial PRIMARY KEY NOT NULL,

  -- NESSUNA chiave esterna, come `audit_log` e per la stessa ragione: il registro deve
  -- sopravvivere alla cancellazione dell'organizzazione. `org_entitlement`,
  -- `stripe_customer` e `stripe_subscription` sono tutte `ON DELETE CASCADE`: oggi, se
  -- si cancella uno studio, di che cosa avesse comprato non resta niente.
  "organization_id" text NOT NULL,

  -- Da dove viene il cambiamento.
  "origine" text NOT NULL,
  -- Il filo che oggi manca del tutto: quale evento Stripe ha causato questo stato.
  -- `stripe_processed_event` non serve allo scopo, perché viene CANCELLATA sui fallimenti.
  "stripe_event_id" text,
  "stripe_event_type" text,
  "subscription_id" text,
  -- Quando Stripe l'ha emesso, non quando l'abbiamo scritto: gli eventi arrivano fuori
  -- ordine, e la cronologia vera è la sua.
  "occurred_at" timestamp,

  -- Che cosa è cambiato. `stato_prima` oggi viene letto (per decidere se mandare
  -- un'email) e poi buttato via.
  "stato_prima" text,
  "stato_dopo" text NOT NULL,
  "piano" text,
  "aziende_extra" integer DEFAULT 0 NOT NULL,
  "accessi_extra" integer DEFAULT 0 NOT NULL,
  "white_label" boolean DEFAULT false NOT NULL,
  "current_period_end" timestamp,
  "dettagli" jsonb,

  "recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "entitlement_event_org_idx" ON "entitlement_event" ("organization_id", "id");
--> statement-breakpoint
-- Serve a `attivatoIl`: il PRIMO ingresso in `active` di uno studio.
CREATE INDEX IF NOT EXISTS "entitlement_event_stato_idx" ON "entitlement_event" ("organization_id", "stato_dopo", "id");
--> statement-breakpoint

ALTER TABLE "entitlement_event"
  ADD CONSTRAINT "entitlement_event_origine_ck" CHECK ("origine" IN ('stripe', 'manuale', 'sistema'));
--> statement-breakpoint
ALTER TABLE "entitlement_event"
  ADD CONSTRAINT "entitlement_event_stato_ck" CHECK ("stato_dopo" IN ('demo', 'active', 'past_due', 'expired'));
--> statement-breakpoint

-- ── Immutabilità: gli stessi TRE pezzi di `document_snapshot` (0002) ──────────
--
-- `audit_log` ne ha solo uno (la revoca sul ruolo applicativo), quindi il proprietario
-- dello schema può ancora modificarlo. Qui si fa come per gli snapshot: il trigger vale
-- per CHIUNQUE, connessione privilegiata compresa.

CREATE OR REPLACE FUNCTION entitlement_event_immutabile() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'entitlement_event è append-only: un cambiamento è una riga nuova, non una riga modificata';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_entitlement_event_immutabile ON entitlement_event;
--> statement-breakpoint
CREATE TRIGGER trg_entitlement_event_immutabile
  BEFORE UPDATE OR DELETE ON entitlement_event
  FOR EACH ROW EXECUTE FUNCTION entitlement_event_immutabile();
--> statement-breakpoint

REVOKE UPDATE, DELETE ON entitlement_event FROM app_rls;
--> statement-breakpoint

-- ── RLS: come `audit_log` ─────────────────────────────────────────────────────
--
-- INSERT limitato alla propria organizzazione, con la valvola `platform_admin` che serve
-- al webhook (arriva senza sessione). SELECT della sola propria organizzazione.
-- Nessuna policy per UPDATE/DELETE: non esistono, e il trigger lo garantisce comunque.

ALTER TABLE "entitlement_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entitlement_event" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "entitlement_event_insert_rls" ON "entitlement_event" FOR INSERT TO app_rls
  WITH CHECK ("organization_id" = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint
CREATE POLICY "entitlement_event_select_rls" ON "entitlement_event" FOR SELECT TO app_rls
  USING ("organization_id" = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
