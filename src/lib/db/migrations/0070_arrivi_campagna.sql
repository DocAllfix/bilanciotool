-- Gli arrivi da una campagna, contati da noi (21 ottobre 2026).
--
-- Aggregati per giorno, sorgente, mezzo, campagna, clic di Google Ads sì/no e pagina:
-- nessun cookie, nessun indirizzo di rete, nessun identificativo. Il perché sta nello
-- schema (`platform.ts`, `arrivoCampagna`).
CREATE TABLE "arrivo_campagna" (
	"giorno" date NOT NULL,
	"sorgente" text NOT NULL,
	"mezzo" text NOT NULL,
	"campagna" text NOT NULL,
	"clic_ads" boolean NOT NULL,
	"pagina" text NOT NULL,
	"conteggio" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "arrivo_campagna_pk" PRIMARY KEY("giorno","sorgente","mezzo","campagna","clic_ads","pagina")
);
--> statement-breakpoint
-- I valori arrivano dall'indirizzo, cioè da chiunque: la rotta li ripulisce, e il database
-- lo pretende lo stesso. Una riga con dentro un testo lungo un megabyte non deve poter
-- esistere nemmeno se la rotta un giorno sbagliasse.
ALTER TABLE "arrivo_campagna" ADD CONSTRAINT "arrivo_campagna_valori_ck" CHECK (
	char_length("sorgente") BETWEEN 1 AND 60
	AND char_length("mezzo") BETWEEN 1 AND 60
	AND char_length("campagna") BETWEEN 1 AND 80
	AND char_length("pagina") BETWEEN 1 AND 120
	AND "conteggio" > 0
);
--> statement-breakpoint
-- Non è una tabella di uno studio: non ha organizzazione, come `rate_limit`. La scrive la
-- rotta pubblica degli arrivi, che non ha sessione, e la legge solo la pagina dello staff.
-- Senza questa policy, con RLS forzata, in produzione (`app_rls`) ogni conteggio fallirebbe.
ALTER TABLE "arrivo_campagna" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "arrivo_campagna" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "arrivo_campagna_passthrough" ON "arrivo_campagna" FOR ALL TO app_rls
  USING (true) WITH CHECK (true);
