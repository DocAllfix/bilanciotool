# CLAUDE.md - Direttive Operative di Sistema



## 1. Pensa prima di agire



**Non dare per scontato. Non nascondere la confusione. Esponi i compromessi.**



- Dichiara esplicitamente le tue assunzioni. Se una funzionalità, un file o un flusso non ti è chiaro, fermati e chiedi.

- Presenta sempre le alternative architettoniche prima di scrivere codice.



## 2. Semplicità prima di tutto



**Il minimo indispensabile per risolvere il problema. Niente astrazioni premature.**



- Scrivi codice pulito, lineare e moderno. Evita l'over-engineering se non porta un reale valore dimostrabile.



## 3. Modifiche chirurgiche



**Tocca solo ciò che devi. Pulisci solo il tuo disordine.**



- Quando scriveremo codice, modificherai esclusivamente i file necessari. Nessun refactoring a cascata non richiesto.



## 4. Esecuzione guidata da obiettivi



**Definisci criteri di successo verificabili. Itera fino alla verifica.**



- Ogni tuo output deve avere un obiettivo chiaro. Per la fase di analisi, l'obiettivo è una scomposizione totale e analitica degli asset di partenza.



---



## CONTESTO DEL PROGETTO

SaaS su commissione: suite di rendicontazione ESG che unifica i due prototipi HTML in `archivio/` (Inventario GHG ISO 14064-1 + Bilancio di Sostenibilità GRI/ESRS-VSME) in un unico prodotto integrato — l'inventario GHG alimenta la sezione emissioni del bilancio. Analisi completa dei prototipi già svolta (report validato dal committente il 2026-07-29).

### Decisioni consolidate

- **Modello**: multi-studio SaaS pubblico. Tenant = studio di consulenza/azienda che si registra; ogni tenant gestisce un portafoglio di aziende clienti rendicontate. Utenti: consulenti dal giorno 1; invito del referente aziendale (permessi limitati) previsto in architettura, attivato in fase 2.
- **Pricing**: per account/studio, tutto incluso. Prima annualità 400–500 € (include setup), rinnovo automatico dal secondo anno a 100–150 €. Stripe Subscription Schedules (fase 1 a prezzo pieno → fasi successive a prezzo ridotto).
- **Pre-vendita**: demo guidata con organizzazione di esempio pre-compilata (seed nostro) + tour prodotto (driver.js, come in FormazioneEvalis) + video presentazione. Il servizio vero si sblocca solo al pagamento; gating NON aggirabile perché applicato server-side (entitlement check su ogni server action/route + RLS), non client-side.
- **Perimetro V1**: entrambi i moduli integrati. Solo italiano (struttura predisposta i18n, niente traduzioni). **Niente AI per ora**: le funzioni "assistite" (bozze narrative, suggerimenti materialità per ATECO) si fanno rule-based/template-based sui dati strutturati; AI eventualmente in seguito.
- **Stack**: Next.js App Router + TypeScript + Drizzle ORM + PostgreSQL (Supabase) con RLS multi-tenant (pattern `withTenant` GUC da FormazioneEvalis) + Better Auth (organization plugin) + Stripe + Tailwind v4 + shadcn/ui + Resend + Sentry. Hosting: Vercel + Supabase.
- **Repo di riferimento architetturale**: https://github.com/DocAllfix/FormazioneEvalis.git — replicare: route groups, feature folders (`src/features/*`), schema Drizzle per dominio, idempotenza webhook Stripe, audit log append-only. NON replicarne il design (famiglia "Ambra"): questo prodotto ha una direzione visiva propria "Corporate Tech" (base fredda, accento verde petrolio, sans con numeri tabellari per la UI, serif editoriale per il documento).

### Punti fermi di dominio

- Il motore di calcolo dei prototipi (`riga`/`calc`/`derive`/`stato`) è pura logica: portarlo in moduli TypeScript testati (Vitest) prima di qualsiasi UI.
- I contenuti metodologici (6 categorie/25 sorgenti ISO, guide dei 18 temi di materialità, checklist di 15 requisiti, 49 KPI, scale di valutazione, libreria di 59 fattori di emissione) sono dati di seed versionati nel DB, non costanti hardcoded. Conteggi ESATTI verificati dall'estrazione automatica (`scripts/extract-seed.mjs`) e dal test `seed-counts.db.test.ts`.
- I valori derivati non si persistono, si calcolano; il documento pubblicato si congela in uno snapshot (JSONB + PDF) con versioning.
- Quantità e fattori in NUMERIC, mai float. Import JSON dei prototipi mantenuto come percorso di migrazione.

