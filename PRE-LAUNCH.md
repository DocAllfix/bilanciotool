# PRE-LAUNCH — EvalisDeck

Lista di controllo per il primo cliente pagante. Ogni voce ha un **modo di verificarla**:
una spunta senza verifica non vale, perché la maggior parte di questi guasti non si vede
finché non è tardi (un allarme muto ha lo stesso aspetto di un allarme che non è mai
scattato).

Legenda: `[x]` fatto **e verificato** · `[~]` fatto ma verificato solo in modalità di prova ·
`[ ]` da fare · 🔒 dipende dal committente.

Aggiornato al **2026-08-15**.

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
| **Quando si vuole** | Gli otto miglioramenti rimandati, in fondo a questo documento | Nessuno blocca niente. Il primo — il secondo strato di tenant negli altri quattro moduli — e' l'unico che riguarda la sicurezza, ed e' anche il piu' prezioso. |


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
- [x] **Un secondo abbonamento non si apre** — chiuso il 2026-08-15
      → *il difetto:* a chi aveva già pagato l'interfaccia proponeva gli altri piani, e quel
        comando apriva una sessione di checkout sullo stesso cliente. Due abbonamenti
        annuali attivi, uno solo visibile, e **nessuna via d'uscita**: il portale ha
        disdetta e cambio piano spenti di proposito
      → *verifica:* `bloccoAlCheckout` rifiuta **lato server**, prima di qualunque chiamata a
        Stripe. Cinque prove sul database, e messe in rosso di proposito togliendo la guardia
      → *stato reale al momento della correzione:* 8 abbonamenti su 8 organizzazioni
        distinte, **nessuna con più di uno**. Non aveva ancora morso
- [x] **Un pagamento non sparisce se il processo muore a metà** — chiuso il 2026-08-15
      → *il difetto:* il claim si rilasciava solo nel `catch`, che non intercetta il timeout
        della funzione. La riga restava, Stripe riceveva `200 «già processato»` e smetteva
        di ritentare: **un cliente che ha pagato restava bloccato, con 200 ovunque e nessun
        errore in nessun log**
      → *verifica:* `billing-claim-morto.db.test.ts` — 6 prove, compreso che un evento
        **completato** non si riprocessa mai per quanto vecchio, e che un claim fresco non
        si ruba. Rimettendo il difetto tornano rosse
- [x] **Registro delle capacità** append-only (`entitlement_event`, migrazione `0017`)
      → *verifica:* immutabilità provata **anche con la connessione privilegiata** — trigger,
        revoca e policy, i tre pezzi di `document_snapshot` e non uno solo
      → *conseguenza:* il recesso a quattordici giorni **promesso dai Termini** non si riapre
        più da solo a ogni rinnovo annuale
      → *resta da fare, non urgente:* travasare le 58 righe di `audit_log` degli abbonamenti
        già attivati. Finché non si fa, la storia comincia il 2026-08-15

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
3. **I dati del titolare nei documenti legali** (P. IVA, sede, PEC). Vendere a un'azienda
   con l'identificazione incompleta in privacy e termini è un'esposizione legale, non un
   dettaglio estetico. Sono cinque minuti, e sono **dati che ha solo il committente**.

   *(L'invito a un collega era la terza voce di questo elenco. Chiuso il 14 agosto: la
   pagina di accettazione non esisteva e rispondeva 404 — vedi §2.)*

E una decisione, non un lavoro: **chi emette le fatture.** Stripe incassa e raccoglie i
dati fiscali, ma nessuno le emette.

---

## Debiti aperti dichiarati

Non bloccano il lancio, ma vanno saputi.

