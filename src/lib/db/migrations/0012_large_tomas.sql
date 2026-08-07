ALTER TABLE "org_entitlement" ADD COLUMN "piano" text;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD COLUMN "aziende_extra" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD COLUMN "accessi_extra" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD COLUMN "white_label" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- I vincoli che Drizzle NON genera per `text(enum)`: senza, la colonna accetta qualunque
-- stringa e un refuso nel provisioning scriverebbe un piano inesistente. `limitiEffettivi`
-- lo tratterebbe come «nessun piano» e lo studio si ritroverebbe la capacita' di riserva
-- invece di quella pagata, senza nessun errore da nessuna parte.
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_piano_ck"
  CHECK ("piano" IS NULL OR "piano" IN ('professional','studio','studio_plus','enterprise'));
--> statement-breakpoint
-- La capacita' comprata non puo' essere negativa: sottrarrebbe capacita' a chi ha pagato.
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_extra_ck"
  CHECK ("aziende_extra" >= 0 AND "accessi_extra" >= 0);
--> statement-breakpoint
-- Un piano acquistato senza data di attivazione, o viceversa, e' uno stato che non deve
-- esistere: e' il sintomo di un provisioning finito a meta'.
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_piano_attivo_ck"
  CHECK ("piano" IS NULL OR "activated_at" IS NOT NULL);
