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
⚠️ **Resta della F8**: verifica PDF sul deploy Vercel (serverless) — appena l'utente collega l'account (istruzioni già date).

**Landing completata (Fase 10 anticipata)** — hero col **Deck** (pila di documenti reali: copertina serif, matrice, KPI — firma visiva legata al nome), headline/CTA/motion confermati dal committente via Q&A; struttura ispirata a Evalis (banda numeri con contatori, come-funziona 01-03 con mini-UI vere, FAQ due colonne, CTA finale) ma identità opposta (freddo/petrolio/sans vs caldo/arancio/serif); pricing trasparente (`PREZZI` const in `(marketing)/page.tsx`: 450/150 € — **da confermare col committente**); slot video placeholder; legali placeholder; SEO (sitemap, robots con AI crawler, llms.txt); header auth-aware. Skill `impeccable` (registro brand) applicata: em dash vietati rimossi, ban rispettati, iterazione visiva sul ventaglio fino a leggibilità completa. Gate: zero errori console, SEO/legali 200, mobile ok, 125 test.

**Identità e shell (2026-07-30)** — loghi reali del committente integrati: originali intoccabili in `public/brand/`, derivati tecnici (solo trasparenza+ritaglio viewBox, via `scripts/prepara-brand.mjs`) in `public/brand/derivati/`, favicon/icon/apple-icon generati dal tile originale (`scripts/genera-favicon.mjs`); componente unico `src/components/brand/logo.tsx`. Shell con sidebar collassabile persistita (`collapsible-shell.tsx`), dashboard = quadro dello studio (banda numeri derivati al volo + documenti pubblicati + attività recente compattata dall'audit log, `getPortfolioOverview`) sopra il portafoglio con card interamente cliccabili; `WizardNav` (indietro/avanti) in fondo a entrambi i percorsi; Bricolage Grotesque come `--font-display` a livello root (titoli app + landing; il documento resta serif). QA prod: 57 controlli — i 7 falliti erano un difetto dello script (match non esatto su "≥ 3" lasciava il dropdown aperto), corretto.

**Prossima: Fase 9** — Stripe (Subscription Schedules 2 fasi, webhook idempotente), org demo pre-compilata al signup, tour driver.js, paywall reale. ⚠️ Servono: chiavi Stripe TEST dall'utente + collegamento Vercel (per F8-verifica PDF e deploy landing).

