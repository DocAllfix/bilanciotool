# Pattern di riferimento (da FormazioneEvalis) — adattati a questo progetto

Regole: la repo di riferimento è clonata **in sola lettura** in `C:\Users\user\riferimenti\FormazioneEvalis` e **non va mai modificata né copiata 1:1**. Questo documento descrive i pattern che adottiamo e **come li adattiamo** al nostro dominio (SaaS ESG multi-studio). I path citati sono nella repo di riferimento.

## 1. Webhook Stripe idempotente — `src/app/api/webhooks/stripe/route.ts` + `src/features/billing/*`

Pattern: verifica firma → *claim* dell'`event.id` in una tabella dedicata via `insert().onConflictDoNothing().returning()` (zero righe = replay → 200) → provisioning → *release* del claim su qualunque failure (così Stripe ritenta) → 409 se il customer non è mappabile a un'organizzazione → per le subscription **mai fidarsi del payload**: re-read con `stripe.subscriptions.retrieve()`.

**Adattamenti nostri**: la reference vende corsi one-off e seat subscription; noi abbiamo UN solo prodotto per account con **Subscription Schedules a 2 fasi** (anno 1 pieno → rinnovo ridotto) e dobbiamo gestire anche `invoice.paid` / `invoice.payment_failed` e `subscription_schedule.released` (assenti nella reference). Il provisioning non crea enrollment ma muta `account_state` (demo→active, past_due→sola lettura). La macchina a stati vive nel codice, non in un documento a parte: `statoDaStripe` e `applicaAbbonamento` in `src/features/billing/provisioning.ts`, con `vociDelRinnovo` in `fasi.ts` per la seconda fase. Il passaggio anno 1 → rinnovo e' provato con un orologio di prova di Stripe (`npm run qa -- rinnovo`).

## 2. Multi-tenancy RLS — `src/lib/db/tenant.ts` + migrazioni 0007/0012–0015/0020/0023

Pattern: `withTenant(ctx, fn)` apre una transazione e imposta GUC transaction-local (`set_config('app.user_id'| 'app.org_id'| 'app.platform_admin', …, true)`); le policy leggono `current_setting(..., true)` → NULL se non impostata → default-deny. Ruolo `app_rls` NOBYPASSRLS in produzione; seam di test `RLS_FORCE_ROLE` (whitelist regex anti-injection) per esercitare la RLS in dev/CI mentre il seeding resta privilegiato.

**Tre lezioni già pagate dalla reference, da incorporare fin dalla prima migrazione:**
1. Policy che si referenziano a vicenda → recursion 42P17. Per percorsi pubblici usare una funzione `SECURITY DEFINER ... SET row_security = off` che ritorna esattamente le righe necessarie.
2. RLS abilitata senza policy = deny-all: le tabelle non-tenant (cataloghi contenuti, config piattaforma) richiedono una policy passthrough **scoped al solo ruolo `app_rls`**.
3. Ogni NUOVA tabella tenant va tolta dal passthrough → da noi: test di enumerazione che fallisce se una tabella tenant risulta nel passthrough.

**Adattamenti nostri**: niente sottodomini (la reference risolve il tenant dal Host header; noi usiamo `activeOrganizationId` di sessione). Le GUC ci servono: `app.user_id`, `app.org_id`; la valvola `verify_uuid` della reference (verifica certificati pubblica) da noi non esiste in V1.

## 3. Guards — `src/features/auth/guards.ts`, `src/features/access/ownership.ts`, `src/proxy.ts`

Pattern a 3 livelli: proxy senza DB → layout per route-group che gate-a lato server → `require*()` in OGNI server action; ruoli letti freschi dal DB, mai dal JWT; anti-IDOR con assert di ownership dentro `withTenant` (doppia barriera: check applicativo + RLS).

**Adattamenti nostri**: ruoli = admin/collaboratore di studio (+ `company_referent` disattivato in V1); in più il layer **entitlement** (`requireEntitlement(capability)`) che la reference non ha — nasce in Fase 1 e ogni action delle fasi 4–8 lo usa dal giorno 1.

## 4. Better Auth — `src/lib/auth/index.ts`, `src/features/auth/*`

Da adottare: `additionalFields` con `input:false` per il ruolo piattaforma (non auto-assegnabile); `databaseHooks.session.create.before` per `activeOrganizationId`; org creata via insert diretto nelle stesse tabelle del plugin (deterministico); invito con seat check su invite E accept; `verifyInvitedAccount` (possesso dell'UUID invito = email verificata, salta un round-trip).

**Adattamenti nostri**: niente org "personale" B2C (da noi ogni signup crea direttamente l'org-studio in stato demo); seat limit = 5 membri da `platform_config`, non da metadata org.

## 5. Tour driver.js — `src/lib/tour/{config,registry}.ts`

Da adottare: registry ordinato `{pageId, pathPattern, start}` first-match-wins; target con attributi `data-tour`; completamento in localStorage (scelta consapevole: zero migrazioni); skip con `prefers-reduced-motion`. **Workaround bug v1.4 obbligatori**: `onCloseClick` deve chiamare `opts.driver.destroy()`; se definisci `onDestroyStarted` devi chiamare tu `destroy()` o Done/ESC/overlay smettono di funzionare.

**Adattamenti nostri**: tour per portfolio / percorso GHG / percorso bilancio, pensati per l'account demo (Fase 9).

## 6. env.ts — `src/lib/env.ts`

Da adottare: zod + tripwire server-only in cima al modulo; split required vs required-in-prod via `superRefine`; messaggio d'errore aggregato. `DATABASE_URL` (pooler 6543, ruolo `app_rls` in prod) vs `DIRECT_URL` (5432, solo migrazioni). Pool serverless: `prepare:false, max:3, idle_timeout:20`.

**Adattamenti nostri**: i nostri required-in-prod saranno Stripe/Resend/Supabase Storage (non Cloudflare Stream).

## 7. Testing — `vitest.config.ts`, `src/__tests__/*`, `playwright.config.ts`, `e2e/*`

Da adottare: tassonomia `*-pure.test.ts` / `*.db.test.ts` (DB reale self-cleaning: suffisso `Date.now()`, cleanup `afterAll`) / `*.smoke.test.ts` (self-skipping senza chiavi); `fileParallelism:false`; Playwright `workers:1` contro dev server avviato, ogni spec registra un utente nuovo via form reale e **asserisce zero errori console**.

## 8. Email — `src/lib/email/{layout,resend}.ts`

Da adottare: un solo renderer `renderEmail()` table-based inline-CSS con `esc()` obbligatorio sui valori dinamici, URL assoluti per le immagini, blocco fallback "copia questo link"; sender thin no-op senza `RESEND_API_KEY` (dev funziona senza chiavi, link loggati solo fuori produzione).

## 9. SEO/marketing — `src/app/{sitemap.ts,robots.ts,llms.txt}`, `(marketing)/*`

Da adottare: sitemap DB-driven con `.catch(()=>[])`; robots con allow esplicito per AI crawler; route `llms.txt`; helper JSON-LD; split contenuto pubblico (teaser indicizzabile) vs app autenticata.

## 10. PRE-LAUNCH — `PRE-LAUNCH.md`

Da adottare come **struttura** (non come contenuto): 10 sezioni, ogni voce = checkbox + verification step eseguibile, item fatti marcati con data, step ops-only flaggati, segreti mai in git. La nostra versione si scrive in Fase 11 con le nostre sezioni (env, RLS cutover con rollback, webhook live, backup con restore provato, GDPR/DPA).
