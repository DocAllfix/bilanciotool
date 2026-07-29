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

**Prossima: Fase 3** — design foundation (skill impeccable/ui-ux-pro-max/dataviz, token, DESIGN.md, shell app con dati mock). Le domande di `impeccable shape` vanno poste all'utente. Vercel si collega in Fase 8 (deciso con l'utente).

