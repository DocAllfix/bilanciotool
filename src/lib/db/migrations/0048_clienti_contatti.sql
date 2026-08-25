-- ANAGRAFICA DEL CLIENTE E RUBRICA DEI CONTATTI (Fase 2 di EvalisDeck x ESG Nexus).
--
-- Due cose insieme, e stanno insieme apposta: le colonne nuove su `company` e la
-- tabella `company_contact`. Se la tabella arrivasse senza le sue policy, RLS
-- attiva senza policy significa deny-all e in sviluppo non si vedrebbe — la
-- connessione locale e' privilegiata (bypassrls). Funzionerebbe qui e
-- restituirebbe zero righe in produzione, in silenzio.

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "nazione" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "dipendenti" integer;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "fatturato" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "sito_web" text;--> statement-breakpoint

-- I domini chiusi, che Drizzle non genera.
--
-- `nazione` e' il codice ISO 3166-1 alpha-2 in MAIUSCOLO, non il nome del paese:
-- «Italia», «italia», «IT» e «ITA» scritti a mano nello stesso campo rendono
-- inutile qualunque raggruppamento per paese il giorno in cui servira'.
ALTER TABLE "company" ADD CONSTRAINT "company_nazione_iso2"
  CHECK ("nazione" IS NULL OR "nazione" ~ '^[A-Z]{2}$');--> statement-breakpoint

-- Nessun organico negativo e nessun fatturato negativo. Non e' pedanteria: un
-- meno digitato per sbaglio finisce in un denominatore, e un'intensita' negativa
-- su un documento firmato non la corregge piu' nessuno.
ALTER TABLE "company" ADD CONSTRAINT "company_dipendenti_non_negativi"
  CHECK ("dipendenti" IS NULL OR "dipendenti" >= 0);--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_fatturato_non_negativo"
  CHECK ("fatturato" IS NULL OR "fatturato" >= 0);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "company_contact" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "company_id" text NOT NULL REFERENCES "company"("id") ON DELETE cascade,
  "nome" text NOT NULL,
  "ruolo" text,
  "email" text,
  "telefono" text,
  "principale" boolean DEFAULT false NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "company_contact_company_idx" ON "company_contact" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_contact_org_idx" ON "company_contact" ("organization_id");--> statement-breakpoint

-- Un solo contatto principale per azienda, e lo dice il DATABASE.
--
-- L'alternativa era spegnere gli altri dentro la transazione applicativa, e
-- regge finche' nessuno sbaglia: qui invece la seconda scrittura viene
-- RESPINTA, e l'azione che promuove un contatto e' costretta a spegnere il
-- precedente nella stessa transazione. E' la differenza fra una convenzione e
-- un fatto.
CREATE UNIQUE INDEX IF NOT EXISTS "company_contact_principale_uq"
  ON "company_contact" ("company_id") WHERE "principale";--> statement-breakpoint

-- Un nome vuoto non e' un contatto: e' una riga che occupa spazio in una rubrica
-- e non si puo' ne' chiamare ne' cancellare con cognizione.
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_nome_non_vuoto"
  CHECK (length(btrim("nome")) > 0);--> statement-breakpoint

-- Isolamento multi-tenant: `company_contact` porta `organization_id` e ha la sua
-- policy, come ogni tabella tenant. Senza, `rls-matrix.db.test.ts` fallisce — ed
-- e' la difesa che esiste apposta.
ALTER TABLE "company_contact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_contact" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_contact_tenant_rls" ON "company_contact" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "company_contact" TO app_rls;
