-- Mensile o annuale, e la disdetta a fine periodo (6 novembre 2026).
--
-- ⚠️ ADDITIVA: due colonne nuove, una annullabile e una con un predefinito. Nessuna riga
-- esistente cambia significato, e il CHECK sul periodo non può respingere niente di ciò che
-- c'è già, perché oggi la colonna non esiste.
--
-- ⚠️ VA IN PRODUZIONE PRIMA DEL CODICE. `applicaAbbonamento` le scrive a ogni evento Stripe:
-- online senza le colonne, il webhook di chi ha appena pagato fallirebbe dentro la
-- transazione del provisioning, risponderebbe 500, e il cliente resterebbe senza servizio.
ALTER TABLE "org_entitlement" ADD COLUMN "periodo" text;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD COLUMN "disdetta_a_fine_periodo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_periodo_ck" CHECK ("periodo" IS NULL OR "periodo" IN ('anno', 'mese'));
