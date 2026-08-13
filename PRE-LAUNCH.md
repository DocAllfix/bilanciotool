# PRE-LAUNCH — EvalisDeck

Lista di controllo per il primo cliente pagante. Ogni voce ha un **modo di verificarla**:
una spunta senza verifica non vale, perché la maggior parte di questi guasti non si vede
finché non è tardi (un allarme muto ha lo stesso aspetto di un allarme che non è mai
scattato).

Legenda: `[x]` fatto **e verificato** · `[~]` fatto ma verificato solo in modalità di prova ·
`[ ]` da fare · 🔒 dipende dal committente.

Aggiornato al **2026-08-13**.

> **Risposta breve alla domanda «si può vendere?»**
> Il sistema **incassa già**: Stripe è in modalità viva e la pagina di pagamento accetta
> carta, Satispay, Klarna e Amazon Pay. Il prodotto funziona in ogni sua parte, provato
> comando per comando contro la produzione.
> Restano **tre cose che riguardano il primo cliente vero**, elencate in fondo. Nessuna è
> lunga; tutte e tre sono del tipo che, se salti, se ne accorge il cliente prima di te.

---

## 1. Incasso e attivazione

- [x] 🔒 **Chiavi Stripe TEST** consegnate e in `.env`
      → *verifica:* i test di billing sono verdi
- [x] 🔒 **Attivazione business Stripe** approvata
      → *verifica:* misurata **dal comportamento**, non dal flag: la pagina di pagamento
        viva offre carta, Satispay, Klarna e Amazon Pay, che Stripe non mostra a chi non
        può addebitare
- [x] **Bootstrap dei prezzi** eseguito, idempotente, su prova **e** su vivo
      → *verifica:* rieseguirlo non crea prezzi doppi; i venti `lookup_key` risolvono tutti
- [x] **Checkout** completo, l'account si sblocca da solo
      → *verifica:* `qa -- pagamento` — nessuno tocca il database: l'account passa ad
        `active` solo perché il webhook lo dice
- [x] **Webhook idempotente**: lo stesso evento due volte provisiona una volta sola
      → *verifica:* evento reinviato davvero a Stripe; firma inventata → 400
- [x] **Estensioni acquistabili**, col totale mostrato prima di pagare
      → *verifica:* `qa -- estensioni` — l'importo della sessione Stripe combacia con quello
        mostrato, righe e quantità comprese
- [x] **Le estensioni sopravvivono al rinnovo**
      → *verifica:* `qa -- estensioni` legge la fase 2 **da Stripe**: piano ridotto più le
        estensioni. Rimettendo il difetto il collaudo torna rosso
- [x] **Chiavi live** in produzione
      → *verifica:* la sessione creata dal sito è `cs_live_`
- [ ] **Passaggio anno 1 → rinnovo con test clock**
      → *verifica:* `subscription_schedule.released` **non** deve disattivare l'account.
        È l'unico comportamento del pagamento che nessuno ha ancora visto accadere

## 2. Email

- [x] 🔒 **Account Resend** creato, dominio `evalisdeck.it` verificato
- [x] `RESEND_API_KEY` e `RESEND_FROM` in produzione
      → *verifica:* registrazione reale → l'email di verifica arriva
- [x] **Verifica dell'indirizzo attivata**
      → *verifica:* un account non verificato non accede
- [x] **Recupero password** end-to-end
      → *verifica:* `qa -- recupero-password` — 8 su 8: richiesta → gettone → nuova
        password → accesso → **la vecchia smette di funzionare** → il gettone non si riusa
- [ ] **Invito a un collega** end-to-end
      → *verifica:* l'invitato **riceve, accetta, entra nello studio che invita e occupa un
        posto**. Oggi è provato solo che l'invito parte: la metà che conta — che si riesca
        a entrare — non l'ha mai fatta nessuno

## 3. Dati e ambiente di produzione

- [ ] ⚠️ 🔒 **Progetto Supabase di produzione separato**
      → *verifica:* `DATABASE_URL` di produzione ≠ quello locale. **Oggi sono lo stesso**:
        i dati di un cliente vero starebbero accanto a ~130 organizzazioni di collaudo, e
        ogni script di pulizia diventa pericoloso
- [ ] ⚠️ 🔒 **La connessione dell'app è `app_rls`, non privilegiata**
      → *verifica:* guarda il valore di `DATABASE_URL` su Vercel: l'utente dev'essere
        `app_rls.<ref>`, non `postgres.<ref>`. **Non è verificabile dall'esterno** e il
        valore è nascosto. Se fosse privilegiata, le policy RLS non scatterebbero mai in
        produzione: resterebbero i filtri applicativi, che ci sono, ma verrebbe a mancare
        il secondo strato — quello che protegge dal difetto che nessuno ha visto
- [x] **Migrazioni applicate** in produzione (fino alla `0014`)
- [x] **Seed dei cataloghi** eseguito
      → *verifica:* `seed-counts.db.test.ts` verde
- [x] **Le policy reggono col ruolo ristretto**
      → *verifica:* `RLS_FORCE_ROLE=app_rls npm run test` — 472 test verdi
