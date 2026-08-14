# PRE-LAUNCH — EvalisDeck

Lista di controllo per il primo cliente pagante. Ogni voce ha un **modo di verificarla**:
una spunta senza verifica non vale, perché la maggior parte di questi guasti non si vede
finché non è tardi (un allarme muto ha lo stesso aspetto di un allarme che non è mai
scattato).

Legenda: `[x]` fatto **e verificato** · `[~]` fatto ma verificato solo in modalità di prova ·
`[ ]` da fare · 🔒 dipende dal committente.

Aggiornato al **2026-08-14**.

## Che cosa blocca cosa

Niente di quello che resta blocca lo sviluppo: si puo' continuare a costruire senza
toccare nessuna di queste voci. Ma tre non hanno una data, hanno un **innesco**, e
l'innesco e' sempre lo stesso: **la prima persona vera che paga**. Scritto qui perche'
un elenco piatto di caselle non dice quando una casella diventa urgente.

| Quando | Che cosa | Perche' proprio allora |
|---|---|---|
| **Prima che chiunque paghi** | Dati del titolare nei documenti legali (P. IVA, sede, PEC) | Vendere a un'azienda con l'identificazione incompleta in privacy e termini e' un'esposizione legale, non un dettaglio estetico. Sono cinque minuti, e sono **dati che solo il committente ha**. |
| **Prima che chiunque paghi** | Un acquisto vero, poi rimborsato | La catena viva — chiavi vive, webhook vivo, fattura vera — non e' mai stata percorsa da capo a fondo. Se qualcosa e' configurato diversamente in modalita' viva, lo scopre il primo cliente. Costa **6 euro** e mezz'ora. |
| **Prima che paghi il SECONDO** | Database di produzione separato | Rimandarlo dopo il primo cliente significa migrare dati di qualcuno mentre li usa. Finche' i clienti sono zero, il costo del cambio e' zero. |
| **Dal primo cliente in poi** | Backup con restore provato · canali di allarme | Oggi non c'e' niente da perdere e niente da sorvegliare. Dal primo cliente ci sono entrambe le cose, e un backup mai ripristinato non e' un backup. |
| **Quando si vuole** | Pulizia dei clienti Stripe di collaudo · HSTS preload · CSP senza `'unsafe-inline'` | Nessun rischio nel rimandarle. Le ultime due sono **decisioni**, non arretrati: `preload` e' quasi irreversibile, e il nonce costerebbe la staticita' di home e blog. |


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
- [x] **Passaggio anno 1 → rinnovo con test clock** — fatto il 2026-08-14
      → *verifica:* `qa -- rinnovo` — 8 su 8. Non e' una simulazione nostra: si crea
        l'abbonamento su un **orologio di prova** di Stripe, si sposta il tempo di un anno
        e un giorno, ed e' Stripe a far scattare il rinnovo. Il piano passa al prezzo
        ridotto, le estensioni si portano dietro il proprio, lo Schedule si stacca
        (`end_behavior: release`) e l'account resta **attivo**: `subscription_schedule.released`
        non e' una disdetta, e ora si sa perche' invece di dedurlo.
      → *provato rompendolo:* rimettendo il difetto della fase 2 il collaudo diventa rosso
        su quattro asserzioni, e mostra il danno vero — gli accessi extra tornano a **zero**
        e il cliente verrebbe fatturato 1.100 € invece di 2.225 €

## 2. Email

- [x] 🔒 **Account Resend** creato, dominio `evalisdeck.it` verificato
- [x] `RESEND_API_KEY` e `RESEND_FROM` in produzione
      → *verifica:* registrazione reale → l'email di verifica arriva
- [x] **Verifica dell'indirizzo attivata**
      → *verifica:* un account non verificato non accede
- [x] **Recupero password** end-to-end
      → *verifica:* `qa -- recupero-password` — 8 su 8: richiesta → gettone → nuova
        password → accesso → **la vecchia smette di funzionare** → il gettone non si riusa
- [x] **Invito a un collega** end-to-end — fatto il 2026-08-14
      → *e non funzionava*: `/accept-invitation/<id>`, l'indirizzo scritto nell'email,
        rispondeva **404 in produzione**. La pagina non esisteva. Il retro era pronto e
        ben fatto; mancava la porta, e nessuno se n'era accorto perche' il collaudo si
        fermava a «l'invito parte».
      → *verifica:* `qa -- invito` — 14 su 14, in produzione. Invito, collegamento vero
        preso dal database, iscrizione con l'indirizzo bloccato, conferma, accesso,
        accettazione, **appartenenza letta nel database**, posto occupato. Piu' i modi di
        sbagliare: invito inventato, riaperto due volte, estraneo con la sessione aperta,
        scaduto. Ogni divieto e' provato sulla riga che non compare, non sul messaggio.

## 3. Dati e ambiente di produzione

- [ ] ⚠️ 🔒 **Progetto Supabase di produzione separato**
      → *verifica:* `DATABASE_URL` di produzione ≠ quello locale. **Oggi sono lo stesso**:
        i dati di un cliente vero starebbero accanto a ~130 organizzazioni di collaudo, e
        ogni script di pulizia diventa pericoloso
- [x] ⚠️ 🔒 **La connessione dell'app è `app_rls`, non privilegiata** — fatto il 2026-08-14
      → *era il rilievo critico C1, ed era vero*: il ruolo `app_rls` esisteva dalla Fase 1
        con 127 policy addosso, ma **non aveva il permesso di connettersi**, quindi la
        produzione girava come `postgres` e le policy non sono mai scattate. Undici punti
        del codice interrogavano il database fuori da `withTenant` e avrebbero smesso di
        funzionare al cambio — fra questi `stripe_customer`: **nessuno avrebbe più potuto
        pagare**. Sistemati prima, poi acceso.
      → *verifica, e non si deduce dal valore nascosto su Vercel:* si chiede al database
        chi è connesso (`pg_stat_activity`), e poi si prova l'isolamento sul campo —
        `app_rls` senza contesto di tenant vede **0** aziende su 327; nel contesto di uno
        studio vede esattamente le sue e **zero** di altri
