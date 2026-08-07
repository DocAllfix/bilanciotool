# PRE-LAUNCH — EvalisDeck

Lista di controllo per il primo cliente pagante. Ogni voce ha un **modo di verificarla**:
una spunta senza verifica non vale, perché la maggior parte di questi guasti non si vede
finché non è tardi (un allarme muto ha lo stesso aspetto di un allarme che non è mai
scattato).

Legenda: `[x]` fatto **e verificato** · `[ ]` da fare · 🔒 dipende dal committente.

Aggiornato al 2026-08-07.

---

## 1. Incasso e attivazione — BLOCCANTE

Senza questa sezione non esiste un modo per farsi pagare: oggi un account passa da
`demo` ad `active` solo con un `UPDATE` a mano sul database.

- [ ] 🔒 **Chiavi Stripe TEST** consegnate e in `.env`
      → *verifica:* `npm run test` con i test di billing verdi
- [ ] 🔒 **Attivazione business Stripe** avviata (richiede giorni: farlo per primo)
      → *verifica:* nel cruscotto Stripe l'account risulta abilitato ai pagamenti dal vivo
- [ ] **Bootstrap dei prezzi** eseguito in TEST, idempotente
      → *verifica:* rieseguirlo non crea prezzi doppi; i `lookup_key` risolvono tutti
- [ ] **Checkout** completo con carta di prova, l'account si sblocca da solo
      → *verifica:* `4242 4242 4242 4242` → l'account passa ad `active` **senza intervento manuale**
- [ ] **Webhook idempotente**: lo stesso evento due volte provisiona una volta sola
      → *verifica:* `stripe events resend <id>` e la riga di provisioning resta una
- [ ] **Retry dopo fallimento**: un processing fallito rilascia il claim
      → *verifica:* forzare un errore, poi il retry di Stripe deve riuscire
- [ ] **Passaggio anno 1 → rinnovo** con test clock
      → *verifica:* `subscription_schedule.released` **non** deve disattivare l'account
- [ ] **Chiavi live** sostituite in produzione
      → *verifica:* `sk_live` in Vercel, nessuna `sk_test` residua

## 2. Email — BLOCCANTE

Oggi non esce **nessuna** email: niente verifica indirizzo, niente recupero password,
niente inviti ai colleghi. Un utente che sbaglia la password resta fuori per sempre.

- [ ] 🔒 **Account Resend** creato
- [ ] **Dominio `evalisdeck.it` verificato** su Resend (tre record DNS su Vercel)
      → *verifica:* stato «verified» su Resend, e un invio di prova arriva in casella
- [ ] `RESEND_API_KEY` e `RESEND_FROM` in produzione
      → *verifica:* registrazione reale → l'email di verifica arriva davvero
- [ ] **Verifica dell'indirizzo attivata** (`requireEmailVerification: true`)
      → *verifica:* un account non verificato non accede
- [ ] **Recupero password** end-to-end
      → *verifica:* richiesta → email → nuova password → accesso riuscito
- [ ] **Invito a un collega** end-to-end
      → *verifica:* l'invitato riceve, accetta, entra **nello studio che invita** e occupa un posto

## 3. Dati e ambiente di produzione

- [ ] 🔒 **Progetto Supabase di produzione** separato da quello di sviluppo
      → *verifica:* `DATABASE_URL` di produzione ≠ quello locale, e i dati di prova non ci sono
- [ ] **Migrazioni applicate** in produzione (oggi fino alla `0014`)
      → *verifica:* `select count(*) from __drizzle_migrations` combacia coi file in `src/lib/db/migrations/`
- [ ] **Seed dei cataloghi** eseguito
      → *verifica:* `npm run test` con `seed-counts.db.test.ts` verde contro la produzione
- [ ] **Connessione applicativa come `app_rls`**, non privilegiata
      → *verifica:* è la prova più importante di tutte. In sviluppo la connessione è
        privilegiata e **le policy non scattano**: un difetto di isolamento non si vede.
        `RLS_FORCE_ROLE=app_rls npm run test` deve restare verde
- [ ] **Backup automatici attivi** e restore **provato davvero**
      → *verifica:* ripristinare su un progetto vuoto e contare le righe. Un backup mai
        ripristinato non è un backup, è una speranza

## 4. Sicurezza