0. ⚠️ **Il portafoglio non si aggiorna dopo aver creato un'azienda, nel build di
   produzione.** Misurato il 22 agosto 2026 su `next start`, che e' lo stesso build che
   gira su Vercel. La riga viene scritta, il dialogo si chiude, e l'elenco resta quello di
   prima: l'azienda compare solo ricaricando la pagina a mano.
   - **Che cosa e' stato escluso, misurando**: la richiesta di aggiornamento parte davvero
     (`GET /dashboard?_rsc=…`, non un prefetch, con l'albero di stato in intestazione) e il
     server risponde col dato giusto (58 KB che contengono il nome nuovo). E' il client a
     non applicarlo. Non e' «indietro di un aggiornamento»: creando una seconda azienda non
     compare nemmeno la prima, e una sonda ha atteso **sessanta secondi**. Non e' l'ordine
     fra chiusura del dialogo e aggiornamento (invertito: identico), non e' `startTransition`
     (provato: identico), non e' la cache statica (`/dashboard` e' dinamica, `staleTimes`
     e' a zero ed e' riconosciuta dal build). Con `npm run dev` l'elenco si aggiorna in ~3 s.
   - **Impatto sul cliente**: crea un'azienda, non la vede, e la ricrea. Nessun messaggio,
     nessun errore in console, nessuna richiesta fallita.
   - **Non e' stato verificato in produzione** perche' provarlo significa scrivere
     un'azienda vera nel database che incassa. Una nota in `visual-check-energetico.mjs`
     dichiarava che in produzione l'elenco si aggiorna: **quella nota aveva il verso
     sbagliato** (dava la colpa a `next start` come «server di prova», mentre e' proprio il
     build di produzione) e non risulta verificata da chi l'ha scritta.
   - **Intanto** i collaudi usano `attendiCard` (`scripts/comune-collaudo.mjs`), che ricarica
     finche' la card non c'e': misurano il percorso, non l'artefatto.

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
7. **`@vitest/coverage-v8`** è l'unico pacchetto senza alcun riferimento versionato:
   nessun blocco `coverage` in `vitest.config.ts`, nessuno script che passi `--coverage`.
   La cartella `coverage/` dice che qualcuno l'ha lanciato a mano. O si aggiunge un
   comando che lo usi, o si toglie: oggi è uno strumento che nessuno sa di avere.
8. 🔒 **`.env.prima-del-cambio-password`** è fermo sul disco del committente dal 7 agosto.
   Non è mai finito in git (`.env*` lo ignora) e **non è stato aperto**, ma è un file di
   credenziali storiche: se quelle password non servono più, va cancellato.
9. **`SENTRY_AUTH_TOKEN` non è documentato da nessuna parte.** Serve al build per caricare
   le source map e vive solo nel pannello Vercel. Se sparisce il build **riesce lo
   stesso**, e gli stack trace in produzione diventano illeggibili: il guasto silenzioso
   che tutto il resto del monitoraggio è costruito per evitare.

---

## Miglioramenti rimandati, con il vantaggio di ciascuno

Dalla passata DRY del 2026-08-14. **Nessuno blocca niente**: si può continuare a costruire
senza toccarne uno. Sono scritti qui perché la ragione per farli un giorno non è «codice
più pulito» ma una cosa concreta che oggi non si può fare, e quella si dimentica.

Ordinati per valore reale, che non coincide con le righe risparmiate.

### 1. 🔒 Il secondo strato di tenant negli altri quattro moduli — **il più prezioso**
*~60-90 righe · rischio medio*

`soa/declarations.ts` è **l'unico** modulo con il doppio strato (filtro `organizationId`
esplicito **e** RLS). Ghg, energy, report e supplier filtrano quasi solo per `id`. Il
commento in `soa/declarations.ts:20-31` dice che è una correzione: non è mai stata
propagata. La verifica esiste in quattro forme con dodici messaggi diversi, e questo rende
impossibile leggere a colpo d'occhio chi ha due strati e chi uno.

→ *Comprerebbe:* che una policy RLS dimenticata su una tabella nuova non diventi
un'esposizione. È lo scenario del 14 agosto, quando si scoprì che le policy non
scattavano affatto: l'unica difesa rimasta era il filtro applicativo, e in quattro moduli
su cinque non c'era.

### 2. Una sola strozzatura per le mutazioni
*~250-320 righe · rischio medio-alto*

`requireEntitlement → parse → withTenant → verifica → scrittura → logAudit` in ~55 funzioni.

→ *Comprerebbe:* che una regola nuova si applichi **una volta invece di cinquantacinque**.
È servito tre volte in due giorni — l'entitlement mancante su `archiveCompany`, `export`
sul collegamento cliente, il filtro tenant sulla SoA — e ogni volta è stato un giro a mano
su decine di punti, col rischio di saltarne uno.

→ *Perché non ora:* le 88 etichette d'audit sono stringhe di dominio, e il rischio concreto
è che il default diventi «rivalida sempre», cancellando le eccezioni deliberate di
energy/soa/supplier.

### 3. I 21 collaudi che si sono riscritti il contatore
*~145 righe · rischio alto, ma è il rischio giusto*