### Regole operative

- **Commit**: sempre con l'author dell'utente (DocAllfix <titolare@esempio.it>), **senza** trailer Co-Authored-By di Claude. Repo GitHub privata: `DocAllfix/bilanciotool`.
- **Repo di riferimento**: clonata in sola lettura in `C:\Users\user\riferimenti\FormazioneEvalis`. **Mai modificarla, mai copiare codice 1:1**: i pattern si adattano (vedi `docs/riferimenti/pattern-notes.md`).
- **Piano approvato**: `C:\Users\user\.claude\plans\per-i-nomi-poi-bright-milner.md` (12 fasi con gate bloccanti). Fine fase = aggiornare questa sezione + commit "Fase N completata".
- **Comandi**: `npm run typecheck` · `npm run test` (Vitest, tassonomia `*-pure` / `*.db` self-skipping senza `DATABASE_URL` / `*.smoke`) · `npm run test:e2e` (Playwright, richiede `npm run dev` attivo) · `npm run build`.
- **Formato export prototipi** (contratto import): `docs/formato-export-prototipi.md`.

### Regole di dominio già codificate (Fase 1)

- **RLS**: ogni tabella tenant porta `organization_id` e ha policy `<tabella>_tenant_rls` (migrazione `0001`). Aggiungendo una tabella tenant va aggiunta la policy, altrimenti `rls-matrix.db.test.ts` fallisce. Eccezioni consentite solo se giustificate per iscritto nel test (oggi: `audit_log`, `member`, `invitation`).
- **Entitlement**: nessuna server action nuova senza `requireEntitlement(...)`; capability `create_company | write_data | export | generate_pdf`; limiti da `platform_config` (10 aziende attive, warning a 8, 5 membri) con demo/archiviate escluse dal conteggio.
- **Guards**: `requireActiveOrg` riverifica sempre la membership sul DB (le sessioni non sono autorevoli); `requireConsultant` per le operazioni, `requireStudioAdmin` per inviti/billing.
- **Migrazioni**: sempre via `DIRECT_URL` (session pooler :5432 — l'host `db.<ref>.supabase.co` non risolve su questo progetto).

### Stato

**Fase 0 completata** — git+GitHub (`DocAllfix/bilanciotool`), scaffold Next.js 16 + Tailwind v4 + shadcn, env.ts, toolchain test. Resta solo il collegamento Vercel (azione dell'utente).

**Fase 1 completata** — schema 9 domini (41 tabelle), migrazioni applicate su Supabase dev, ruolo `app_rls` + 81 policy RLS default-deny, `withTenant` con GUC + seam `RLS_FORCE_ROLE`, Better Auth multi-tenant (signup crea lo studio in stato demo), guards, layer entitlement, audit append-only. Gate verde: typecheck, build, 22 test (anche con `RLS_FORCE_ROLE=app_rls`), security-review eseguita con hardening applicato.

**Fase 2 completata** — motore di calcolo in TDD (`src/lib/calc`: GHG row/totals/intensity/targets/status + Bilancio derived-kpi/materiality/gap/narrative-drafts, aritmetica decimale, 65 test pure con branch coverage ~98%); contenuti metodologici **estratti automaticamente dai prototipi** (`scripts/extract-seed.mjs` → JSON in `src/lib/db/seeds/data/`) e seminati su Supabase con `npm run db:seed` (idempotente, conteggi esatti testati); parser zod dell'import JSON dei prototipi (`src/features/import/parser.ts`); `docs/politica-arrotondamento.md` con gli scostamenti documentati dal prototipo. Suite completa: 99 test verdi. NB: le sorgenti ISO sono 25 (non 26), i KPI 49, i fattori 59 — fede ai prototipi.

**Fase 3 completata** — design foundation: brief confermato dall'utente (sidebar scura + contenuto chiaro, Geist, tema chiaro default, "sobrio con momenti firmati"); token completi light+dark in `globals.css` (palette semantica + palette dati scope/ESG), `DESIGN.md` vincolante, shell `(app)` con sidebar scura e guard di sessione, pagine auth funzionanti (login/registrati con authClient, signup reale verificato), dashboard portfolio mock, showcase `/design`. Gate: 9 screenshot light/dark/mobile via `scripts/visual-check.mjs` (riusabile per ogni fase UI), zero errori console, zero colori hardcodati, 99 test verdi.
Debiti noti F3 → F5: menu mobile per la sidebar (oggi nascosta sotto md); pagine `/impostazioni` e `/guida` placeholder.

**Fase 4 completata** — modulo GHG backend (`src/features/ghg/`): inventari (content_set congelato alla creazione), confini, registro sorgenti (motivazione d'esclusione ENFORCE-ata), dati di attività (NUMERIC canonico, copia-da-anno-precedente con quantità azzerate), **fattori a overlay** (piattaforma versionata + override/custom per org — modello migliore della copia integrale del prototipo, con protezione anti-orfani sui fattori in uso), obiettivi, checklist, `results.ts`/`getProgress` in sola lettura via `src/lib/calc`, import prototipo transazionale (override selettivi: solo fattori divergenti). Tutte le mutazioni: entitlement `write_data` + audit. Gate: 110 test verdi anche con `RLS_FORCE_ROLE=app_rls`; golden del ciclo completo sui fatti del DB = golden del motore; expired → sola lettura provata; import corrotto → zero righe.

**Fase 5 completata** — modulo GHG frontend: portafoglio reale (creazione/archiviazione, avvisi di limite), percorso in 8 passi (confini con autosave, registro sorgenti con motivazione contestuale, dati di attività con dialog e anteprima calcolata dalle **stesse funzioni pure del server**, fattori a overlay con ripristino, risultati con Recharts su palette token, obiettivi, verifica), import JSON del prototipo dalla UI. Server actions in `*/actions.ts` che restituiscono `{ok}|{ok:false,errore,codice}` — mai eccezioni nude al client.
Gate: e2e 2/2 (`ghg.spec.ts` copre paywall demo → attivazione → percorso → golden 24,694), 110 test, zero errori console, 17 screenshot light/dark/mobile via `scripts/visual-check.mjs`.
**Due bug trovati dal gate visivo e corretti**: (1) cambiando categoria nel dialog voce restava applicato il fattore della categoria precedente (elettricità calcolata col fattore del gas); (2) chiavi React duplicate nel grafico con voci senza descrizione. Inoltre `staleTimes.dynamic` portato a 0: la cache del router client mostrava risultati stantii dopo il salvataggio.
Debiti noti: menu mobile della sidebar, passo 8 (Report) segnaposto fino alla Fase 8.

**Fase 6 completata** — modulo Bilancio backend (`src/features/report/`): progetti (content_set congelato), profilo/soglia, doppia materialità con **suggerimenti ATECO rule-based** (mappa divisione→sezione + tabella curata), KPI per company+anno con derivati SOLO in lettura, gestione temi consentita **solo sui materiali**, capitoli con **sanificazione Tiptap a whitelist server-side** (test XSS: iframe/script/link malevoli scartati, testo conservato), media su **Supabase Storage** (`src/lib/storage.ts`: REST senza SDK, chiavi SEMPRE prefissate orgId — perimetro tenant applicativo, URL firmati per la lettura, cleanup anti-orfani se la transazione fallisce), **ghg-bridge** (fonte unica: il bilancio LEGGE le emissioni dall'inventario GHG, mai copiate; stati mancante/vuoto/ok + controlli di coerenza rule-based), gap-analysis, import prototipo transazionale con upload immagini e conversione testo→Tiptap.
Gate: 121 test verdi anche con `RLS_FORCE_ROLE=app_rls`; upload Storage reale verificato con fetch sull'URL firmato; import corrotto → zero righe. Env: `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` ora required-in-prod.

**Fase 7 completata** — modulo Bilancio frontend: percorso in 7 passi (organizzazione con upload logo/copertina ridimensionati client-side, doppia materialità con matrice scatter interattiva su palette ESG + guide consulenziali per tema + proposta ATECO rule-based mai automatica, griglia KPI doppio anno con derivati non-editabili e warning di coerenza dal bridge GHG, politiche sui soli temi materiali, racconto con editor Tiptap ristretto alla whitelist server + bozze dai dati + media manager, verifica gap con navigazione alle lacune, passo 7 segnaposto per F8). Pulsante Bilancio attivo sul portfolio.
**Bug reale trovato dal gate e corretto**: read-modify-write da props stantie nella materialità — impostare la rilevanza finanziaria azzerava l'impatto appena salvato; ora l'aggiornamento è **per singolo campo, atomico lato DB** (`setTopicScoreField`), il client non manda mai lo stato completo.
Gate: e2e `bilancio.spec.ts` verde (bridge incluso: warning "inventario mancante" verificato), 121 test, screenshot light/dark con zero errori console (`scripts/visual-check-bilancio.mjs`, punteggi seedati via DB perché l'interazione UI è già coperta dall'e2e). Playwright con `retries:1` documentato (flakiness da dev server; in F11 e2e su build di produzione).
**Nome prodotto scelto dal committente: EvalisDeck** (famiglia Evalis) — applicato a metadata e brand della shell/auth. Dominio da verificare.

**Fase 8 completata (gate locale)** — generatore documenti: `snapshot.ts` (pubblicazione = congelamento di dati+derivati in JSONB, versioni incrementali; **unico punto dove i derivati si scrivono**), **immutabilità a livello DB** (migrazione 0002: trigger che blocca update di dati/tipo/anno/versione per CHIUNQUE, solo `pdf_storage_key` mutabile; DELETE revocata ad app_rls); registro editoriale `(document)` (Source Serif 4, `documento.css` con @page A4, copertina esattamente 1 pagina); grafici **SVG server-side** deterministici (`src/components/documento/charts.tsx`, palette stampa fissa); template GHG conforme §9.3.1 e Bilancio (copertina, matrice, indice GRI/ESRS, capitoli via `tiptap-render`); `pdf.ts` dual-path (dev: Chromium Playwright; Vercel: @sparticuz/chromium + puppeteer-core, cookie di sessione inoltrati, `maxDuration 120`); route `/api/documenti/[id]/pdf` con archivio su Storage; `PannelloPubblicazione` nei passi finali dei due wizard (dietro capability `generate_pdf` → demo bloccata, testato). PDF d'esempio committati in `docs/esempi/`.
Gate locale: 125 test verdi (immutabilità trigger provata: update respinto e riga intatta; snapshot invariante dopo modifiche ai dati vivi; v2 alla ripubblicazione), PDF reali generati e verificati visivamente (fix copertina: altezza pagina esatta, filo solo schermo).
Verifica PDF sul deploy Vercel: **chiusa** (commit `d34dc5b`, 324 KB, HTTP 200 in produzione).

**Landing completata (Fase 10 anticipata)** — hero col **Deck** (pila di documenti reali: copertina serif, matrice, KPI — firma visiva legata al nome), headline/CTA/motion confermati dal committente via Q&A; struttura ispirata a Evalis (banda numeri con contatori, come-funziona 01-03 con mini-UI vere, FAQ due colonne, CTA finale) ma identità opposta (freddo/petrolio/sans vs caldo/arancio/serif); **nessun prezzo pubblico** (decisione del committente del 2026-08-07: il listino non sta sulla landing, si vede solo dopo l'accesso; la costante `PREZZI` che una versione precedente di questo documento dava per esistente non è mai stata scritta); slot video placeholder; legali placeholder; SEO (sitemap, robots con AI crawler, llms.txt); header auth-aware. Skill `impeccable` (registro brand) applicata: em dash vietati rimossi, ban rispettati, iterazione visiva sul ventaglio fino a leggibilità completa. Gate: zero errori console, SEO/legali 200, mobile ok, 125 test.

**Identità e shell (2026-07-30)** — loghi reali del committente integrati: originali intoccabili in `public/brand/`, derivati tecnici (solo trasparenza+ritaglio viewBox, via `scripts/prepara-brand.mjs`) in `public/brand/derivati/`, favicon/icon/apple-icon generati dal tile originale (`scripts/genera-favicon.mjs`); componente unico `src/components/brand/logo.tsx`. Shell con sidebar collassabile persistita (`collapsible-shell.tsx`), dashboard = quadro dello studio (banda numeri derivati al volo + documenti pubblicati + attività recente compattata dall'audit log, `getPortfolioOverview`) sopra il portafoglio con card interamente cliccabili; `WizardNav` (indietro/avanti) in fondo a entrambi i percorsi; Bricolage Grotesque come `--font-display` a livello root (titoli app + landing; il documento resta serif). QA prod: 57 controlli — i 7 falliti erano un difetto dello script (match non esatto su "≥ 3" lasciava il dropdown aperto), corretto.

**Fase 12 completata (bilancio energetico)** — terzo modulo, dai prototipi in `aggiunte moduli/`.
- **12.0** registro dei tipi di documento (`src/features/documents/tipi.ts`) al posto del ternario che rendeva il bilancio per qualunque tipo sconosciuto; `extractConst` con regex tollerante agli spazi; migrazione `0003` con i CHECK che Drizzle non genera per `text(enum)`.
- **12.A** schema: 5 cataloghi + 9 tabelle tenant (`src/lib/db/schema/energy.ts`), migrazioni `0004`+`0005` con le policy RLS. Tre scelte motivate nel codice: ripartizione **a righe** (una per cella valorizzata, non colonne né jsonb — evita il read-modify-write già corretto in F7); celle **nell'unità del vettore**, mai in kWh (la quadratura resta valida se un fattore cambia); fattori a sovrapposizione **per azienda** (`companyId`, non `organizationId`: il PCI del cippato è una proprietà dell'impianto).
- **12.B** motore puro in `src/lib/calc/energy/` (7 file, 53 test): vettori, emissioni, ripartizione+quadratura+flussi, mensile, indicatori, interventi, avanzamento. Scostamenti voluti dal prototipo in `docs/politica-arrotondamento.md`: teleriscaldamento e vapore da Scope 1 → Scope 2; indicatore senza denominatore `null` e non `0`; ritorno senza risparmio `null` e non `0`.
- **12.C** seed `energy-v1` (12 vettori, 4 aree, 20 usi con guida, 8 variabili, 10 indicatori, 3 metodi, 7 capitoli), con la convenzione `id = ${dominio}-v1:${key}` per i nuovi domini.
- **12.D** feature `src/features/energy/`, `energy-flow.db.test.ts` (13 prove).
- **12.E** percorso in 8 passi, matrice fino a 20×11, guida per uso finale col calcolatore di stima.
- **12.F** documento in 13 sezioni + `charts-energia.tsx` (Sankey, Pareto con cumulata, barre mensili, barre divergenti), snapshot immutabile, PDF reale 506 KB.

**Regole nate in questa fase** (valgono per F13 e F14):
- **Mai rimandare la riga intera da props**: ogni aggiornamento è per singolo campo, e il valore precedente si rilegge dal DB dentro la transazione. Salvare il costo azzerava la quantità: stesso difetto della materialità in F7, terza occorrenza.
- **Comandi ottimistici**: interruttori, tendine e campi che il server non rivalida devono rispondere subito con stato locale (e ripristinare in caso di rifiuto), altrimenti si leggono come rotti.
- **Campi controllati** dove un altro comando può scrivere nel medesimo stato (il calcolatore di stima scrive nella cella).
- **`revalidatePath` deve puntare alla pagina dell'esercizio**, non al percorso padre: `/aziende/X/energetico` non invalida `/aziende/X/energetico/2025`.
- **Anteprime nel browser con le funzioni pure del server** (quadratura e copertura), mai con aritmetica riscritta: non possono divergere dal salvato.
- **Le chiavi di archiviazione le costruisce il server**, sempre prefissate con l'organizzazione; il client manda solo il dataURL.
- JSX **mangia lo spazio** dopo un'espressione a fine riga: serve `{" "}`.

Gate 12 verde: typecheck · build · **197 test** anche con `RLS_FORCE_ROLE=app_rls` · e2e `energetico.spec.ts` · **collaudo di 40 comandi** con `scripts/visual-check-energetico.mjs` (zero errori di console) · documento reale pubblicato e PDF verificato (`scripts/visual-check-documento-energetico.mjs`).
Difetti trovati dal collaudo e corretti: 6 (vedi commit 12.E e 12.F).

**Fase 13 completata (ESG Supplier Ready)** — quarto modulo, dal prototipo `esg-supplier-ready.html`.
- **Schema**: cataloghi `supplier_area` (5, pesi 10/25/25/25/15) e `supplier_question` (37: 5+9+9+8+6), tenant `supplier_assessment` (unique su `companyId`: non è un esercizio ma la fotografia corrente) e `supplier_answer`. Le quattro mappe parallele del prototipo (risposte/note/azioni/documenti) diventano **una tabella sola**: hanno tutte la grana della domanda. Migrazioni `0006`+`0007` (RLS) e `0008` (CHECK sui domini, che Drizzle non genera per `text(enum)`).
- **Due punti di merito tenuti fedeli al prototipo**, perchè è lì che una reimplementazione "ragionevole" diverge: `NULL` non è `'na'` (non applicabile conta come valutata ma esce dal punteggio; nessuna risposta esce anche dal conteggio), e l'indice si **rinormalizza sulle sole aree valutate** (chi ha compilato una sola area non deve risultare bocciato sulle altre quattro).
- **Motore** in TDD (`src/lib/calc/supplier/`, 17 test): `scoring`, `plan` (recuperi marginali ordinati per punti al giorno), `attestation` (FNV-1a puro, niente `node:crypto`: gira anche nel browser). **Golden estratto eseguendo `compute()` e `upside()` del prototipo** sul suo dataset di esempio: indice 58, aree 83/58/59/50/50, 13 lacune per 42,7 punti.
- **Interfaccia**: sei viste e non uno stepper (l'autovalutazione è un fascicolo che si consulta, non un percorso a passi); quadro con la **tacca della soglia** sulla barra; questionario a quattro scelte con ripremere-per-annullare; piano con responsabile, scadenza e stato sulla riga della domanda; vista evidenze.
- **Attestato**: esito, punteggi per area con barre, risposte con note, piano, scala delle fasce, riferimenti. Il **disclaimer sulla natura del documento sta in chiaro nel corpo**, riquadrato, con le parole concordate col committente.

**Regola nuova nata qui**: quando un'interfaccia accetta molti input in rapida successione, i salvataggi vanno **accodati** e il ricalcolo deve **attendere la coda**. Senza, si chiede il punteggio mentre le ultime scritture sono in volo e si vede un numero che non esiste (i dati erano corretti: era la vista a mostrare il passato).

Gate 13 verde: typecheck · build · **226 test** anche con `RLS_FORCE_ROLE=app_rls` · e2e `fornitore.spec.ts` · **collaudo di 28 comandi** con `scripts/visual-check-fornitore.mjs` (zero errori di console) · attestato reale pubblicato e PDF verificato (`scripts/visual-check-attestato.mjs`).

**Fase 14 completata (SoA ISO/IEC 27001)** — quinto e ultimo modulo, dal prototipo `soa-iso27001.html`.
- **Schema**: cataloghi `soa_framework` (5), `soa_section` (21), `soa_control` (**174**: 93 + 7 + 25 + 31 + 18, con 61 cardine); tenant `soa_declaration` (unique su `companyId`), `soa_module`, `soa_control_decision`. Migrazioni `0009` + `0010` (RLS e domini chiusi, compreso il vincolo sull'array delle motivazioni).
- **Chiave a due colonne** `(frameworkKey, controlloId)`, mai la stringa `"27001|8.4"` del prototipo: è inqueribile (il punteggio per quadro diventerebbe un `LIKE`) e l'unicità globale degli identificativi regge solo per caso — la 27018 usa già la forma `A.x`.
- **Motivazioni come `text[]`**: accendere o spegnere una motivazione è `array_append` / `array_remove` in una sola istruzione atomica.
- **Ruoli privacy e cloud come enum chiusi**, non testo libero.
- **Motore** in TDD (`src/lib/calc/soa/`, 21 test): `scoring`, `plan`, `checks`. Golden estratto eseguendo `compute()` del prototipo sul suo dataset di esempio: 143 in ambito, 141 applicabili, indice 51, per quadro 50/59/49/51.
- **Interfaccia**: sei viste, quadro col **rack** (una casella per controllo in ambito, colorata per stato, anello sui cardine), registro con **sette filtri**, verifiche, piano, documento.
- **Documento**: tabella per sezione con riferimento, controllo, applicabilità, motivazioni in sigle, stato e riferimento documentale; legenda, piano, firme e la **nota di conformità al punto 6.1.3 lettera d)** riquadrata.

**Due punti difesi da test**, perché è lì che una reimplementazione diverge:
1. **Un controllo applicabile senza stato pesa zero**, non viene ignorato. Mediare sui soli valutati farebbe salire l'indice man mano che si saltano i controlli difficili: il contrario del vero.
2. **Falso positivo del prototipo corretto**: `/cloud/i` corrispondeva anche a "Nessun servizio cloud", e l'avviso compariva proprio a chi aveva dichiarato di non usarne, senza modo di farlo sparire. Con gli enum il confronto è per valore e l'esaustività la controlla il compilatore.

Gate 14 verde: typecheck · build · **262 test** anche con `RLS_FORCE_ROLE=app_rls` · e2e `soa.spec.ts` · **collaudo di 34 comandi** con `scripts/visual-check-soa-percorso.mjs` (zero errori di console) · Dichiarazione reale pubblicata e PDF verificato (`scripts/visual-check-soa.mjs`).

### I cinque documenti del prodotto
`document_snapshot.tipo`: `ghg` · `bilancio` · `energetico` · `attestato` · `soa`. I primi tre sono annuali, gli ultimi due usano `SENZA_ESERCIZIO` (0) e formano una serie unica di revisioni. Tutti e cinque renderizzano SOLO dallo snapshot immutabile.

**Fase B completata (2026-08-07) — blog headless, dominio, Search Console, GA4**

Dominio **`evalisdeck.it`** su Vercel (nameserver Vercel, funzioni a `fra1`; il build gira a Washington ma non tocca dati). 308 da `www`, da `evalisdeck.vercel.app` e da `bilanciotool.vercel.app`. `evalisdeck.com` è ancora parcheggiato su Register.

- **Blog headless**: secondo WordPress su `cms.evalisdeck.it` (stessa macchina di Evalis Academy, isolamento provato in entrambe le direzioni), reso da noi su `/blog`. Interruttore `BLOG_VISIBILE_AI_MOTORI` **acceso**: indicizzabile, in sitemap, voce nel menu e nel piede. Editor `bruno.santini` per il consulente SEO.
- **Infrastruttura versionata** in `infra/blog-cms/` — fotografia, non sorgente: il server resta la verità, si aggiornano insieme.
- **GA4** `G-0YYSRQL9FL` dietro consenso esplicito: senza scelta **nessuna richiesta** parte verso Google, nemmeno lo script. Banner con Rifiuta/Accetta di pari misura (96×28) e revoca dal piede di ogni pagina.
- **Testi legali riallineati prima dell'accensione**: la cookie policy dichiarava di non avere strumenti di analisi di terze parti, la privacy che non c'erano trasferimenti extra-UE. Entrambe sarebbero diventate documenti pubblicati e falsi.

**Regole nate qui:**
- **I collaudi misurano le richieste di rete, non le intenzioni.** Fra il codice e il browser ci sono prerendering, cache e strategie di script: l'unica prova che regge è la lista di ciò che è uscito. È così che si è scoperto che GA4 partiva prima del consenso.
- **`useSyncExternalStore` vuole un'istantanea lato server, e componenti diversi ne vogliono di opposte.** Chi presenta può fingere che l'utente abbia scelto (per non lampeggiare); chi raccoglie dati deve fingere il contrario. Una sola funzione per entrambi = raccolta senza consenso, in silenzio.
- **`lastmod` si dichiara solo se la si conosce.** Il valore generato a ogni richiesta dice «modificata adesso» per sempre, e Google impara a ignorare il campo — anche quando poi diciamo il vero.
- **Il marchio in coda al titolo lo mette il sito, una volta sola.** Valeva per gli articoli (Yoast) e per la home (`title.absolute`).
- **Le àncore del menu portano il percorso** (`/#percorsi`): la stessa intestazione compare su pagine che quelle sezioni non le hanno.
- **Da `wp-cli` il webhook non parte** (`blocking => false` e il processo finisce prima): le prove della catena si fanno dalla dashboard o via REST, e le operazioni da riga di comando vanno seguite da una chiamata esplicita.
- **Un controllo che non può mai diventare rosso non è un controllo**, e un allarme che arriva ogni mattina si smette di leggerlo: gli stati legittimi vanno insegnati al collaudo, non tollerati.

Gate: **343 test** · `verifica-sitemap.mjs` 9 · `verifica-blog.mjs` 10 · `verifica-consenso.mjs` 17 (su richieste reali) · `visual-check-legale.mjs` 26 · tutti verdi su `https://evalisdeck.it`.

⚠️ **Debito aperto: nessun canale di allarme funziona.** Da WordPress non esce posta (`sendmail` assente nel contenitore) e `RESEND_API_KEY` manca sia sul server sia su Vercel. Conseguenze: il recupero password di WordPress è muto, l'allarme sul fallimento dei backup è muto, il giro quotidiano sul blog parla al vuoto. I backup girano e il restore-test settimanale passa, ma **se smettessero nessuno lo saprebbe**. Rimedi proposti: interruttore dell'uomo morto (healthchecks.io) per gli allarmi — migliore dell'email perché intercetta anche «lo script non è mai partito» — e SMTP di una casella su `evalis.it` (unico dominio del cliente con MX) per WordPress. Resend resta la strada per il prodotto in Fase 9.

**Prossima: rientro su Fase 9** — Stripe (Subscription Schedules 2 fasi, webhook idempotente), org demo pre-compilata al signup, tour driver.js, paywall reale. ⚠️ Servono: chiavi Stripe TEST dall'utente.

**Struttura, legale e landing (2026-08-03)** — lavoro nato da un difetto visibile: la card del portafoglio aveva cinque bottoni in un `CardFooter` senza `flex-wrap`, e Fornitore e SoA finivano oltre il bordo, irraggiungibili anche col tab. Il sintomo veniva da piu lontano: l'app era ancora strutturata per due moduli.

- **`src/features/companies/moduli.ts`** — registro unico dei cinque moduli (rotta, etichette, norma, icona, documento prodotto, per-esercizio si/no). Erano ricopiati a mano ovunque.
- **Fascicolo azienda `/aziende/[id]`** — non esisteva: c'erano solo `/aziende/[id]/<modulo>`, quindi dalla SoA non si raggiungeva il Bilancio della stessa azienda senza ripassare dal portafoglio. Mostra i cinque percorsi con stato, esercizio, riempimento contato dal DB e ultima versione pubblicata. La card del portafoglio ora punta qui.
- **Sidebar contestuale** — dentro un'azienda mostra il nome e i suoi cinque moduli. Il menu mobile rende lo **stesso** componente invece di un secondo elenco copiato a mano (che infatti si era gia fermato a tre voci).
- **Archivio `/documenti`** — filtrabile per tipo e azienda, con i filtri **nell'indirizzo** (condivisibili, sopravvivono al tasto indietro).
- **Scadenzario** al posto della somma delle tCO2e di tutto il portafoglio, che era un numero senza domanda. Soglia dell'esercizio arretrato: **l'anno scorso**, non quello in corso (la rendicontazione dell'esercizio N si redige durante l'anno N+1).
- **Storico per azienda** (`storico.ts`) — quattro serie lette **dagli snapshot pubblicati**, non dai dati vivi: e quello che il cliente ha in mano, e non richiede di rieseguire il motore. **Niente colonna `sintesi`**, che pure era stata proposta: il trigger 0002 elenca le colonne bloccate una per una, quindi una colonna nuova sarebbe un campo **mutabile dentro un record immutabile**, e i documenti gia pubblicati resterebbero comunque vuoti. Estrazione JSONB mirata in SQL.
- **Pacchetto legale reale** — privacy (11 sezioni), cookie (6), termini (16). Il punto centrale e la **distinzione titolare/responsabile**: Evalis e titolare dei dati dell'account, **responsabile ex art. 28** per i dati che lo studio carica sulle aziende clienti. Cookie **misurati col browser**: zero sul sito pubblico e sul login, uno solo dopo l'accesso. Sezione **rimborsi** agganciata alla pubblicazione del primo documento (criterio verificabile, pronto per Stripe). L'informativa al primo accesso **non e un banner di consenso**: con soli cookie tecnici serve l'informativa, non il consenso.
- **Landing sui cinque documenti** — tre per esercizio, due fotografie con revisioni. Verificato prima di scrivere: **non esiste un ponte energetico -> GHG**, l'unico e GHG -> bilancio.

**Regole nate qui:**
- **Ogni select che parte dall'organizzazione porta il proprio filtro esplicito**, in aggiunta a RLS. In sviluppo la connessione e privilegiata e le policy non scattano: lo scadenzario senza filtro mostrava le aziende di **tutti** gli studi, e in produzione RLS avrebbe coperto il difetto lasciandolo li. La difesa sta in tutti e due gli strati.
- **`prettier` non fa parte del flusso** di questo progetto: riformattando reintroduce lo spazio mangiato dal JSX. Non va lanciato.
- **Lo spazio mangiato dal JSX si cerca sull'HTML reso**, non sul sorgente: in pagine di prosa e endemico (11 occorrenze nei soli testi legali) e a occhio non si vede.
- **La codifica dei caratteri va verificata** dopo ogni modifica automatica al sorgente: il mojibake non rompe niente e passa in produzione. Il gate della landing lo tratta come errore.
- **Ogni serie di dati dichiara il proprio verso di miglioramento**: per le emissioni scendere e un risultato, per un indice di maturita e il contrario.
- **Fluidita**: zero `loading.tsx` con tutte le pagine `force-dynamic` e cache del router disattivata significa che fra il clic e la pagina non succede niente. I segnaposto sono la leva piu grossa e non costano nulla in freschezza dei dati.

Gate: **280 test** (verdi anche con `RLS_FORCE_ROLE=app_rls`) · build · `visual-check-legale.mjs` 25 controlli · `visual-check-landing.mjs` con rilevatori di mojibake e dei cinque percorsi · verifica in produzione delle nuove pagine, zero errori di console.

### Consegne al committente
I documenti generati vanno raccolti in `Desktop/EvalisDeck - Documenti` (PDF reali, non mock), aggiornando la cartella a ogni nuovo tipo di documento prodotto.