- [ ] **Backup automatici attivi** e restore **provato davvero**
      → *verifica:* ripristinare su un progetto vuoto e contare le righe. Un backup mai
        ripristinato non è un backup, è una speranza

## 4. Sicurezza

- [x] **RLS default-deny** su ogni tabella tenant, con test di enumerazione
- [x] **Entitlement su ogni mutazione**
      → *verifica:* `entitlement.db.test.ts`; e il collaudo in produzione prova che un conto
        in prova non crea aziende, non pubblica e non genera collegamenti — **guardando il
        database, non i messaggi**
- [x] **Limite di frequenza** sulle rotte di autenticazione, contatore su database
- [x] **PDF dall'archivio**: Chromium non riparte per un documento già generato
- [x] **Portale cliente**: token con impronta, revoca immediata, `noindex`
- [x] **Sentry** attivo su client, server ed edge
      → *verifica:* errore lanciato apposta e visto arrivare
- [ ] **CSP con nonce**, verificata pagina per pagina
- [ ] **`security-review` finale** sull'intero progetto

## 5. Legale e contenuti

- [x] **Privacy, cookie e termini** pubblicati e coerenti
      → *verifica:* `qa -- tutto-pubblico` — 27 su 27
- [x] **Consenso GA4**: nessuna richiesta a Google prima della scelta
- [x] **Nessun prezzo sulla landing**
- [ ] **Testi legali riletti ora che si incassa davvero**
      → *verifica:* devono dire il vero su pagamento, fatturazione elettronica, rinnovo
        automatico e recesso. La sezione rimborsi cita già il criterio verificabile
- [ ] 🔒 **Dati del titolare** completi nei documenti legali (P. IVA, sede, PEC)
- [ ] 🔒 **Fatturazione elettronica**: Stripe raccoglie partita IVA e codice destinatario,
      ma **nessuno emette la fattura**. Va deciso se collegarci il servizio del committente
      o emetterle a mano

## 6. Prova generale

- [~] **Percorso completo di un cliente**, dalla registrazione al documento consegnato
      → *verifica:* fatto **in modalità di prova**: registrazione → pagamento → azienda →
        cinque percorsi → pubblicazione → PDF → collegamento → il cliente scarica.
        In modalità **viva** non l'ha mai fatto nessuno
- [ ] **Un acquisto vero, poi rimborsato**
      → *verifica:* è l'unica prova che i prezzi vivi, la fattura e il webhook vivo
        funzionino. I prezzi vivi sono oggetti diversi da quelli di prova
- [x] **Collaudi contro la produzione** verdi
      → *verifica:* `tutto-demo` 68, `tutto-attivo` 55, `tutto-pubblico` 27, `benvenuto` 11,
        `demo-completa` 9, `recupero-password` 8
- [ ] **e2e contro la produzione** verdi
- [ ] **Tag `v1.0.0`** sul commit distribuito

## 7. Dopo il lancio

- [ ] **48 ore senza errori nuovi** in Sentry
- [ ] 🔒 **Interruttore dell'uomo morto** (healthchecks.io) sui backup e sul giro quotidiano
- [ ] **Ripulire l'account Stripe vivo** dai clienti creati dai collaudi
      → tutti con email `@example.com`, nessuno ha mai pagato

---

## Le tre cose che restano prima del primo cliente

1. **Un acquisto vero, poi rimborsato.** Tutto il pagamento è provato in modalità di prova.
   I prezzi vivi sono oggetti diversi: finché nessuno paga davvero, la catena viva non è
   mai stata percorsa da capo a fondo.
2. **Il database di produzione separato, con un restore provato.** Oggi i dati di un
   cliente starebbero accanto a centotrenta organizzazioni di collaudo, e il ripristino di
   un backup non è mai stato tentato.
3. **L'invito a un collega, provato fino all'ingresso.** Si sa che l'email parte. Non si sa
   che chi la riceve riesca a entrare — ed è il secondo giorno di lavoro di ogni studio con
   più di una persona.

E una decisione, non un lavoro: **chi emette le fatture.** Stripe incassa e raccoglie i
dati fiscali, ma nessuno le emette.

---

## Debiti aperti dichiarati

Non bloccano il lancio, ma vanno saputi.

1. **Nessun canale di allarme funziona.** Da WordPress non esce posta (`sendmail` assente
   nel contenitore) e sul server del blog manca `RESEND_API_KEY`. I backup del blog girano
   e il restore-test settimanale passa, ma **se smettessero nessuno lo saprebbe**.
2. **26 errori di lint preesistenti.** Per questo il lint non è nel cancello della CI: un
   controllo che nasce rosso diventa rumore.
3. **La CI non esegue il build**: pretende sei variabili di produzione. Il build ha già un
   cancello, che è Vercel.
4. **`export` è una capability senza funzione propria**: protegge il collegamento al
   cliente, ma non esiste ancora un comando «esporta i miei dati».
5. **`user_onboarding` e `company_referent`** sono tabelle create e mai usate.
6. **Le estensioni non si comprano a metà anno**: si scelgono all'acquisto del piano, poi
   si aggiungono scrivendoci. Il flusso a rateo tocca l'abbonamento in corso e non esiste.
