-- Il contatore delle verifiche passa da una funzione, non da una policy larga.
--
-- ⚠️ La 0043 dava ad `app_rls` un UPDATE con `USING (true) WITH CHECK (true)`, perche' la
-- pagina pubblica incrementa il contatore senza nessuna organizzazione nel contesto. Le
-- colonne che descrivono il documento erano protette da un trigger, quindi il danno era
-- limitato — ma una policy che accetta QUALUNQUE riga resta una policy che accetta
-- qualunque riga, e `rls-policy-sorgente-pure.test.ts` l'ha segnalata. Aveva ragione: il
-- rimedio giusto non e' dichiarare un'eccezione, e' togliere il permesso largo.
--
-- Qui l'UPDATE si revoca del tutto e resta una funzione sola, che fa una cosa sola:
-- aggiungere uno al contatore di UN codice. Non puo' toccare altre colonne perche' non le
-- nomina, e non puo' toccare altre righe perche' la chiave e' il suo unico argomento.

DROP POLICY IF EXISTS "document_codice_touch" ON "document_codice";
--> statement-breakpoint

-- SECURITY DEFINER: gira coi privilegi del proprietario, quindi non le serve una policy.
-- `search_path` fissato: senza, chi puo' creare oggetti in uno schema di ricerca potrebbe
-- far risolvere `document_codice` a una tabella sua.
CREATE OR REPLACE FUNCTION document_codice_conta(p_codice text) RETURNS void AS $$
  UPDATE document_codice
     SET verifiche = verifiche + 1, ultima_verifica = now()
   WHERE codice = p_codice;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;
--> statement-breakpoint

REVOKE ALL ON FUNCTION document_codice_conta(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION document_codice_conta(text) TO app_rls;