- [x] **RLS default-deny** su ogni tabella tenant, con test di enumerazione
      → *verifica:* `rls-matrix.db.test.ts` — una tabella nuova senza policy fa fallire la suite
- [x] **Entitlement su ogni mutazione** (`requireEntitlement`)
      → *verifica:* `entitlement.db.test.ts`; un account `expired` non scrive
- [x] **Limite di frequenza** sulle rotte di autenticazione, contatore su database
      → *verifica:* `npm run qa -- limiti` — dieci accessi sbagliati, poi 429
- [x] **PDF dall'archivio**: Chromium non riparte per un documento già generato
      → *verifica:* `npm run qa -- pdf-archivio` — la seconda richiesta è un 302
- [x] **Portale cliente**: token con impronta, revoca immediata, `noindex`
      → *verifica:* `npm run qa -- condivisione`
- [ ] **Sentry** attivo su client, server ed edge
      → *verifica:* lanciare un errore apposta e vederlo comparire
- [ ] **CSP con nonce**, verificata pagina per pagina
      → *verifica:* zero violazioni in console su tutte le pagine, comprese quelle del documento
- [ ] **`security-review` finale** sull'intero progetto
      → *verifica:* nessun rilievo alto o medio aperto

## 5. Legale e contenuti

- [x] **Privacy, cookie e termini** pubblicati e coerenti con ciò che il prodotto fa
      → *verifica:* `npm run qa -- legale`
- [x] **Consenso GA4**: nessuna richiesta a Google prima della scelta
      → *verifica:* `npm run qa -- consenso` — misura le richieste di rete vere
- [x] **Nessun prezzo sulla landing** (decisione del committente)
      → *verifica:* `npm run qa -- landing`
- [ ] **Testi legali riletti** dopo l'accensione di Stripe: compaiono pagamenti, fatturazione e recesso
      → *verifica:* la sezione rimborsi cita il criterio vero (nessun documento pubblicato entro 14 giorni)
- [ ] 🔒 **Dati del titolare** completi nei documenti legali (P. IVA, sede, PEC)

## 6. Prova generale

- [ ] **Percorso completo di un cliente vero**, dalla registrazione al documento consegnato
      → *verifica:* registrazione → pagamento reale → azienda → percorso → pubblicazione →
        PDF → collegamento al cliente → il cliente scarica. Poi **rimborsare** il pagamento
- [ ] **e2e contro la produzione** verdi
      → *verifica:* `BASE=https://evalisdeck.it npm run test:e2e`
- [ ] **Collaudi visivi** contro la produzione
      → *verifica:* `npm run qa -- landing --prod`, `legale --prod`, `sitemap --prod`
- [ ] **Tag `v1.0.0`** sul commit distribuito

## 7. Dopo il lancio

- [ ] **48 ore senza errori nuovi** in Sentry
- [ ] 🔒 **Interruttore dell'uomo morto** (healthchecks.io) sui backup e sul giro quotidiano
      → *verifica:* spegnere lo script di proposito e ricevere l'allarme. Migliore
        dell'email perché intercetta anche «non è mai partito»
- [ ] **Primo cliente contattato** dopo il primo documento pubblicato

---

## Debiti aperti dichiarati

Non bloccano il lancio, ma vanno saputi.

1. **Nessun canale di allarme funziona.** Da WordPress non esce posta (`sendmail` assente
   nel contenitore) e `RESEND_API_KEY` manca sia sul server sia su Vercel. I backup del
   blog girano e il restore-test settimanale passa, ma **se smettessero nessuno lo saprebbe**.
2. **26 errori di lint preesistenti** (19 componenti definiti dentro il render nei template
   documento, 5 `setState` dentro effetti, 2 riassegnazioni dopo il render). Per questo il
   lint non è ancora nel cancello della CI: un controllo che nasce rosso diventa rumore.
3. **La CI non esegue il build**: pretende sei variabili di produzione, e metterci le
   credenziali vere significherebbe esporre il database a ogni workflow. Il build ha già un
   cancello: Vercel.
4. **`export` è una capability senza funzione**: è nella matrice dei permessi e nei testi
   legali, ma nessuna funzione di esportazione esiste ancora.
5. **`user_onboarding` e `company_referent`** sono tabelle create e mai usate.
