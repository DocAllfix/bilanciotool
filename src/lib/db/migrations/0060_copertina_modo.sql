-- Come si usa la copertina caricata dall'azienda (29 settembre 2026).
--
-- Fino a oggi la copertina era sempre una FOTO decorativa: una fascia alta 118 mm larga
-- quanto la pagina, con `object-fit: cover`, sopra il titolo che scriviamo noi. Il
-- committente ha caricato una copertina A4 già impaginata — titolo, loghi e anno dentro —
-- ed è uscita ridotta a una striscia presa dal centro, senza testata e senza fondo, col
-- nostro titolo scritto sopra.
--
-- Sono due cose diverse e le decide chi carica, non un'ipotesi sulle proporzioni:
--   'foto'   = come prima: una fotografia sopra il titolo del documento;
--   'pagina' = la copertina è la pagina intera, mostrata senza tagli e senza scriverci sopra.
--
-- Il valore predefinito è quello di prima, quindi nessuna azienda esistente cambia aspetto.
-- Aggiungere una colonna con un default costante non riscrive la tabella da Postgres 11.
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "copertina_modo" text DEFAULT 'foto' NOT NULL;
--> statement-breakpoint
ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_copertina_modo_ck";
--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_copertina_modo_ck"
  CHECK ("copertina_modo" IN ('foto','pagina'));
