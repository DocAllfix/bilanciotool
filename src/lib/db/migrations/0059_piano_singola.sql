-- La fascia «Un'azienda» (decisione del committente del 22 settembre 2026).
--
-- ⚠️ QUESTA MIGRAZIONE VA IN PRODUZIONE PRIMA DEL CODICE. Il webhook di Stripe scrive
-- `org_entitlement.piano = 'singola'` dentro la transazione del provisioning: col vincolo
-- vecchio l'inserimento viene respinto, il webhook risponde 500, Stripe ritenta, e un
-- cliente che ha PAGATO resta senza servizio finché qualcuno non se ne accorge.
--
-- Il vincolo solo si ALLARGA: nessuna riga esistente può violarlo. Si riscrive per intero
-- (drop + add nella stessa migrazione) perché Postgres non modifica un CHECK sul posto.
ALTER TABLE "org_entitlement" DROP CONSTRAINT IF EXISTS "org_entitlement_piano_ck";
--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_piano_ck"
  CHECK ("piano" IS NULL OR "piano" IN ('singola','professional','studio','studio_plus','enterprise'));
