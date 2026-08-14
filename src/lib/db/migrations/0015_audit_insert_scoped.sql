-- L'audit non si puo' piu' intestare a un'organizzazione qualunque.
--
-- La policy era `WITH CHECK (true)`: con la connessione dell'applicazione si poteva
-- inserire una riga di registro con QUALUNQUE `organization_id`. Il registro e' la
-- risposta alla domanda «chi ha fatto cosa», e un registro in cui si puo' scrivere a
-- nome di un altro studio non risponde piu' a quella domanda. Fino a stamattina il
-- punto era teorico, perche' in produzione la connessione bypassava RLS del tutto;
-- da quando gira come `app_rls` questa policy e' l'unica cosa che decide.
--
-- La ragione del `true` sta nel commento della 0001: «INSERT libero dal contesto app
-- (best-effort, non deve bloccare login)». Il timore era che una scrittura di registro
-- senza contesto facesse fallire l'accesso. Verificato prima di stringere, e non e'
-- cosi': tutte e 61 le chiamate a `logAudit` ricevono il `tx` di un `withTenant`, che
-- imposta sempre `app.org_id` oppure `app.platform_admin`. Le 2.473 righe gia' in
-- tabella hanno tutte un'organizzazione, nessuna esclusa.
--
-- Il ramo `platform_admin` non e' una scappatoia: e' il webhook di Stripe, che non ha
-- sessione e nemmeno organizzazione attiva finche' non l'ha risolta dal cliente. Senza
-- quel ramo l'attivazione di un abbonamento fallirebbe sull'ultima riga, dopo che il
-- pagamento e' gia' andato a buon fine.
--
-- UPDATE e DELETE restano revocati a livello di grant dalla 0001: il registro e'
-- append-only, e questa migrazione non lo cambia.

DROP POLICY IF EXISTS audit_log_insert_rls ON audit_log;
--> statement-breakpoint
CREATE POLICY audit_log_insert_rls ON audit_log FOR INSERT TO app_rls
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
