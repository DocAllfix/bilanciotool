-- Il numero di fascicolo diventa un contatore, e smette di poter tornare indietro.
--
-- ⚠️ Prima si calcolava `max(numero) + 1`. Regge finché si cancella un fascicolo in
-- mezzo, e cede sull'ultimo: eliminato il più alto, il massimo scende e il numero
-- successivo RIUSA quello appena liberato. I registri delle ritorsioni, degli accessi e
-- degli eventi di riservatezza rimandano al fascicolo per numero — il «2» nuovo
-- erediterebbe in silenzio i rimandi del «2» cancellato.
--
-- Il vincolo di unicità non poteva accorgersene: la riga vecchia non esiste più, quindi
-- non c'è nessun conflitto da rilevare. È il motivo per cui il difetto è passato sotto
-- il test su database (che cancellava un fascicolo in mezzo) e l'ha trovato il collaudo
-- dell'interfaccia, che ha cancellato l'ultimo.
--
-- Il contatore parte dal massimo già assegnato, così i fascicoli esistenti non cambiano
-- numero e il prossimo non collide con nessuno.

ALTER TABLE "wb_system" ADD COLUMN "ultimo_numero" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

UPDATE "wb_system" s
   SET "ultimo_numero" = COALESCE((SELECT max(r."numero") FROM "wb_report" r WHERE r."system_id" = s."id"), 0);
--> statement-breakpoint

-- Un contatore che scendesse sarebbe peggio di nessun contatore: rimetterebbe il difetto
-- dandogli l'aria di essere stato risolto.
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_ultimo_numero_ck"
  CHECK ("ultimo_numero" >= 0);
