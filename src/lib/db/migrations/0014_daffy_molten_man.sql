CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
-- Better Auth cerca SEMPRE per chiave, a ogni richiesta protetta: senza indice il
-- limitatore diventa esso stesso il collo di bottiglia che dovrebbe evitare.
CREATE UNIQUE INDEX "rate_limit_key_uq" ON "rate_limit" USING btree ("key");--> statement-breakpoint
-- Non e' una tabella tenant: la chiave e' l'indirizzo di rete, che esiste prima di
-- qualunque sessione e di qualunque organizzazione. Sta col passthrough delle altre
-- tabelle di Better Auth, che operano fuori da `withTenant` e senza GUC.
--
-- Senza questa policy, RLS attiva sarebbe deny-all: in sviluppo la connessione e'
-- privilegiata e non si vedrebbe nulla, in produzione il limitatore fallirebbe ogni
-- scrittura. Un limitatore che non riesce a contare non limita niente.
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "rate_limit_passthrough" ON "rate_limit" FOR ALL TO app_rls
  USING (true) WITH CHECK (true);