`contatore()` guarda **tre spie** (errori di console, HTTP ≥ 400, avvisi rossi); il `check`
locale di quei 21 script considera riuscito tutto ciò che non lancia un'eccezione.

→ *Comprerebbe:* ventuno collaudi che smettono di dire verde quando la pagina ha un errore
di console o una richiesta fallita.

→ *Perché non ora:* migrare **irrigidisce**, non accorpa. Alcuni verdi diventerebbero rossi
e vanno guardati uno per uno: è lavoro di misura, non di refactoring.

### 4. I valori golden in un posto solo
*~0 righe · rischio nullo*

`0.2565` compare in 13 file, `1.9755` in 15, `25.65` in 11. Solo `ghg-flow.db.test.ts:86`
dichiara la catena; negli altri è un numero magico che nessun commento collega al seed.

→ *Comprerebbe:* il giorno in cui ISPRA aggiorna un fattore — e succederà — si cambia **un
numero invece di quindici file**, senza accorgersi dell'ultimo dal rosso.

### 5. La barra dei passi e l'intestazione di modulo
*~160 righe · rischio basso · il maggior risparmio di righe*

Cinque copie; le tre dello stepper sono identiche carattere per carattere.

→ *Comprerebbe:* un ritocco alla navigazione dei percorsi fatto una volta sola.
→ *Attenzione:* i `data-tour` sono agganci del giro guidato (si passano come prefisso, non
si deducono) e `pctPasso` di `report-wizard.tsx:44` è logica GRI, non presentazione.

### 6. Il preambolo di test e collaudi
*~85 righe negli e2e, ~135 nel boot dei collaudi · rischio basso-medio*

Cinque spec e2e ripetono 22 righe; 24 script ripetono il boot del browser in **cinque
varianti incompatibili** della stessa intenzione (chi spegne sei tour, chi tre, chi lo fa
dopo il login con un commento che ammette di essere una corsa).

→ *Comprerebbe:* che un collaudo nuovo nasca già con le impostazioni giuste. Oggi chi ne
scrive uno copia quello accanto, **e copia anche la variante sbagliata**.
→ *Da escludere:* `verifica-benvenuto`, che collauda proprio i tour.

### 7. Le cose piccole
- `updateProfilo` (4 cloni) e `profiloCompilati` (3 copie identiche): ~45 righe.
- `ricalcola()` (8 copie) e i preamboli delle cinque `getXData`: ~60-80 righe.
- **`confirm()` nativo** in `ghg/passo-dati.tsx:213`, `ghg/passo-obiettivi.tsx:155`,
  `report/passo-racconto.tsx:167`. Non è duplicazione, è **incoerenza**:
  `portfolio/azienda-azioni.tsx:18` porta un commento che dice di essere stato l'ultimo a
  uscirne. Questi tre sono rimasti indietro, e su alcuni browser `confirm()`/`alert()`
  vengono soppressi.
- `postgres(...)` con due configurazioni arbitrarie; `viewport` con **dodici valori
  distinti** fra i collaudi.
- Dodici script ricalcolano `orgId` mentre `registraEEntra` lo restituisce già. Non è
  meccanico (alcuni leggono anche `user_id`, con nomi diversi): la nota che impedisce al
  prossimo di copiare l'abitudine è già in `comune-registrazione.mjs`.

### 8. Difetti trovati misurando, che NON sono lavoro di DRY
- **`report/chapters.ts:105`** calcola la posizione di un media come `esistenti.length`
  invece di `max+1`: dopo una cancellazione in mezzo **genera posizioni duplicate**. Tocca
  l'ordine dei media in documenti **già pubblicati**: va deciso, non corretto di slancio.
- **La rivalidazione divergente**: `report` e `ghg` rivalidano a ogni azione, `energy`,
  `soa` e `supplier` no, con commenti che quantificano il motivo. Non è una svista: è la
  lezione dei moduli nuovi non tornata indietro sui due vecchi.
- **Tre comandi ottimistici senza ripristino** (`soa/vista-piano.tsx`,
  `supplier/vista-piano.tsx`, `energy/passo-interventi.tsx`) e uno che ripristina solo
  metà dello stato (`energy/passo-usi.tsx`: ripristina `attivo`, non `metodo`). Sembrano
  omissioni più che scelte: **da verificare come possibili difetti**.
