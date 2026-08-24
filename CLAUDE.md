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
- **Due database, dal 2026-08-22**: fino a quella data ne esisteva **uno solo**, ed era la produzione — il `.env` locale ci puntava, e la riga di questo documento che diceva «Supabase dev» era falsa. Le ultime otto organizzazioni create erano tutte artefatti di collaudo: la produzione era anche il banco di prova. Ora il dev e' il progetto `dsjigmjvvrpifliqdgnx` (stessa regione, stesso Postgres 17.6, schema verificato identico: 68 tabelle, 68 con RLS forzata, 129 policy tutte `TO app_rls`, 584 test verdi in entrambe le modalita'). Le stringhe di produzione stanno in `.env.produzione`, **escluso da git**: su Vercel le variabili sensibili non si rileggono, quindi sovrascriverle senza copia le avrebbe perse.
- **`db:migrate` e `db:seed` passano da `scripts/guardia-database.mjs`**, che si rifiuta di scrivere su un database con abbonamenti Stripe o sul riferimento noto della produzione. L'override e' `SO_CHE_E_PRODUZIONE=1`, e va dichiarato. Due spie perche' una sola non basta: il riferimento copre il caso noto, gli abbonamenti si mantengono da soli — i test ripuliscono cio' che creano, e nessun pagamento vero puntera' mai a un database di prova. Provata in rosso su entrambe.
- **Migrazioni**: sempre via `DIRECT_URL` (session pooler :5432 — l'host `db.<ref>.supabase.co` non risolve su questo progetto).
- **La connessione dell'applicazione in produzione è `app_rls`** (dal 2026-08-14): le policy scattano davvero. Conseguenza operativa: **ogni query su dati tenant deve passare da `withTenant`**, altrimenti in produzione non vede niente e in sviluppo funziona. La stringa privilegiata resta solo in `DIRECT_URL`, per le migrazioni.

### Stato

**Fase 0 completata** — git+GitHub (`DocAllfix/bilanciotool`), scaffold Next.js 16 + Tailwind v4 + shadcn, env.ts, toolchain test. Resta solo il collegamento Vercel (azione dell'utente).

**Fase 1 completata** — schema 9 domini (41 tabelle), migrazioni applicate su Supabase, ruolo `app_rls` + 81 policy RLS default-deny, `withTenant` con GUC + seam `RLS_FORCE_ROLE`, Better Auth multi-tenant (signup crea lo studio in stato demo), guards, layer entitlement, audit append-only. Gate verde: typecheck, build, 22 test (anche con `RLS_FORCE_ROLE=app_rls`), security-review eseguita con hardening applicato.

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

**Verso il lancio (2026-08-07) — piani, impostazioni, portale cliente, white-label**

Nuovo modello commerciale del committente: quattro livelli con capacità diverse più estensioni a quantità. Non è un cambio di listino, è un cambio di architettura: i limiti erano globali per tutti gli studi, ora sono una proprietà dell'abbonamento. **Nessun prezzo sulla landing**: il listino si vede solo dopo l'accesso.

- **F9.0 — tre difetti già in produzione.** `archiveCompany` non aveva `requireEntitlement` (un account in sola lettura poteva archiviare). `assertSeatAvailable` esisteva senza chiamanti: il limite di accessi non era applicato da nessuna parte, restava il `membershipLimit: 5` fisso di Better Auth. E **gli inviti erano rotti**: alla tabella `invitation` mancava `created_at` (migrazione `0011`) — scoperto perché un test passò al primo colpo per il motivo sbagliato.
- **F9 — piani ed estensioni.** `src/lib/prezzi.ts` è la fonte unica (importi in **centesimi**, mai importata dalla landing); `org_entitlement` guadagna `piano`, `aziendeExtra`, `accessiExtra`, `whiteLabel` (migrazione `0012` con tre CHECK, incluso «un piano implica una data di attivazione»); `getLimitiEffettivi` somma capacità del piano ed estensioni, con `platform_config` come sola riserva.
- **F11 — Impostazioni** (`/impostazioni`, tre schede): studio, membri col limite del piano, abbonamento con capacità usata su totale e riquadro rimborso. Chiude il vicolo cieco: il CTA del banner demo finiva su un guscio di 14 righe.
- **F12 — portale cliente.** `/documenti-cliente/[token]`: l'azienda scarica i propri documenti **senza account e senza password**. Nel database c'è solo l'impronta SHA-256 del token, mostrato in chiaro una volta sola; revoca immediata, scadenza a 7/30/90 giorni, contatore aperture. La rotta serve **solo PDF già archiviati**, non li genera mai: Chromium dietro un indirizzo pubblico è un costo che si invita da solo. Pagina `noindex`.
- **F12c — white-label** (600 €/anno): i cinque documenti portano il nome dello studio. Il marchio si sceglie **una volta sola alla pubblicazione** e si congela nello snapshot (`src/features/documents/marchio.ts`, aggiunto in `salvaSnapshot` — la strozzatura comune ai cinque, per non dimenticarlo nel sesto). Il monogramma compare solo col marchio nostro: del logo dello studio non abbiamo nulla, e il nostro simbolo accanto al nome di un altro sarebbe il contrario di ciò che l'estensione vende.

**Regole nate qui:**
- **Un `next start` non rilegge il sorgente.** Carica il build all'avvio: un server acceso prima delle modifiche serve il codice di ieri per sempre, senza dirlo. Tre collaudi rossi di fila e una caccia alla cache inesistente, mentre il difetto era che stavo interrogando un binario vecchio. **Prima di dare per rotto il codice, guardare da quando gira il processo che si sta collaudando.**
- **La domanda giusta a Postgres distingue «chiave assente» da «valore null»**: `dati ? 'marchio'` dice ciò che `dati->'marchio'` nasconde, e indirizza la diagnosi in un colpo.
- **Un collaudo va provato rompendolo.** Il test del white-label è stato messo in rosso di proposito togliendo il campo dallo snapshot, per vedere che fallisse sull'asserzione giusta.

Gate: typecheck · build · **418 test** verdi anche con `RLS_FORCE_ROLE=app_rls` · `visual-check-impostazioni.mjs` 14 · `visual-check-condivisione.mjs` 9 · `visual-check-marchio.mjs` 7 (pubblica, spegne l'estensione, ricarica **lo stesso** documento) · console pulita.

**F14 parziale + F15 parziale (2026-08-07) — freno, archivio, CI, Guida, PRE-LAUNCH**

- **Limite di frequenza** sulle rotte di autenticazione, contatore **su database** (tabella `rate_limit`, migrazione `0014`, passthrough come le altre tabelle di Better Auth). Su Vercel ogni istanza ha la propria memoria: un contatore che si azzera a ogni avvio a freddo non ferma nessuno, basta che i tentativi cadano su istanze diverse. Dieci accessi sbagliati in cinque minuti, dieci registrazioni all'ora — il freno serve contro le migliaia, non contro la decina, e i nostri stessi collaudi registrano un utente ciascuno dallo stesso indirizzo.
- **La rotta PDF non riavvia Chromium** se il file di quella versione esiste già. Non è una cache: lo snapshot è immutabile per costruzione, quindi il PDF non può cambiare. **Meglio togliere il costo che limitare la frequenza con cui lo si paga.** Conseguenza accettata: cambiando l'impaginazione i PDF archiviati restano come sono, ed è coerente — quello consegnato al cliente è quello.
- **CI** (`.github/workflows/ci.yml`): typecheck e test. **Non** il build (pretende sei variabili di produzione: o si espone il database a ogni workflow, decisione del committente, o si inventano valori finti e il verde non significa niente; il build ha già Vercel come cancello). **Non** il lint (26 errori preesistenti: un cancello che nasce rosso diventa rumore da ignorare).
- **`npm run qa`** elenca e lancia i collaudi leggendo la cartella — un controllo nuovo si presenta da solo. Solo i collaudi: `seed.mjs` scrive davvero.
- **Pagina Guida** vera, generata dai registri dei moduli e dei documenti (un modulo nuovo compare da solo e non può dichiarare una norma diversa da quella che il prodotto usa), più il comando che rimette i tour da rivedere.
- **`PRE-LAUNCH.md`**: ogni voce ha un **modo di verificarla**, e i debiti aperti sono elencati in fondo invece di essere taciuti.

**Regola nata qui:** **un `next start` non rilegge il sorgente.** Carica il build all'avvio: un server acceso prima delle modifiche serve il codice di ieri per sempre, senza dirlo. Tre collaudi rossi e una caccia alla cache inesistente. E `pkill` non esiste in questa shell: fermare il processo va **verificato**, non presunto. Prima di dare per rotto il codice, guardare da quando gira ciò che si sta collaudando.

Gate: typecheck · build · **418 test** anche con `RLS_FORCE_ROLE=app_rls` · `qa -- limiti` 6 (su risposte vere) · `qa -- pdf-archivio` 5 · `qa -- guida` 7 · `qa -- marchio` 7 · console pulita.

**Guasto in produzione e correzione (2026-08-10) — il primo articolo del blog dava 500**

Il consulente SEO pubblica il primo articolo: la sua pagina risponde **500** a chiunque la apra, mentre l'indice `/blog` la mostra senza problemi. La causa non era nel blog: **`SiteHeader` chiamava `getSessionOrNull()`**, cioè `headers()`, per scegliere fra «Accedi» e «Vai al portafoglio». Quella lettura impediva a Next di generare come **statica** ogni pagina che monta l'intestazione. Finché il blog era vuoto nessuno se n'è accorto; il giorno del primo articolo la sua pagina — che nessun build conosceva — andava generata su richiesta, e in quel contesto leggere gli header è vietato (`DYNAMIC_SERVER_USAGE`).

Effetto collaterale scoperto strada facendo: **nemmeno la home era statica**. Veniva ricostruita a ogni visita solo per decidere l'etichetta di un pulsante. Ora la sessione la chiede il browser (`src/components/landing/azioni-accesso.tsx`) e sono statiche home, indice, articoli, autori e categorie.

**Regole nate qui:**
- **La prima spiegazione plausibile va messa alla prova, non applicata.** Avevo incolpato `draftMode()`: le prove l'hanno smentita in due colpi — uno slug inesistente rispondeva 404, e la pagina autore, che `draftMode` non lo usa, falliva lo stesso. `draftMode()` durante il prerender è innocuo, verificato sul campo.
- **La diagnosi si chiude con un esperimento a variabile singola.** Build senza l'articolo nei parametri e con l'intestazione → 500; stesso build, tolta solo l'intestazione → 200. Nient'altro dimostra la causa.
- **Un elenco non prova che le pagine si aprano.** Sitemap e indice leggono i metadati dal CMS: l'articolo si vedeva benissimo mentre la sua pagina era rotta, e tutti i controlli erano verdi. Il giro quotidiano ora **bussa a ogni porta** (`pagine-articoli`, `pagine-collegate`).
- **Nessuna pagina pubblica deve leggere la richiesta.** `pagine-statiche-pure.test.ts` **segue gli import** a partire da ogni pagina marketing: il difetto stava tre livelli sotto, in un componente condiviso, e un controllo sui soli file delle pagine non l'avrebbe mai visto.
- **Un redeploy avrebbe fatto sparire il sintomo senza risolvere niente**: l'articolo sarebbe entrato nel build, e il guasto sarebbe tornato al primo articolo pubblicato dopo il rilascio successivo — cioè sempre.

Gate: **424 test** · verifica-blog **13 su 13 in produzione** (con i due controlli nuovi) · intestazione provata anonima e autenticata, zero errori di console.

**Blog, richieste del consulente SEO (2026-08-10)** — tre interventi, stesso scopo: dire a un motore di ricerca che dietro l'articolo c'è una persona e una struttura.
- **Indice dei contenuti** in apertura (`src/features/blog/indice.ts`, H2+H3 gerarchici). WordPress non mette gli `id` sui titoli: le ancore **nascono nello stesso passaggio** che produce l'indice, mai separatamente — due elenchi calcolati in due posti divergono, e quando divergono l'indice sembra funzionare mentre porta nel vuoto. `scroll-mt` sui titoli, altrimenti il salto li nasconde dietro l'intestazione fissa; **il collaudo misura la posizione del titolo dopo il clic**, non si accontenta dell'ancora esistente. Soglia: sotto le 3 voci non compare.
- **La firma porta al profilo**, nell'articolo e nelle schede. La scheda ha un collegamento che la copre tutta: senza `z-index` il link sarebbe presente nel markup e **inerte al clic**. Nella pagina dell'autore si spegne.
- **Identità dell'autore**: il campo «Sito web» di WordPress finisce in `sameAs` dello schema `Person`. Nessun segnaposto in pagina quando la biografia manca — è pubblica e indicizzata, e una scusa scritta lì la legge Google prima di chiunque; lo dice il controllo `autori-identita`.

⚠️ **Dato mancante, non codice**: su WordPress `description` (bio), `evalis_ruolo` e `url` dell'utente `bruno.santini` sono **vuoti**. Il collaudo è rosso finché non li compila (Utenti → Profilo). Non li scrive Claude: sono l'identità di una persona reale.

**F10 + F13 + F14c completate (2026-08-10/11) — si incassa, si scrive, ci si accorge dei guasti**

- **Stripe** (account `EvalisDeck` separato da Academy, sandbox). Prezzi creati **dal listino** con `scripts/stripe-bootstrap.mjs`, ripetibile: riconosce i prodotti dai metadata e non dal nome, e se un importo diverge **si ferma** invece di tentare una modifica che Stripe rifiuterebbe (i prezzi sono immutabili). Venti prezzi: dieci di listino, dieci di lancio.
- **Prezzi di lancio dimezzati** col listino barrato accanto, scadenza **10 agosto 2027**. Il prezzo mostrato e quello addebitato escono dalla **stessa funzione** (`prezzoDiVendita`), che restituisce importo e chiave Stripe insieme: separarli significherebbe, il giorno della scadenza, mostrare 1.450 e addebitare 2.900. Alla scadenza il barrato **sparisce da solo**: il sistema non deve poter diventare bugiardo per inerzia.
- **Checkout** con partita IVA e **codice destinatario** raccolti subito (senza, la fattura elettronica non si emette e si rincorre un cliente che ha già pagato). Il checkout **non attiva niente**: lo fa il webhook.
- **Webhook**: non si crede al payload (si rilegge da Stripe), il claim di idempotenza **si rilascia** se il lavoro fallisce, e ciò che non si riconosce riceve un «va bene» — un 500 su un evento inutile fa disabilitare l'endpoint, e con l'endpoint spento si fermano anche gli eventi che pagano.
- **Piano a due fasi** su ogni abbonamento nuovo, non solo dal checkout: uno creato a mano sarebbe rimasto al prezzo del primo anno per sempre. Verificato: 1.450 € → 1.100 €.
- **Quattro email post-acquisto** (benvenuto, pagamento fallito, preavviso rinnovo a 7 giorni via cron, primo documento pubblicato), agganciate al **cambio di stato** e non all'evento: Stripe ne manda diversi per lo stesso abbonamento.
- **Resend** acceso: dominio verificato (Irlanda, come dichiara la privacy), template col marchio in `src/lib/email/modello.ts` — separato dall'invio perché chi importa `env` non gira in uno script. **Verifica dell'indirizzo ACCESA**; i 133 account preesistenti marcati verificati.
- **Sentry** attivo (regione UE), con i segreti rimossi prima dell'invio e `tunnelRoute` contro i blocchi pubblicitari.

**Regole nate qui:**
- **Un filtro che rompe ciò che filtra è peggio di nessun filtro**: il primo `beforeSend` ricostruiva l'evento e Sentry lo scartava. Nessun errore, nessun avviso, solo un cruscotto vuoto mentre il server rispondeva 500.
- **`instrumentation.ts` va in `src/`** quando il progetto usa `src`: nella radice è ignorato **in silenzio**. Erano due guasti sovrapposti, e il secondo nascondeva il primo.
- **Le cartelle che iniziano con `_` non generano rotte**: la rotta di prova non è mai esistita e rispondeva 404 a tutti.
- **Le variabili «Sensitive» di Vercel non si rileggono**: `env pull` restituisce un riempimento. Il `CRON_SECRET` è stato rigenerato.
- **Accendere la verifica dell'email cambia il flusso di registrazione**: non si crea più la sessione. Otto collaudi si aspettavano di entrare subito; la sequenza sta ora in `scripts/comune-registrazione.mjs`.

Gate: **462 test** · `verifica-pagamento` 9 su 9 in produzione · `verifica-checkout` 6 su 6 · `qa -- guida` 7 su 7 · errore reale visto in Sentry.

⚠️ **Superato: in produzione ci sono le chiavi Stripe VIVE** (vedi la sezione del 2026-08-13). Questa riga diceva il contrario e ha rischiato di far girare un collaudo che compra contro l'ambiente che incassa.

**Accoglienza del primo accesso (2026-08-13) — video, giro guidato, offerta**

Chi si registra atterra sulla dashboard e in tre momenti vede cosa ha comprato prima di comprarlo: il **video** di 40 secondi (`videodemo/EvalisDeck-FINAL.mp4`), il **giro guidato** che attraversa le sei pagine, l'**offerta** coi prezzi di lancio. L'ordine non è casuale: il video dice cosa fa il prodotto mentre la persona non sa dove guardare, il giro glielo fa toccare, l'offerta arriva quando ha capito cosa comprerebbe.

- Il video sta su **Supabase Storage** (`_piattaforma/onboarding/benvenuto-v1.mp4`), non in `public/`: la repo pesa 13 MB e ogni ricarica ne aggiungerebbe 15 alla storia di git per sempre. La rotta `/api/onboarding/video` pretende la sessione e rinvia a un indirizzo firmato di un'ora.
- L'**itinerario lo calcola il server** (`/api/onboarding/percorso`): dipende da quale azienda è la dimostrativa e da quale esercizio ha ciascun modulo. Scritto nel client sarebbe una lista di indirizzi indovinati, e la prima tappa su un esercizio inesistente porterebbe il nuovo cliente su una pagina vuota, dopo un video che gli ha appena promesso il contrario.
- Lo stato del giro sta in `sessionStorage` (`src/lib/tour/presentazione.ts`) perché **attraversa le pagine**; il fatto compiuto in `localStorage`.
- **Interrompere porta dritti all'offerta.** Chi chiude un tour dice «basta spiegazioni», non «basta prodotto»: l'offerta è il terminale di ogni strada e si vede una volta sola. Serve sapere *come* si è chiuso un tour: `avviaTour` legge `hasNextStep()` **prima** di distruggere, e passa `completato` al seguito.
- **L'azienda dimostrativa ha ora tutti e cinque i percorsi** (`seed-demo-moduli.ts`): erano due su cinque, e gli altri tre sembravano non funzionare. Stessi numeri dell'inventario GHG — 612.000 kWh e 42.500 Smc sono gli stessi in tutti i moduli, perché un consulente che apre due percorsi della stessa azienda e trova consumi diversi smette di fidarsi di entrambi.

**Regole nate qui:**
- **Due tour non possono partire sulla stessa pagina.** Il velo del tour automatico si apriva **sopra** il video e rendeva incliccabile il pulsante per proseguire. Non basta chiedere «giro in corso?»: fra il video e la prima tappa il giro non è ancora cominciato, ed è lì che si sovrapponevano. Il fatto discriminante è il benvenuto ancora da vedere, e **lo sa il server** — niente gara fra due effetti montati insieme.
- **Il benvenuto si segna visto quando si ARRIVA all'offerta**, non quando la si chiude: chi va al pagamento e torna indietro senza pagare ha già visto tutto, e rimettergli il video da capo sarebbe la seconda cosa che gli succede dopo un ripensamento.
- **Un componente montato nella shell sopravvive alle navigazioni, il suo stato in memoria no.** Un `useRef` acceso una volta come «in corso» bloccava tutte le tappe successive: deve ricordare *quale* tappa, non *se*.
- **Le quantità stanno nei campi, non nel testo**: un collaudo che legge `innerText` dice «manca» anche quando c'è.
- **Un pattern del `.gitignore` senza barra iniziale vale a QUALSIASI livello.** `video/`, scritto per la cartella del materiale girato, si è portato via `src/app/api/onboarding/video/route.ts`: il codice compilava, i collaudi locali passavano, e in produzione la rotta non esisteva. Le cartelle di lavoro vanno ancorate (`/video/`). Controllo utile dopo ogni aggiunta: `git ls-files --others --ignored --exclude-standard -- 'src/**' 'scripts/**'` deve essere vuoto.
- **Il 404 che sembrava dell'archivio era di Next.** Un `catch` unico attorno a sessione e archivio rendeva indistinguibili «non sei autorizzato» e «l'archivio non risponde», e la diagnosi è partita dalla parte opposta del sistema. Ora l'anonimo prende 404 e il guasto nostro prende **503** col motivo nei log. La prova decisiva è stata il `content-type: text/html` del 404: il nostro ha corpo vuoto, quello di Next è una pagina.
- **Un collaudo che segue i rinvii non dice dove si è rotto**: la sonda va rifatta con `maxRedirects: 0`.

⚠️ **Superato: in produzione ci sono le chiavi Stripe VIVE** (vedi la sezione del 2026-08-13). Questa riga diceva il contrario e ha rischiato di far girare un collaudo che compra contro l'ambiente che incassa.

Gate: typecheck · build · **462 test** verdi anche con `RLS_FORCE_ROLE=app_rls` · `qa -- benvenuto` **11 su 11 in produzione** (catena intera: video → 6 tappe → offerta → Stripe, e la prova che non riparte) · `qa -- demo-completa` **9 su 9 in produzione** (i cinque percorsi mostrano numeri veri: quadratura, indice fornitore 70, indice SoA 61) · console pulita.

**Collaudo di ogni comando in produzione (2026-08-13) — quattro difetti veri**

Ricognizione dei comandi reali di ogni pagina (invece di indovinarli), poi tre collaudi che dopo **ogni gesto** misurano console, richieste fallite e messaggi di rifiuto: `qa -- tutto-demo` (68), `qa -- tutto-attivo` (55), `qa -- tutto-pubblico` (27), più `qa -- recupero-password` (8). Tutti verdi su `https://evalisdeck.it`.

1. **Il recupero della password non esisteva.** Il server lo sapeva già fare dalla Fase 13 — `sendResetPassword` configurato, modello dell'email pronto, freno sulla frequenza tarato — ma non c'era modo di chiederlo, e la privacy policy dichiarava che quell'email la mandiamo. Un cliente che dimenticava la password non entrava più. Aggiunte `/password-dimenticata` e `/reimposta-password` (entrambe statiche) e il collegamento **accanto al campo**, dove lo si cerca. Il freno copriva solo `/forget-password`: `authClient.requestPasswordReset` chiama `/request-password-reset`, che restava col limite generico — cioè l'endpoint che manda posta a indirizzi altrui.
2. **Un conto in PROVA generava il collegamento pubblico ai documenti.** Il controllo c'era ma chiedeva `write_data`, che la prova possiede. Ora servono `write_data` **ed** `export`. La revoca invece non chiede nulla, per iscritto: può solo ridurre l'esposizione, e legarla all'abbonamento lascerebbe uno studio scaduto con un indirizzo pubblico che non può spegnere.
3. **Chi paga non aveva un solo comando sull'abbonamento.** E la scheda mostrata a chi non ha piano diceva ancora che il pagamento con carta «arriva a breve», sopra il pulsante che porta a Stripe e funziona.
4. **`confirm()` e `alert()` nativi** nell'unico gesto distruttivo: unico punto del prodotto, e `alert()` su alcuni browser viene soppresso — un errore riferito così può non arrivare mai.

Più il landmark `main` mancante sulle pagine di accesso, che sono le prime che si incontrano.

**Regole nate qui:**
- **La prova di un divieto è la riga che non compare nel database**, non il messaggio. Il collegamento cliente riusciva *in silenzio*: nessun avviso rosso, nessun 4xx, nessun errore di console. Un collaudo che guarda solo l'interfaccia legge «bloccato in silenzio» dove c'è «riuscito in silenzio», e sono l'opposto.
- **Il prodotto dice «no» in due modi**: l'avviso che scompare e il messaggio che resta accanto al comando. Il paywall usa il secondo.
- **Ogni conteggio di un collaudo si legge dal database**, mai scritto a mano: un conto riusato porta le aziende, i documenti e i collegamenti delle esecuzioni precedenti, e un numero fisso fallisce alla seconda passata per un motivo che col prodotto non c'entra.
- **Il nome accessibile non è l'etichetta visibile.** «Sì» è `B1: Sì`; lo stato di un controllo SoA è un `combobox` che si chiama «Stato di attuazione di 5.3» e ha il valore dentro. Cercare per il testo che si vede non trova niente.
- **Playwright scarta da solo i dialoghi nativi**: senza `page.on("dialog")` un `confirm()` risponde sempre «no», e il collaudo legge «non ha funzionato» dove non è stato nemmeno chiesto.
- **Per agire sulla card giusta serve il contenitore più piccolo** che porti insieme il nome e il comando: risalire fino al nome pesca il primo antenato comune, che avvolge tutte le card.
- **Un `.first()` su un elenco che cresce agisce su un elemento a caso.** Il ripristino ripristinava un'azienda archiviata da un'esecuzione precedente, e il collaudo accusava il prodotto.

**Rimasto aperto, da decidere col committente:** comprare un'estensione a metà anno tocca l'abbonamento già in corso, e quel flusso non esiste (il checkout include sempre il piano: si creerebbe un secondo abbonamento). Oggi la pagina elenca le estensioni coi prezzi e dice a chi scrivere. Il portale clienti di Stripe (fatture, metodo di pagamento) non è stato acceso di mia iniziativa: cambia ciò che un cliente può fare al proprio abbonamento, e il cambio piano dal portale romperebbe lo Schedule a due fasi.

**Le estensioni (2026-08-13) — si vendono, e sopravvivono al rinnovo**

Tre cose, in ordine di gravità.

1. **La seconda fase dello Schedule conteneva il solo piano: le estensioni sparivano al primo rinnovo.** Chi avesse comprato Studio più cinque aziende si sarebbe visto, dodici mesi dopo, il limite riportato a dieci senza un avviso, mentre Stripe smetteva di addebitargliele. Latente perché nessuno ha ancora rinnovato: sarebbe uscito fra un anno, su abbonamenti in corso. Ora la fase di rinnovo la costruisce `vociDelRinnovo` (`src/features/billing/fasi.ts`), pura e con otto prove: il piano si sostituisce col prezzo ridotto, le estensioni **si portano dietro col prezzo a cui sono state comprate** (come il piano tiene il suo ridotto), gli addebiti una tantum no, e una riga ricorrente sconosciuta si porta dietro invece di sparire.
2. **Le estensioni erano costruite dappertutto tranne dove si comprano**: prezzi su Stripe, righe nel checkout, lettura nel webhook, somma nei limiti, marchio congelato nello snapshot — e nessuna schermata che le passasse. Il white-label da 300 €/anno si attivava solo scrivendo `white_label = true` a mano nel database. Ora si scelgono nel dialogo d'acquisto, col totale mostrato **prima** di uscire verso Stripe.
3. **Portale clienti** per fatture, ricevute, carta e dati fiscali. Cambio piano e disdetta **spenti**, e sta scritto nel codice perché non sembri una mancanza: ogni abbonamento porta uno Schedule a due fasi, e cambiarlo dal portale lo scavalca in modi non prevedibili. La configurazione si riconosce dai metadata e si riusa, come i prezzi.

⚠️ **In produzione ci sono le chiavi Stripe VIVE, e l'account INCASSA GIÀ.** Scoperto da questo collaudo: la sessione creata dal sito era `cs_live_`, mentre la chiave locale è di prova. `CLAUDE.md` diceva ancora il contrario, ed è la ragione per cui un collaudo che **compra** stava per girare contro l'ambiente che incassa. Che l'account sia operativo si è misurato **dal comportamento e non dal flag** (per leggere `charges_enabled` servirebbe la chiave viva, che non abbiamo in locale): la pagina di pagamento viva offre carta, Satispay, Klarna e Amazon Pay, e Stripe non li mostrerebbe a un account che non può addebitare.

Conseguenza sui collaudi: `verifica-checkout` e `verifica-pagamento` si **rifiutano di partire** fuori da localhost senza `SO_CHE_E_VIVO=1`, `verifica-estensioni` si ferma se la chiave locale è viva, e `verifica-tutto-demo` non esce più verso Stripe — verifica il dialogo e si ferma. Ogni clic su «Paga» contro la produzione creava un cliente vero, a ogni esecuzione.

**Regole nate qui:**
- **Un collaudo che compra dichiara contro cosa sta comprando, e si rifiuta di girare su un ambiente vivo.** La guardia costa tre righe; scoprirlo a metà da un «No such customer» costa la fiducia in tutto il resto del referto.
- **La documentazione che dice il falso su un ambiente è peggio dell'assenza di documentazione**: quella riga sulle chiavi di test è stata creduta.
- **Lo Schedule si chiede a Stripe, non al nostro database**: da noi l'identificativo lo scrive un evento successivo, e in locale quell'evento non arriva. La verità su cosa pagherà il cliente sta di là.
- **Un evento si può consegnare a mano al proprio webhook**, firmandolo col segreto di prova: l'evento resta vero, si rifà solo la firma. È così che si prova la catena intera senza il CLI di Stripe.
- **Un controllo che legge la pagina precedente passa sempre.** Due controlli sul portale erano verdi mentre il portale non si era mai aperto.

Gate: typecheck · build · **472 test** verdi anche con `RLS_FORCE_ROLE=app_rls` · `qa -- estensioni` **10 su 10** contro Stripe di prova, con la fase 2 letta da Stripe: `studio_rinnovo_lancio×1 + blocco_aziende_lancio×2 + accesso_lancio×3 + white_label_lancio×1 = 2.525 €`. Il collaudo è stato messo in rosso di proposito rimettendo il difetto: fallisce sull'asserzione giusta.

**La strada d'acquisto sulla vetrina (2026-08-13)** — nata da una domanda vera di un potenziale cliente: «se voglio acquistare il servizio direttamente senza demo non è previsto? Non vedo le modalità di acquisto». Aveva ragione: ogni richiamo diceva «prova la demo», e chi aveva già deciso non trovava una strada.

- **Sezione `#acquisto`**, senza prezzi ma con il **come**: abbonamento annuale per studio, carta o bonifico, fattura elettronica, rimborso a quattordici giorni, disdetta. E dove si vedono gli importi — perché tacere il come, oltre al quanto, fa sembrare che non si venda affatto. Voce nel menu, nel piede e nel richiamo finale.
- **`/attiva`**: stessa iscrizione, ma il collegamento che arriva per posta fa entrare sulla **pagina dei piani** invece che sul portafoglio col video. È una **rotta** e non un parametro d'indirizzo: queste pagine sono statiche, e `useSearchParams` su una pagina statica arriva solo dopo l'idratazione — il titolo comparirebbe sbagliato e poi cambierebbe sotto gli occhi.

**Trovato analizzando il resto della vetrina:**
- I dati strutturati dichiaravano ancora `evalisdeck.vercel.app`.
- **Mancavano del tutto i metadati di condivisione**: chi incollava il link in chat vedeva un riquadro spoglio — ed è esattamente così che questo prodotto si passa. Aggiunti `metadataBase`, `openGraph`, scheda Twitter e un'immagine 1200×630 **generata dal codice** (`src/app/opengraph-image.tsx`): un file statico andrebbe rifatto a ogni cambio di promessa, e la prima volta che diverge dal sito non se ne accorge nessuno, perché chi la vede non è chi la controlla.
- Le domande frequenti sono anche **dati strutturati**, lette dallo **stesso elenco** che rende la pagina.

**Regole nate qui:**
- **I dati non si importano da un modulo `"use client"`**: il build restituisce un riferimento al componente, non l'array, e si ferma con «DOMANDE.map is not a function». Quelli condivisi fra server e client stanno in un file proprio (`src/components/landing/domande.ts`).
- **`networkidle` non arriva mai** su una navigazione che il browser considera interna (stessa pagina, ancora diversa): serve `domcontentloaded`.
- **L'immagine sociale si scarica dall'ambiente che si sta collaudando**, non dall'indirizzo assoluto che dichiara: in locale quello punta alla produzione, e un 404 direbbe «rotto» su una cosa che lì non è ancora arrivata.

Gate: typecheck · build · **472 test** · `qa -- tutto-pubblico` **32 su 32 in produzione**.

**Vetrina da telefono, nomi dei documenti, attivazione visibile (2026-08-13)**

- **Da telefono la vetrina era tagliata.** Il Deck dell'hero è una composizione a posizioni assolute in pixel: con misure fisse funziona a una larghezza sola, e sotto quella non si stringe, si **taglia**. La copertina finiva 95px fuori dallo schermo e il nome dell'azienda si leggeva «…anica …tica S.r.l.». Ora il contenitore dichiara `@container`, la radice prende `font-size: min(10px, 1.887cqw)` e **ogni misura interna è in `em`**: la composizione si rimpicciolisce identica a sé stessa, senza JavaScript e senza punti di rottura da indovinare.
  Alla radice c'era anche un difetto vero: la copertina portava `-translate-x-1/2` (proprietà `translate`) **e** `[transform:translateX(-50%)]` (proprietà `transform`). Sono due proprietà distinte, si sommavano, e lo spostamento era del doppio. **Da desktop quell'errore sembrava il disegno giusto** — spostava la copertina a sinistra e liberava la card dei numeri — mentre da telefono la buttava fuori schermo.
- **Nomi dei documenti**, come li chiama il committente: **Bilancio di sostenibilità e conformità ESG** · **Bilancio energetico** · **Statement of Applicability (SoA)**. Sulle copertine stampate il riferimento normativo resta visibile subito sotto («diagnosi energetica redatta secondo UNI CEI EN 16247», «Dichiarazione di Applicabilità · ISO/IEC 27001:2022»): il titolo è commerciale, la norma è ciò che il verificatore cerca. La chiave d'archivio dei PDF usa il **tipo** e non il nome del file: nessun documento già archiviato si perde.
- **«Attiva il servizio»** è ora un pulsante vero nell'hero accanto alla demo (l'esempio in PDF è passato a collegamento), più intestazione da schermo largo, menu, piede, sezione dedicata e richiamo finale.

**Regole nate qui:**
- **`translate` e `transform` sono due proprietà**: usarle insieme per la stessa centratura la applica due volte. In Tailwind v4 `-translate-x-1/2` scrive `translate`, non `transform`.
- **Una composizione a posizioni assolute va espressa in `em` con una radice proporzionale**, altrimenti esiste a una sola larghezza. `@container` + `min(px, cqw)` scala senza JavaScript.
- **Un difetto può reggere per caso su una misura sola.** Correggendolo «bene» si rompe la composizione che quel difetto teneva in piedi: le posizioni vanno ricalcolate, non solo depurate.
- **Il collaudo mobile misura, non guarda**: `scrollWidth - clientWidth` e il rettangolo di ogni elemento su tre telefoni veri. Le velature sfocate si escludono, perché escono apposta.
- **`.first()` prende il primo del documento, non il primo visibile**: il richiamo nell'intestazione esiste nel markup ma è nascosto sotto una certa larghezza, e misurarlo diceva «non c'è».

Gate: typecheck · build · **472 test** · `qa -- tutto-pubblico` **36 su 36 in produzione** (comprese le tre misure da telefono) · `qa -- tutto-demo` 68 · `qa -- tutto-attivo` 60.

**Il video bloccato dalla CSP, e il marchio schiacciato (2026-08-13)**

- **La CSP non dichiarava `media-src`**, quindi ricadeva su `default-src 'self'` e il browser **bloccava il video di benvenuto**, che sta su Supabase: non si apriva né da telefono né da computer. Segnalato dall'utente, non dai controlli.
- **L'intestazione a 768px**: comparivano insieme le cinque voci del menu e tre pulsanti, non ci stavano, e a cedere era il **marchio, ridotto a 14 pixel**. Corretto con `shrink-0` sul logo (strutturale), «Attiva il servizio» da `lg` invece che da `md`, ed etichetta corta nella barra («Prova la demo»): lì il pulsante deve entrare, non convincere.

**Regole nate qui:**
- **Un `<video>` non è una `fetch`.** Il collaudo scaricava il file con una richiesta di rete — che della CSP della pagina non sa niente — e diceva verde mentre il video non partiva. Ora il controllo lo fa **caricare davvero** (`readyState >= 2`, durata letta dall'elemento) e raccoglie gli eventi `securitypolicyviolation`. Provato rompendolo: senza `media-src` il controllo nuovo diventa rosso **mentre quello vecchio resta verde**, ed è esattamente il motivo per cui il difetto era passato.
- **Aggiungere una risorsa da un'altra origine significa aggiungere una direttiva**: `img-src` e `connect-src` c'erano perché quelle risorse erano state misurate; il video è arrivato dopo, e nessuno ha rimisurato.
- **Quando una barra si stringe, la prima cosa che cede è il marchio, e cede in silenzio.** `shrink-0` è la difesa strutturale: da lì in poi a cedere sono gli spazi, e se non bastano il difetto si vede.
- **«Accedi» nell'intestazione non è un richiamo commerciale**: è la porta di chi è già cliente e ha la sessione scaduta. Va tenuta, e va tenuta in secondo piano.

Gate: `qa -- benvenuto` **12 su 12 in produzione** · `qa -- tutto-pubblico` **37 su 37** (comprese le tre misure da telefono e quella del marchio a cinque larghezze).

**Prossima: CSP per ultima** — va fatta ora che Stripe è in piedi, altrimenti la si riapre subito per `js.stripe.com`.

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

**Audit di sicurezza e accensione di RLS (2026-08-14)** — il rilievo critico era vero, e taceva da tredici fasi.

**C1 — le 127 policy RLS non sono mai scattate in produzione.** Il ruolo `app_rls` esisteva dalla Fase 1, con le policy addosso e i permessi in ordine: gli mancava **`LOGIN`**. Non potendo connettersi, la produzione girava come `postgres`, che bypassa RLS. Undici mesi di lavoro sull'isolamento multi-tenant erano decorativi: reggeva solo il filtro applicativo, che c'è quasi ovunque — e dove non c'era (la SoA) non c'era niente.

Il passo era rimasto aperto perché **accenderlo rompeva il prodotto**: con `app_rls` `stripe_customer` respingeva l'inserimento e **nessuno riusciva più a pagare**. Undici punti interrogavano il database fuori da `withTenant`: pagamenti, provisioning, pagina dell'abbonamento, white-label, numerazione delle versioni dei documenti, cron dei rinnovi. Sistemati prima, poi acceso.

Prova sul campo, non deduzione: `app_rls` senza contesto vede **0** aziende su 327; nel contesto di uno studio vede esattamente le sue e **zero** di altri.

**Gli altri rilievi chiusi**: path traversal via `templateKey` (bastava un conto di prova per sovrascrivere il video di benvenuto di tutti); SVG accettati come immagini; SoA affidata alle sole policy in **dodici** punti, non i tre segnalati; messaggi d'errore che rimandavano al browser frammenti di query Postgres, il corpo delle risposte di Supabase e l'elenco di `/var/task/node_modules`; dati strutturati che un titolo del CMS poteva chiudere; password di collaudo pubblicata nel repository su conti creati in produzione; e il registro di audit che si poteva intestare a un altro studio (migrazione `0015`).

**Regole nate qui:**
- **Una difesa che nessuno ha mai visto scattare non è una difesa.** Le policy c'erano, i test le provavano, il documento le dava per attive: mancava la prova che in produzione *scattassero*, e nessuna di quelle tre cose poteva darla. Si chiede al database chi è connesso, e si prova a leggere le righe di un altro.
- **Il passo che chiude una difesa è quello che rompe qualcosa**, ed è per questo che resta aperto. Prima di accenderlo si cerca cosa smetterà di funzionare: fu così che venne fuori che nessuno avrebbe più potuto pagare.
- **Un messaggio fisso al posto di `e.message` sarebbe stato peggio del male**: nel prodotto ci sono 101 `throw new Error` scritti per il consulente. Si distingue **chi ha lanciato** (`e.constructor === Error` è vero solo per i nostri), non cosa c'è scritto — una proprietà strutturale, non un elenco di parole vietate da aggiornare a ogni libreria.
- **Un controllo aggiunto a una funzione scoperta è un controllo che nessuno ha verificato.** Il controllo nuovo sul caricamento immagini ombreggiava un parametro chiamato `tipo` e avrebbe rotto il logo per tutti: è passato per typecheck e 498 test perché quella funzione non aveva un solo test.
- **Un test che passa può passare per il motivo sbagliato.** Due casi del confine SoA erano fermati da un vincolo di unicità e da un'asserzione troppo stretta, non dal confine.
- **Il collaudo va scritto sulla regola verificabile, non su quella che si vorrebbe.** Il controllo sulle policy è stato riscritto due volte: la 0001 non nomina le tabelle, le scorre in un ciclo, e cercare `CREATE POLICY ... ON <tabella>` dichiarava scoperte cinque tabelle protette.
- **Google ruota gli indirizzi dei propri font.** Un build che li scarica dipende da un terzo nel momento peggiore; in locale la cache lo nasconde, e il guasto si vede solo dove la cache non c'è. Il carattere dei documenti che finiscono in mano ai clienti sta nel repository.
- **Dieci collaudi erano morti all'avvio** da quando è accesa la verifica dell'indirizzo, `qa-prod` compreso. Un controllo che non parte non è né verde né rosso: è assente, e sembra presente.

**Fuori perimetro per decisione, non per dimenticanza**: `'unsafe-inline'` nella CSP. Toglierlo richiede un nonce per richiesta, cioè rendere dinamiche home, blog e articoli — buttare via la staticità riconquistata correggendo il 500 sul primo articolo.

**Un rilievo era un falso positivo**, ed è scritto perché non venga "corretto": il nostro ordine di risoluzione dell'organizzazione nel limite di accessi è identico a quello del plugin di Better Auth (`body.organizationId || session.activeOrganizationId`). Invertirlo introdurrebbe il difetto che il rilievo temeva.

Gate: typecheck · build · **531 test** verdi in entrambi i modi, e `RLS_FORCE_ROLE=app_rls` non è più una prova di laboratorio: è come gira la produzione · in produzione `tutto-attivo` 30/30, `tutto-demo` 68/68, `tutto-pubblico` 37/37, `benvenuto` 12/12, `demo-completa` 9/9 · migrazione `0015` provata sul database in quattro casi, compreso quello che deve riuscire (il webhook di Stripe, che senza fallirebbe **dopo** aver incassato).

**Le due voci «nessuno l'ha mai visto funzionare» (2026-08-14)** — chiuse, e una delle due non funzionava.

**L'invito a un collega portava a una pagina che non esisteva.** `/accept-invitation/<id>` — l'indirizzo scritto nell'email — rispondeva **404 in produzione**. Il retro era pronto e scritto bene (chi ha un invito pendente non riceve uno studio proprio, la sessione punta subito allo studio giusto, il limite di posti si applica sia a chi invita sia a chi accetta): mancava la porta. È passato inosservato per settimane perché il collaudo si fermava a «l'invito parte», ed era scritto in `PRE-LAUNCH.md` che la metà che conta non l'aveva mai fatta nessuno.

La pagina è costruita sui casi in cui va storto: quattro stati distinti dell'invito (inesistente, scaduto, già accettato, annullato) perché i rimedi sono diversi; iscrizione **e** accesso sulla stessa pagina, perché un collegamento a `/login` riporterebbe al portafoglio lasciando l'invito in un'email già aperta; indirizzo bloccato su quello invitato; e nessuna accettazione silenziosa quando la sessione aperta è di un'altra persona.

**Il rinnovo al secondo anno, visto davvero.** Con un **orologio di prova** di Stripe: si crea l'abbonamento, si sposta il tempo di un anno e un giorno, ed è Stripe a far scattare il rinnovo. Il piano passa al prezzo ridotto, le estensioni si portano dietro il proprio, lo Schedule si stacca e l'account resta attivo — `subscription_schedule.released` non è una disdetta, e ora si sa invece di dedurlo.

**Regole nate qui:**
- **Un collaudo che si ferma a metà catena certifica la metà che funziona.** «L'invito parte» era verde da settimane mentre la porta non esisteva. La domanda da farsi non è «il pulsante risponde?» ma «la persona arriva dove doveva?».
- **Il tempo si può comprare.** Un comportamento che si manifesta fra dodici mesi non è «non verificabile»: `test_clock` lo fa accadere adesso, ed è l'unico modo di distinguere ciò che si è capito da ciò che si è dedotto.
- **Due moduli sulla stessa pagina producono `id` duplicati**, e l'etichetta dell'uno finisce a puntare al campo dell'altro. Gli identificativi vanno prefissabili, col valore predefinito vuoto perché il resto non cambi.
- **`getAttribute` su un attributo booleano restituisce la stringa vuota**, che è falsa: `readonly` presente sembrava assente. La domanda giusta si fa alla proprietà dell'elemento.
- **La controprova può non costare niente**: l'asserzione sull'invito era rossa contro la produzione (non ancora corretta) e verde in locale, nello stesso minuto.

Gate: **531 test** · `qa -- invito` **14 su 14 in produzione** · `qa -- rinnovo` 8 su 8 con l'orologio di prova, e messo in rosso di proposito rimettendo il difetto della fase 2 (che mostra il danno vero: accessi extra a **zero** e fattura di 1.100 € invece di 2.225 €).

**Pulizia della codebase (2026-08-14)** — cercavo codice morto, ho trovato soprattutto roba che mancava.

**Il contenitore dei messaggi non era montato.** `<Toaster />` non compariva in nessun layout, mentre sette componenti chiamano `toast(...)`: «collegamento copiato», «azienda archiviata», «nome dello studio aggiornato», gli errori del dialogo d'acquisto. **Nessuno li ha mai visti.**

E il seguito è peggiore del difetto: `comune-collaudo.mjs` cerca `[data-sonner-toast][data-type="error"]`, ed è **una delle tre spie di guasto** di ogni gesto. Quel selettore non poteva trovare niente — la spia non è mai stata in grado di accendersi. Il commento in testa a quel file dice «il terzo è il più importante, un collaudo che non lo guarda dichiara verde una pagina in cui non funziona niente»: era quello che stava succedendo a noi.

**`shadcn` era finita in `devDependencies` per un mio errore del giorno prima.** L'avevo spostata chiudendo un rilievo dell'audit, dandola per CLI di scaffolding. È anche quello, ma `globals.css` fa `@import "shadcn/tailwind.css"`: 629 righe di `@theme inline` nel CSS di produzione. Reggeva solo perché Vercel installa le devDependencies durante il build.

**Due variabili d'ambiente fuori dalla validazione**: senza `NEXT_PUBLIC_SENTRY_DSN` Sentry parte e non riporta niente, senza `BLOG_ALLARME_A` il giro quotidiano trova il guasto e non lo dice a nessuno. E `.env.example` elencava quattro delle sei obbligatorie in produzione: chi lo copiava otteneva un build che si rifiutava di partire.

Codice morto vero: **17 funzioni e 18 import**, ognuno verificato a una sola occorrenza subito prima di toglierlo.

**Regole nate qui:**
- **Una scansione di codice morto è anche una scansione di cablaggi mancanti.** Un componente che nessuno importa può essere spazzatura o può essere il pezzo che non è mai stato collegato: la differenza non si vede da un grep, si vede chiedendosi *chi lo userebbe*.
- **Uno strumento di misura che non può mai segnare rosso non lo si scopre guardandolo**: lo si scopre quando qualcos'altro comincia a funzionare. Vale la pena chiedersi, per ogni spia, quando è stata l'ultima volta che si è accesa.
- **Correggere un difetto può romperne uno strumento**: `pulisciAvvisi` strappava nodi dal DOM, innocuo finché non c'era niente da strappare. Un attributo in più React lo ignora, un figlio in meno no.
- **`shots*/` con la barra copre le cartelle, non i file.** Tre screenshot alla radice erano finiti versionati.
- **Non tutto ciò che non ha chiamanti va tolto.** `improntaCoincide` andava tolta perché lasciava credere protetto un confronto che non lo era; `requirePlatformAdmin` resta, perché non lascia credere niente — un'area staff non esiste — ed è una gamba di un terzetto in uso. La domanda non è «qualcuno la chiama?», è «la sua presenza fa credere qualcosa di falso?».
- **I tre `eslint-disable react-hooks/exhaustive-deps` non si toccano**: uno salva allo smontaggio dell'editor, un altro creerebbe un giro infinito di richieste. Il debito lì era il commento mancante, non la direttiva.

Gate: typecheck · build da `.next` cancellata · **531 test** in entrambi i modi · `npm ci --omit=dev` che installa shadcn · tutto-attivo 30/30 · tutto-demo 68/68 · tutto-pubblico 37/37 · benvenuto 12/12 · invito 14/14 — tutti **con la spia rossa finalmente viva**, e nessun difetto nascosto è emerso.

**Passata DRY (2026-08-14)** — la ripetizione faceva da conservante ai difetti.

Misurate ~2.400 righe di ripetizione su ~28.000. La cosa utile però non è stata la ripetizione: è che **dove una correzione era stata applicata a una copia e non alle altre, la duplicazione l'ha conservata**. Tre difetti veri, tutti della stessa forma.

`condivisione/actions.ts` rimandava ancora al browser il messaggio di qualunque eccezione — il difetto chiuso il giorno prima negli altri nove file di azione, saltato perché quel file aveva una gestione propria e quindi non aveva `daErrore` da correggere.

`energy/narrative.ts` aveva **due** punti a strato singolo, e il secondo l'ha trovato il collaudo mentre lo scrivevo per il primo: `addMedia` verificava il proprietario solo dentro il ramo «il capitolo non esiste», e `saveChapter` verificava il bilancio **senza filtrare per organizzazione** — la verifica c'era e non verificava niente. Nessuno dei due sfruttabile (RLS copre la lettura), ma erano gli ultimi punti con un solo strato.

`giro-completo.mjs` cercava `Controlli: N ok`, mentre `contatore().riepilogo()` stampa il titolo che riceve: **sei collaudi su quaranta, fra cui i tre più completi**, comparivano come «(nessun riepilogo)».

**Accorpato** (comportamento invariato): `fileADataUrl` (3 copie identiche), `accoda()` (2), gli schemi `companyId` e `anno` (16 occorrenze), `latest*SetId` (4 cloni), i cinque `percorso()` derivati dal registro dei moduli, e `src/__tests__/comune.ts` — dove `creaStudio`/`pulisciStudio` erano **già state scritte due volte, con lo stesso nome, da due autori diversi**.

**Non accorpato, e messo per iscritto**: la famiglia `set*Field` (nove risposte diverse alla stessa domanda, nate da tre difetti reali), la sequenza di mutazione (il default diventerebbe «rivalida sempre» cancellando tre eccezioni deliberate), i comandi ottimistici (quattro casi su sette cambierebbero comportamento al rifiuto), la fusione `narrative`/`chapters` (`piena/meta` contro `full/half` è dato persistito negli snapshot congelati).

**Regole nate qui:**
- **Una ripetizione è anche un archivio di versioni.** Se cinque copie divergono, una di loro è la più recente: cercare la duplicazione è un modo di trovare le correzioni non propagate. Tre su tre dei difetti di oggi si sono presentati così.
- **Quando la stessa astrazione nasce due volte da sola**, con lo stesso nome, da due persone diverse, è il momento di darle una casa. Non serve altra giustificazione.
- **Non tutto ciò che si ripete va accorpato, e la domanda giusta non è «sono uguali?» ma «rispondono alla stessa domanda?».** Le nove `set*Field` si somigliano e rispondono a nove domande diverse: una cancella la riga se sei campi si svuotano, un'altra se si svuotano anche i dodici mesi, un'altra usa `array_append` per non fare read-modify-write.
- **Accorpare può cancellare una decisione.** Il rischio non è il difetto: è che il valore predefinito del nuovo aiutante seppellisca un'eccezione che qualcuno aveva pagato con un guasto.
- **Un aiutante condiviso può togliere la spiegazione insieme alla ripetizione.** L'entitlement nei test resta scritto in ogni file perché in tre casi su diciotto quella riga **è** il test.
- **Quando l'accorpamento non è meccanico, il valore si salva alla fonte.** Dodici script ricalcolano un dato che `registraEEntra` restituisce già: unificarli costa dodici collaudi da minuti per venti righe, ma una nota dove nasce impedisce al prossimo di copiare l'abitudine.

Gate: typecheck · build · **534 test** in entrambi i modi, compreso `RLS_FORCE_ROLE=app_rls` · i due confini di tenant provati **rompendoli** · in produzione `tutto-attivo` 30/30 e `tutto-demo` 68/68 · `energetico` 40/40 con console pulita.

**Audit dell'integrazione Stripe (2026-08-15)** — chiesto contro tre pilastri (chiavi di idempotenza, registro immutabile, sicurezza del webhook). Il difetto grave non stava in nessuno dei tre.

**Il verdetto onesto sui tre.** Il **webhook era già solido**: firma sul corpo grezzo, 400 senza dettagli, segreto assente → 500 e non 200, stato riletto da Stripe e mai dal payload, `default` a 200 perché un 500 su un evento inutile fa disabilitare l'endpoint e con l'endpoint spento si fermano anche gli eventi che pagano. L'**idempotenza in uscita era già coperta, ma non da noi**: l'SDK genera da solo un `Idempotency-Key` per ogni POST quando `maxNetworkRetries > 0` (letto nel sorgente installato), quindi lo scenario da manuale — timeout, ritentativo, doppio addebito — non ci riguardava. Restava scoperto ciò che sono **due chiamate distinte**, ed è lì che stava il difetto vero.

**Il difetto vero era un pulsante.** Nella pagina dell'abbonamento, a chi aveva già pagato comparivano gli altri piani con «Passa a questo». Quel comando apre una sessione di checkout in `mode: "subscription"` sullo stesso cliente: Stripe avrebbe creato un **secondo abbonamento annuale**, i due sarebbero coesistiti in `stripe_subscription`, `org_entitlement` è una riga sola e ne avrebbe mostrato **uno**, e il portale ha disdetta e cambio piano spenti di proposito — **nessuna via d'uscita dall'applicazione**. In produzione: 8 abbonamenti su 8 organizzazioni distinte, nessuna con più di uno. Non aveva ancora morso. Ora `bloccoAlCheckout` rifiuta **lato server** prima di qualunque chiamata a Stripe, e l'interfaccia dice a chi scrivere.

**Il claim del webhook non distingueva «fatto» da «morto a metà».** `rilascia` sta in un `catch`, che intercetta le eccezioni JavaScript e non il timeout della funzione, un OOM, o un guasto del database durante la `rilascia` stessa. Quando il processo moriva la riga restava, Stripe ritentava, la rotta rispondeva `200 «già processato»` e Stripe smetteva di ritentare: **un cliente che ha pagato restava bloccato, con 200 su tutta la linea e nessun errore in nessun log**. Migrazione `0016`: uno `stato`, e il ripescaggio di un claim vecchio in **una sola istruzione atomica** (`insert … on conflict do update … where`). Spezzarla in select+update riaprirebbe la corsa che quel file esiste per chiudere. E la rotta del webhook era **l'unica delle tredici senza `maxDuration`**, mentre faceva sei viaggi verso Stripe di cui uno inutile: era l'innesco.

**Il registro delle capacità (`entitlement_event`, migrazione `0017`), e perché non è quello chiesto.** Un registro monetario a righe `initiated/authorized/captured/refunded` registrerebbe cose che non facciamo: il nostro database **non contiene un solo importo** — nessun `amount`, fattura, rimborso, saldo — e non chiamiamo mai `paymentIntents`, `charges`, `refunds`. Sarebbe una copia di un sistema che quel registro ce l'ha già, con l'unica certezza di divergere in silenzio a ogni tocco sul cruscotto Stripe, e non chiuderebbe nessun obbligo: quello fiscale italiano è la fattura elettronica via SdI, che resta la casella aperta in `PRE-LAUNCH.md`. Quello che invece era nostro e si perdeva è la **capacità**: `org_entitlement` è una riga sola, sovrascritta dall'ultimo evento. Ora ogni cambiamento è anche una riga append-only, scritta **nella stessa transazione** dello stato, con dentro il filo che mancava del tutto — `stripe_event_id` (`stripe_processed_event` non poteva servire allo scopo: viene **cancellata** sui fallimenti). Immutabilità coi **tre** pezzi di `document_snapshot` e non con uno solo: trigger che vale anche per la connessione privilegiata, revoca sul ruolo applicativo, policy RLS. `audit_log` ha solo il secondo.

**La conseguenza che si vede subito.** `activated_at` si riscriveva a ogni evento con un piano, **rinnovo annuale compreso**, e quel campo alimenta il recesso a quattordici giorni **promesso dai Termini**: si riapriva da solo ogni anno per chi non aveva pubblicato documenti. Ora `attivatoIl` è il primo evento del registro che porta in `active`, e il registro non si riscrive.

**Le minori, tutte verificate**: `clienteDelloStudio` restituiva il cliente **appena creato** dopo un `onConflictDoNothing`, quindi il perdente di una corsa pagava su un cliente che il nostro database non conosce e non trovava più le proprie ricevute nel portale; due eventi diversi creavano entrambi lo Schedule a due fasi (500 spurio a ogni pagamento); l'`UPDATE` dell'entitlement senza `.returning()` poteva non toccare nulla **in silenzio** mentre l'audit scriveva «aggiornato» e il webhook rispondeva 200; i tetti delle estensioni erano **due** (10/20 nel dialogo, 500/200 nella server action) e ora vengono dal listino; `z.coerce.boolean()` trasformava la stringa `"false"` in `true`, aggiungendo una riga a pagamento.

**Regole nate qui:**
- **Un collaudo dichiara sempre contro quale indirizzo sta parlando.** Prima l'URL compariva solo con `--prod`, quindi un referto senza URL poteva voler dire due cose opposte. Ho passato `BASE_URL=…`, che nessuno script legge — il flag è `--prod` — e ho ottenuto tre referti verdi contro un `next start` acceso ore prima con un altro codice, dandoli per fatti sul sito vero. Ora il bersaglio è stampato in entrambi i casi. **Un collaudo che non dice contro cosa ha parlato può essere verde sul bersaglio sbagliato.**
- **Un test che passa contro una tabella vuota non prova niente.** La sonda diceva «trigger non bloccato»: la tabella aveva zero righe, quindi zero righe erano state toccate.
- **Drizzle incapsula gli errori di Postgres.** Un `toThrow(/append-only/)` sul solo messaggio esterno fallisce pur essendo stato bloccato davvero: si guarda anche la `cause`.
- **La prima spiegazione plausibile va messa alla prova.** Avevo riferito — e un agente di ricerca aveva confermato — che «Passa a questo» era raggiungibile con un clic dall'interfaccia. Contando le graffe, quel ramo era **irraggiungibile**: la condizione avvolgeva l'intera griglia dei piani. Il buco lato server c'era davvero, ed era un altro; e c'era il difetto **opposto**, che nessuno aveva cercato — un account scaduto conserva `piano`, quindi non avrebbe **mai più** rivisto i piani da comprare.
- **Un collaudo va rilanciato anche quando non l'hai toccato.** `verifica-checkout` falliva **dal 13 agosto**: è del 10, quando il pulsante portava dritto a Stripe, e il 13 è stato inserito il dialogo delle estensioni. Le date lo dicono, e nel frattempo nessuno l'aveva più lanciato.
- **Ogni test nuovo è stato messo in rosso di proposito**, rimettendo il difetto, per vedere che fallisse sull'asserzione giusta.

Gate: typecheck · build · **549 test** in entrambi i modi, `RLS_FORCE_ROLE=app_rls` compreso · registro provato immutabile **anche con la connessione privilegiata**, e con la riga intatta dopo il tentativo · `qa -- rinnovo` 8/8 attraverso il webhook modificato · in produzione `tutto-attivo` 30/30, `tutto-demo` 68/68, `benvenuto` 12/12 · `qa -- checkout` 6/6 fino alla pagina di pagamento vera, con l'importo giusto.

⚠️ **Resta aperto** (nel piano, non fatto): il travaso in `entitlement_event` delle 58 righe di `audit_log` degli abbonamenti già attivati. Non è urgente — `attivatoIl` ha la colonna come ripiego per chi è stato attivato prima che il registro esistesse — ma finché non si fa, la storia comincia il 15 agosto 2026.

**Le email di Stripe al committente, e il difetto che c'era sotto (2026-08-16)**

Il committente inoltra quattro schermate: Stripe segnala **93 consegne fallite** al webhook `https://evalisdeck.it/api/stripe/webhook`, e minaccia di disattivarlo il 22 agosto.

**Non era un guasto, ed era la sandbox.** L'ID account dell'email (`acct_1U3Gy0AhHHoi7ST9`) è quello della chiave di prova locale. In quella sandbox c'era **un solo** endpoint, registrato l'11 agosto e puntato al sito vero: la produzione ha il segreto **vivo**, quindi un evento firmato con quello di prova non può che essere respinto — misurato, non dedotto: `400 {"errore":"firma non valida"}`. I 93 eventi erano i nostri collaudi del 13 agosto (estensioni, checkout, orologio di prova). **Il rimbalzo era il controllo della firma che funziona**: se la produzione accettasse un evento firmato col segreto di prova, *quello* sarebbe il difetto grave. Endpoint cancellato dalla sandbox: non lo usa nessuno, i collaudi consegnano gli eventi firmati **a mano**.

**Cercando la conferma è saltato fuori un difetto vero, nel percorso dei pagamenti.** `occurredAt: causa ? new Date(causa.created * 1000) : null` — il ternario controllava **l'oggetto**, non il campo. Senza `created` nasceva `new Date(NaN)`, Drizzle ci chiamava sopra `toISOString()` e sollevava `RangeError` **dentro la transazione del provisioning**: webhook 500, Stripe ritenta, e un cliente che ha pagato resta senza servizio. Ora `dataDaEpoch` restituisce `null` quando l'istante non si sa: **il registro non deve mai poter far fallire il lavoro che sta registrando**, e un timestamp mancante è una nota di cronaca, non un motivo per bloccare un'attivazione.

**In produzione non aveva morso**, verificato sui dati: l'ultimo evento webhook reale è del 14 agosto 21:18, prima del rilascio. E con Stripe vero non morderebbe comunque, perché gli eventi reali portano sempre `created`. A farlo esplodere era la busta **sintetica** di `verifica-rinnovo`, che dichiarava in un commento di mandare un evento vero mentre ne ometteva un campo obbligatorio.

**Regole nate qui:**
- **La stessa regola scritta ieri l'ho violata oggi.** Il gate del 15 agosto dava `qa -- rinnovo` 8/8 mentre il webhook era rotto: girava contro un `next start` acceso prima delle modifiche, e il codice del registro non è mai passato di lì. **Prima di ogni collaudo locale si confronta l'orario del processo con quello del build** — qui il server era di 18:11 e il build di 18:30, diciannove minuti di scarto e un referto che mentiva.
- **La busta finta va tenuta vicina a quella vera.** Una busta che omette un campo che il mittente vero manda sempre non prova quello che succede in produzione, e in compenso fa fallire cose che in produzione non falliscono.
- **Un collaudo che dichiara «l'evento è vero» va letto due volte**: qui l'OGGETTO era vero, riletto da Stripe; la busta la costruivamo noi. Il commento non distingueva, e la distinzione era tutto.
- **Le notifiche Stripe sono per utente, non per account**: nessuno può spegnerle a un altro. Per togliere il rumore tecnico al committente si aggiunge prima un nostro indirizzo al team, e **solo dopo** lui si disiscrive dalle proprie preferenze. Spegnerle e basta lascerebbe senza ascolto anche il guasto vero dell'endpoint vivo.

Gate: typecheck · build · **550 test** in entrambi i modi, `RLS_FORCE_ROLE=app_rls` compreso · il test nuovo scritto **prima** e visto fallire con `RangeError` · `qa -- rinnovo` 8/8 sul build corretto, con l'orario del processo verificato.

**Fasi 0, A, B e C dei sei nuovi moduli (2026-08-22)** — ambiente sicuro, motore del corpus, collaudi strutturali, aree.

- **Fase 0 — due database.** Vedi la voce «Due database» piu' sopra. In piu': `qa.mjs` impostava `BASE` **solo** con `--prod`, e nove script su trentuno hanno come predefinito il sito vero: `npm run qa -- tutto-demo` andava a registrarsi in produzione stampando «localhost». Tre utenti e tre organizzazioni scritti nel database che incassa, poi rimossi in transazione. Ora `BASE` si imposta sempre e il bersaglio si stampa in entrambi i casi.
- **Fase A — il motore comune del corpus.** 447 documenti, 6.489 blocchi, 80 schede di segnaposto, 70 registri, 779 colonne. **Una riga per blocco** e non un JSONB per documento: la personalizzazione del cliente diventa una chiave esterna vera, e cancellare una versione in uso lo rifiuta il database. **Chiavi dei blocchi derivate dal contenuto** (FNV-1a), mai dalla posizione. **I segnaposto sono due meccanismi**: 31 token si sostituiscono, 49 caselle si riempiono a mano.
- **Fase B — i collaudi non si appendono piu' ai nomi.** Ancoraggi `data-percorsi`/`data-modulo` sulle tre superfici che elencano i moduli. Quattro difetti veri trovati cercando la baseline (sotto).
- **Fase C — le aree.** `AREE_MODULI` + `area` per modulo, colore **dall'area**, `documenti` come tupla **non vuota** (il primo e' il principale), registro **ordinato per area**, `MODULI_PER_AREA` derivato, filtro d'area nell'archivio. Le cinque tinte restano: cambia a chi appartengono, e **un solo modulo cambia colore** (il Bilancio energetico, che entra nell'area del GHG e libera l'ambra per la responsabilita' dell'ente).

**Regole nate qui:**
- **Le classi Tailwind si scrivono per esteso, mai costruite con un template literal.** Tailwind genera le utility scandendo il TESTO: `bg-area-${a}` non esiste da nessuna parte, e i riquadri restano senza fondo. Delle cinque aree solo una aveva il colore, e ce l'aveva **per caso** — `bg-area-ambiente` compare in un esempio dentro `DESIGN.md`, che il scanner legge. Difetto che il compilatore non vede (le stringhe sono valide) e che i collaudi funzionali non vedono (la pagina si apre, i comandi rispondono): **si vede solo guardando**.
- **Un collaudo che si ferma al database non prova cio' che l'utente vede**, e uno che legge tutta la pagina prova troppo: cercare «Statement (SoA)» nel testo di `main` lo trova sempre, perche' e' scritto sulla pastiglia del filtro. I risultati si contano sui risultati.
- **`limit 1` senza filtrare l'azienda pesca la dimostrativa.** Da quando la demo ha tutti e cinque i percorsi, il primo progetto del 2025 di un'organizzazione e' il suo: `visual-check-bilancio` seminava i punteggi in un progetto e ne guardava un altro, poi accusava la materialita'.
- **Un ternario che salta il proprio popolamento e' peggio di un errore**: il collaudo falliva trenta secondi dopo, indicando il posto sbagliato. Il presupposto si pretende, e le righe seminate si verificano.
- **Il velo dei giri guidati intercetta i clic, e lascia passare il primo.** Driver.js taglia un buco sopra l'elemento in evidenza: il gesto sull'elemento giusto riesce, quello dopo no, e il referto accusa il prodotto. Ora c'e' `spegniTour` in `comune-collaudo.mjs`.
- **`npm run test | tail` scarta il codice d'uscita.** In una pipe il risultato e' quello dell'ULTIMO comando: la suite puo' fallire e il referto uscire con zero. Il conteggio stampato («1 failed | 661 passed») resta l'unica prova, e va letto. La suite si lancia senza pipe.
- **L'app non segue `prefers-color-scheme`**: ha un interruttore. `emulateMedia({colorScheme:"dark"})` non cambia niente, e le foto «scure» sono chiare identiche.

⚠️ **Difetto aperto, in `PRE-LAUNCH.md`**: nel build di **produzione** il portafoglio non si aggiorna dopo aver creato un'azienda — mai, non «in ritardo». La richiesta parte e il server risponde col dato giusto: e' il client a non applicarlo. In `npm run dev` compare dopo tre secondi. Non verificato in produzione perche' significherebbe scrivere un'azienda vera nel database che incassa.

Gate: typecheck · build · **662 test** in entrambe le modalita' · in locale sul build di **produzione** `tutto-attivo` 30/30, `tutto-demo` 68/68, `demo-completa` 9/9, `fornitore` 28/28, `energetico` 40/40, `soa-percorso` 34/34, `guida` 7/7, `bilancio` verde · aree verificate a schermo nei due temi.

**Il portafoglio che non si aggiornava (2026-08-23)** — debito aperto il 22, chiuso il 23. Le cause erano **tre**, ciascuna sufficiente da sola, ed e' il motivo per cui i tre tentativi del giorno prima erano falliti: correggevano una cosa per volta su un difetto che ne aveva tre.

| Comando | Rimedio | Prima | Dopo |
|---|---|---|---|
| ripristina (voce di menu) | togliere `revalidatePath("/dashboard")` dall'azione | mai | 7,7 s |
| archivia (dialogo) | + rimandare `router.refresh()` al tick successivo | mai | 7,2 s |
| crea (dialogo) | navigare al fascicolo: il refresh non basta mai | mai | 7,2 s |

**Regole nate qui:**
- **`revalidatePath` su una pagina `force-dynamic` non protegge niente e puo' rompere l'aggiornamento del client.** Non c'e' cache da invalidare — ne' sul server, che rende a ogni richiesta, ne' sul client, che con `staleTimes.dynamic: 0` rifa' la richiesta a ogni navigazione.
- **`router.refresh()` chiamato nello stesso tick in cui si chiude un dialogo non si applica.** Basta `setTimeout(..., 0)`: non e' un ritardo, e' un ordine. Non serve attendere l'animazione.
- **Dopo aver creato qualcosa si NAVIGA verso quel qualcosa.** Sul portafoglio il refresh non basta comunque, ed e' anche la cosa giusta: chi crea un'azienda vuole aprirla, ed e' cio' che gia' facevano SoA ed energetico.
- **Un difetto con piu' cause si isola una variabile per volta, e l'ipotesi va messa alla prova anche quando spiega tutto.** L'ipotesi «revalidare la pagina su cui ci si trova» spiegava il portafoglio e l'ho creduta finche' non l'ho provata sul modulo: li' la stessa cosa funziona. **Si sa cosa succede, non perche'** — ed e' scritto nel codice.
- **Non si corregge un collaudo su un solo fallimento.** `energetico` e' passato 40/40 piu' volte in giornata e una volta no: la "correzione" che avevo scritto introduceva una query su una connessione vecchia di dieci minuti, cioe' una fragilita' nuova. Ripristinato.
- **Un aiutante che aggira un difetto va rivisto quando il difetto si chiude**: `attendiCard` ricaricava per compensare, e ora deve sapere che creare un'azienda porta altrove.

Guardia: `npm run qa -- portafoglio-aggiorna` — cinque controlli che **non ricaricano mai** la pagina dopo una mutazione. Messo in rosso rimettendo una delle tre cause: fallisce sull'asserzione giusta e solo su quella.

**Fasi D, E ed F (2026-08-22/23) — tre moduli su sei: ISO 37001, Modello 231, Segnalazioni**

Il prodotto passa da cinque moduli a **otto**. I tre nuovi stanno tutti nell'area «responsabilita' dell'ente», e sono legati per legge: il 231 contiene gia' una procedura sul canale di segnalazione (art. 6 c. 2-quater), ISO 37001 ha i propri registri di segnalazione e indagine.

- **Fase D — Prevenzione della corruzione (UNI ISO 37001).** Motore in TDD (media delle sole dimensioni compilate, flag che elevano il livello, otto obblighi dichiarativi), schema e cataloghi, due documenti (Relazione all'organo di governo, Matrice di conformita'), interfaccia a cinque viste, tour, dimostrativa.
- **Fase E — Modello 231.** Rischio a due stadi (probabilita' per impatto, poi incrocio con l'adeguatezza dei presidi), 25 reati, 10 pilastri, 81 presidi, due documenti (Matrice reati-processi, Relazione dell'OdV).
- **Fase F — Gestione delle segnalazioni (D.Lgs. 24/2023).** 82 requisiti su 10 capi (A÷L, **senza J e K**: nel decreto non esistono), un documento (Relazione periodica).

**Il modulo Segnalazioni NON raccoglie segnalazioni**, e nessuna sua colonna puo' contenere un nominativo: il legame fra codice e persona resta custodito dal gestore fuori dall'applicazione. Chi aggiungesse un campo «nominativo» cambierebbe la natura giuridica del prodotto. Due cose che negli altri moduli non esistono:

- **Il canale e' un'ENTITA'**, una riga per forma. Nel prototipo erano tre caselle di testo e nessuno verificava che fossero riempite: un ente con la sola casella di posta risultava a posto, mentre l'art. 4 c. 1 pretende scritta, orale e incontro diretto, **cumulative**. Con una riga per forma la verifica e' totale, e distingue «non istituita» da «prevista e spenta»: il rimedio e' diverso.
- **La lettura di un fascicolo SCRIVE**, ed e' una precondizione: se l'audit fallisce, il fascicolo non si apre. E' il contrario della regola scritta per il webhook di Stripe, e le due non si contraddicono — li' il registro annotava un lavoro gia' pagato, qui il registro **e'** la garanzia.

**Regole nate in queste tre fasi:**

- **Un requisito applicabile e non valutato pesa ZERO, non viene ignorato.** I prototipi mediavano i soli valutati: tre requisiti conformi su venti davano **100**, lo stesso numero di «tutti e venti conformi». Tre situazioni opposte, un numero solo, su un documento che va a un ente di certificazione. La regola sta in `src/lib/calc/comune/valutazione.ts`, condivisa da tutti i moduli di conformita'.
- **Il 31 febbraio non e' una data.** `new Date("2026-02-31")` non solleva, scivola al 3 marzo. Il validatore ricompone la data e la confronta (`dataIsoSchema`), e i CHECK sulle quattro date da cui discende un termine perentorio fermano il formato italiano.
- **I termini di legge si calcolano in UTC.** Il prototipo interpretava la data a mezzanotte UTC e la manipolava in ora locale: su un browser italiano l'avviso del 25 marzo scadeva il 31 invece che il 1 aprile. Su un termine perentorio e' una violazione. E i mesi si **agganciano** all'ultimo giorno invece di traboccare. Nel caso del 31 gennaio i due difetti si annullavano: correggerne uno solo peggiorava le cose.
- **Un contatore, non `max(numero) + 1`.** Regge cancellando un fascicolo in mezzo e cede sull'ultimo: il massimo scende e il numero viene **riusato**. Il vincolo di unicita' non puo' accorgersene, perche' la riga vecchia non esiste piu'. I registri rimandano al fascicolo per numero, quindi il «2» nuovo eredita i rimandi del «2» cancellato. **Trovato dal collaudo dell'interfaccia, non dal test su database**, che cancellava un fascicolo in mezzo.
- **Un `next start` puo' non essere quello che credi.** Non basta avviarlo dopo il build: se un server di ore prima e' ancora acceso, il tuo muore con `EADDRINUSE` e la porta risponde 200 lo stesso. Confrontare l'ora del build con quella in cui **hai lanciato** un server non prova niente. `pretendiServerAggiornato` chiede al server il manifesto del build corrente: un server vecchio risponde 404.
- **Rendere un componente in isolamento non e' una misura fedele di cio' che arriva al browser.** Un avviso legale leggeva «Natura del documento.La relazione»; nel sorgente lo spazio c'era, e `renderToStaticMarkup` lo restituiva. Sulla pagina vera non c'era. Lo spazio dopo un tag in linea si scrive con l'espressione esplicita, e `documenti-spazi-pure.test.ts` lo pretende su tutti i template.
- **La mappatura fra le chiavi di un motore e i nomi delle colonne va resa esplicita e verificata dal compilatore.** Le colonne portano prefissi (`ritIdentitaConoscibile`) perche' il fascicolo ha settanta campi; il motore no. Passando il fascicolo intero, il motore trovava sei fattori vuoti e restituiva livello ignoto per tutti, cioe' «monitoraggi dovuti: zero» in un documento destinato all'organo di controllo.
- **Uno scanner che cerca `azione:` senza confine di parola trova `consultazione:`.** Segnalava un'azione fantasma «ok», e il rimedio sbagliato era a portata di mano: aggiungere l'etichetta al registro, cioe' una voce falsa per zittire un controllo che diceva il falso.
- **Un'etichetta vuota lascia un campo senza nome accessibile.** `CampoScelta` ha `etichettaNascosta`, che tiene il nome e toglie l'ingombro.
- **`ENOTFOUND` a raffica non e' una regressione.** Una suite che fallisce su 33 file in un terzo del tempo abituale sta dicendo che il database non si risolve, non che il codice si e' rotto. Si verifica la raggiungibilita' e si rilancia, non si corregge.

**Il FASCICOLO di una segnalazione non e' un documento pubblicabile**, e la ragione e' di chiave: l'unicita' di uno snapshot e' `(azienda, tipo, anno, versione)` e manca l'asse «quale fascicolo». Con `anno = 0` il fascicolo 3 e il 7 diventerebbero due versioni dello stesso documento, con lo stesso nome di file. La scelta fra un quarto asse e una stampa non congelata **e' del committente** (quesito A9 riaperto).

Gate delle tre fasi: typecheck · build · **970 test** · `qa -- mog231-percorso` 19/19 · `qa -- segnalazioni-percorso` **46/46** con documento reale pubblicato e PDF verificato.

⚠️ **DEBITI APERTI, misurati e non ricordati:**

1. **Il corpus non ha superficie.** Il motore della Fase A c'e' ed e' provato, le **letture non esistono**: zero funzioni esportate che elenchino documenti, carichino blocchi o leggano righe di registro. Le due sole `select` fuori dai test sono guardie interne. Sono **42 procedure, 135 moduli, 37 registri, 390 colonne** seminate e irraggiungibili sui tre moduli usciti. Il test non poteva vederlo: verifica le scritture interrogando il database direttamente.
2. **Colophon e pagina pubblica di verifica** (A17b + A18, decisi il 2026-08-21) non esistono: nessuna rotta di verifica, e il codice sta su **un solo** documento, l'attestato. Il piano ci mette una scadenza dura — **prima della prima pubblicazione in produzione**, perche' gli snapshot sono immutabili e un documento senza codice non potra' mai averlo. Non ancora violata solo perche' i tre moduli non sono in produzione.
3. **I registri segnalazioni duplicati** in 231 (`MOD-06.02`) e ISO 37001 (`MOD-11.02`) sono ancora scrivibili. Toglierli dal corpus non si puo': e' versionato e **congelato alla creazione**, quindi i modelli gia' avviati non vedrebbero la versione nuova. La strada e' renderli di sola lettura quando il modulo Segnalazioni e' attivo, col rimando al fascicolo dove i termini si calcolano davvero.

**Fasi G, H e I (2026-08-23/24) — SGI QAS, SA8000/2026, Due diligence di filiera. Undici moduli.**

Il debito numero 1 della voce precedente è chiuso: il corpus ha la sua superficie
(`src/features/corpus/letture.ts` e `sezione-corpus.tsx`, un punto di integrazione solo
invece di tre viste per modulo). La guardia `corpus-segnaposto.db.test.ts` ha trovato
**quattro** mappature mancanti su quattro moduli diversi, l'ultima delle quali era un
campo che allo schema mancava davvero (il sito dove SA8000 chiede che la politica sia
pubblicata).

- **SGI QAS**: `norme` come `text[]` con indice GIN, e il **perimetro decide cosa conta** —
  chi è certificato solo ISO 9001 vede 57 requisiti, non 107. Un indicatore senza target
  NON è «a target»: nel prototipo `Number("") === 0` lo rendeva conforme, e il ramo soglia
  era irraggiungibile.
- **SA8000/2026**: 112 criteri, «parziale» pesa **zero** e non metà (divergenza voluta dal
  QAS, e la ragione regge da sola). I cinque fondazionali stanno **insieme** sotto `F`: nel
  prototipo `codice.split(".")[0]` su «F1» dava «F1», e finivano in cinque riquadri senza
  titolo mentre `grp.F` era lì scritto per loro.
- **Due diligence di filiera**: due assi ortogonali, e la correzione del difetto B2 — un
  partner che aveva risposto a **una sola domanda di governance** otteneva maturità 4,0 e
  rischio Basso, con verifica ogni 48 mesi invece di 12. Il silenzio sulle tre aree critiche
  ora **limita** la maturità invece di premiarla.

**Regole nate qui:**
- **Un file che il seme legge e che nessuno rigenera è un catalogo che invecchia in
  silenzio.** Tre file di SA8000 erano stati normalizzati a mano una volta sola:
  rilanciare l'estrattore aggiornava i grezzi e il seme continuava a leggere la prima
  versione. Nessun conteggio se ne sarebbe accorto — i numeri sarebbero rimasti giusti.
- **L'ordine di un catalogo non è per forza l'ordine in cui si legge.** I gruppi SA8000
  arrivano nell'ordine dell'oggetto del prototipo, che comincia da M, mentre sezioni e
  criteri cominciano da F: chi apriva i criteri trovava aperto M1 sopra un elenco che parte
  da F1. Trovato dal collaudo, non dai test.
- **Il plurale italiano non si fa attaccando lettere in coda**: «3 areae criticahe non
  valutatae». Si vede solo stampando il testo reso.
- **`CampoScelta` non è un `<select>` nativo**: `selectOption` fallisce, si apre il
  combobox e si sceglie l'opzione per nome accessibile.
- **Una colonna in camelCase in uno schema snake_case si paga nei collaudi**, che
  interrogano in SQL grezzo. Va corretta quando costa poco, cioè subito.
- **L'itinerario di benvenuto è capato a UNA TAPPA PER AREA.** Undici moduli farebbero
  dodici tappe, e chi si è appena registrato le chiude a metà — e chi chiude un tour dice
  «basta spiegazioni», non «basta prodotto». Sei restano sei, e chi guarda impara che le
  aree sono cinque, non che le pagine sono dodici.

Gate: typecheck · build · `qa -- sa8000-percorso` 30/30 · `qa -- filiera-percorso` 34/34 ·
`qa -- guida` 7/7 con tutti e undici i percorsi · PDF reali (237 KB e 241 KB) · console
pulita. Ogni test nuovo messo in rosso di proposito rimettendo il difetto.

⚠️ **Debiti ancora aperti** (i punti 2 e 3 della voce precedente restano):
**colophon e pagina pubblica di verifica** — da fare **prima della prima pubblicazione in
produzione**, perché gli snapshot sono immutabili — e i **due registri segnalazioni
duplicati** in 231 e ISO 37001, da rendere di sola lettura quando il modulo Segnalazioni è
attivo. In più: il **giro con i DevTools su ogni singolo comando** dei sei moduli nuovi,
che il committente ha chiesto **per ultimo**, dopo che tutti i prototipi fossero portati.

### Consegne al committente
I documenti generati vanno raccolti in `Desktop/EvalisDeck - Documenti` (PDF reali, non mock), aggiornando la cartella a ogni nuovo tipo di documento prodotto.