- [x] **Migrazioni applicate** in produzione (fino alla `0015`)
- [x] **Seed dei cataloghi** eseguito
      → *verifica:* `seed-counts.db.test.ts` verde
- [x] **Le policy reggono col ruolo ristretto**
      → *verifica:* `RLS_FORCE_ROLE=app_rls npm run test` — 531 test verdi
      → e ora non è più solo una prova di laboratorio: **è così che gira la produzione**
- [ ] **Backup automatici attivi** e restore **provato davvero**
      → *verifica:* ripristinare su un progetto vuoto e contare le righe. Un backup mai
        ripristinato non è un backup, è una speranza

### Pulizia della codebase del 2026-08-14

Scansione per codice morto. La codebase e' risultata pulita (zero `TODO`, zero
`@ts-ignore`, zero `any` applicativo, nessuna dipendenza inutile), ma la ricerca ha
trovato **tre cose che mancavano**, tutte gia' chiuse:

- [x] **Il contenitore dei messaggi non era montato.** Sette componenti mostravano
      conferme ed errori che nessuno vedeva, e la spia rossa dei collaudi — una delle tre
      di ogni gesto — non poteva accendersi.
      → *verifica:* provato nei due versi (un salvataggio riuscito mostra il messaggio,
        uno fatto fallire accende la spia) e riconfermato **in produzione**.
- [x] **`shadcn` era in `devDependencies`** ma il CSS di produzione la importa.
      → *verifica:* `npm ci --omit=dev` la installa.
- [x] **`NEXT_PUBLIC_SENTRY_DSN` e `BLOG_ALLARME_A`** fuori dalla validazione, e
      `.env.example` con quattro delle sei obbligatorie in produzione.

## 4. Sicurezza

### Audit di sicurezza del 2026-08-14 — chiuso

Ricognizione su tutta la codebase, con ogni rilievo grave riverificato a mano prima di
finire nel referto: **2 critici, 2 alti, 4 medi, 12 bassi**. Tutti chiusi tranne due, e
i due sono decisioni, non dimenticanze.

- [x] **C1 — RLS inerte in produzione.** Vedi sopra: era vero, ed era il piu' grave.
- [x] **C2 — path traversal nella chiave d'archivio.** `templateKey` arriva dal client e
      finiva dentro il percorso: `../../_piattaforma/onboarding/benvenuto-v1` sovrascriveva
      il video che vede ogni nuovo cliente, e bastava un conto di **prova**.
      → *verifica:* `storage-perimetro-pure` e `storage-traversal.db` — quest'ultimo prova
        la catena attraverso le funzioni vere e conta le righe nel database.
- [x] **H1 — l'SVG passava per immagine.** Il tipo lo dichiarava il browser; ora si
      guardano i primi byte, e l'estensione viene dalla whitelist.
- [x] **H2 — la SoA si affidava alle sole policy.** Dodici punti, non i tre segnalati.
      → *verifica:* `soa-confine-tenant.db` gira con la connessione **privilegiata**, cioe'
        senza l'aiuto di RLS: e' l'unico modo di misurare lo strato applicativo da solo.
- [x] **M1, M2 — errori che raccontavano l'interno.** Rotta PDF (messaggio grezzo ed
      elenco del filesystem) e catch-all delle server action.
- [x] **M3 — dati strutturati** che un titolo del CMS poteva chiudere.
- [x] **M4 — password di collaudo** pubblicata nel repository, su conti creati in
      produzione.
- [x] **L1-L10, L12.** Fra questi L8, che stamattina ha cambiato gravita': il registro si
      poteva intestare a un altro studio, e con RLS acceso quella policy e' l'unica cosa
      che decide (migrazione `0015`).
- [ ] **L11 — `'unsafe-inline'` nella CSP.** Fuori perimetro per **decisione**: toglierlo
      richiede un nonce per richiesta, cioe' rendere dinamiche home, blog e articoli.
      Sarebbe buttare via la staticita' riconquistata correggendo il 500 sul primo
      articolo. Da decidere insieme, non da rimediare di nascosto.
- [x] **L7 era un falso positivo**, ed e' scritto qui perche' non venga "corretto" in
      futuro: il nostro ordine di risoluzione dell'organizzazione e' identico a quello del
      plugin di Better Auth. Invertirlo introdurrebbe il difetto che il rilievo temeva.


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
- [ ] **Un acquisto vero, poi rimborsato** — pronto da eseguire, serve solo il via
      → *come:* `STRIPE_SECRET_KEY=<chiave viva> node scripts/crea-buono-collaudo.mjs --applica`
        crea un buono al **99%, una volta sola, scadenza 7 giorni**. Alla cassa si scrive
        il codice e si paga **6 € invece di 600** — dagli stessi prezzi, dallo stesso
        webhook, dallo stesso Schedule. Provato in modalità di prova: `qa -- buono` 5 su 5
      → *verifica:* l'account passa ad `active` da solo, la fattura esce, arriva l'email di
        benvenuto, la fase 2 dello Schedule è a **prezzo pieno** (il buono vale una volta
        sola). Poi si rimborsa e si disattiva il codice
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
   mai stata percorsa da capo a fondo. **Costa 6 €**, non 600: il buono di collaudo al 99%
   è pronto (`scripts/crea-buono-collaudo.mjs`), e passa dagli stessi prezzi che venderai.
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
