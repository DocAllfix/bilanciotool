CREATE TABLE "document_codice" (
	"codice" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"emittente" text NOT NULL,
	"azienda" text NOT NULL,
	"tipo" text NOT NULL,
	"anno" integer NOT NULL,
	"versione" integer NOT NULL,
	"pubblicato_il" timestamp with time zone DEFAULT now() NOT NULL,
	"verifiche" integer DEFAULT 0 NOT NULL,
	"ultima_verifica" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "document_codice" ADD CONSTRAINT "document_codice_snapshot_id_document_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."document_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_codice" ADD CONSTRAINT "document_codice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_codice_snapshot_uq" ON "document_codice" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "document_codice_org_idx" ON "document_codice" USING btree ("organization_id");