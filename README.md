# EvalisDeck

Suite di rendicontazione ESG per studi di consulenza. Un tenant è uno **studio**, che
segue un portafoglio di **aziende clienti**; per ciascuna produce cinque documenti:

| Documento | Norma | Cadenza |
|---|---|---|
| Rapporto GHG | ISO 14064-1 | annuale |
| Bilancio di sostenibilità e conformità ESG | GRI · ESRS/VSME | annuale |
| Bilancio energetico | UNI CEI EN 16247 | annuale |
| Attestato ESG fornitore | autovalutazione | a revisioni |
| Statement of Applicability (SoA) | ISO/IEC 27001:2022 | a revisioni |

L'inventario GHG alimenta la sezione emissioni del bilancio: **la fonte è una sola**, le
emissioni non si ricopiano.

In produzione su **https://evalisdeck.it**.

## Avvio

```bash
cp .env.example .env     # poi riempi i valori (i sei marcati OBBLIGATORIA IN PROD)
npm install
npm run db:migrate       # migrazioni: usano DIRECT_URL, mai il pooler
npm run db:seed          # cataloghi metodologici (idempotente)
npm run dev
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` · `build` · `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` — nessun errore ammesso |
| `npm run test` | Vitest. I `*.db` si saltano da soli senza `DATABASE_URL` |
| `RLS_FORCE_ROLE=app_rls npm run test` | La stessa suite col ruolo ristretto, **come gira la produzione** |
| `npm run test:e2e` | Playwright (richiede `npm run dev` attivo) |
| `npm run qa` | Elenca i collaudi. `npm run qa -- invito`, `-- rinnovo`, `… --prod` |
| `npm run db:generate` · `db:migrate` · `db:studio` | Drizzle |
| `npm run db:seed` | Semina i cataloghi |
| `npm run db:extract-seed` | Rigenera i JSON di seed dai prototipi in `archivio/` |

⚠️ `npm start` **non rilegge il sorgente**: carica il build all'avvio. Un server acceso
prima di una modifica serve il codice di prima, senza dirlo.

## Com'è fatto

Next.js App Router · TypeScript · Drizzle · PostgreSQL (Supabase) · Better Auth ·
Stripe · Tailwind v4 · shadcn/ui · Resend · Sentry. Ospitato su Vercel.

- `src/features/<dominio>/` — la logica: `ghg`, `report`, `energy`, `supplier`, `soa`,
  più `billing`, `documents`, `condivisione`, `auth`, `entitlement`.
- `src/lib/calc/` — i motori di calcolo, **funzioni pure e testate**: il browser mostra
  le anteprime con le stesse funzioni che usa il server, così non possono divergere.
- `src/lib/db/` — schema per dominio, migrazioni, seed.
- `scripts/` — collaudi (`verifica-*`, `visual-check-*`, scoperti da `npm run qa`) e
  utensili che si chiamano per nome (`seed`, `stripe-bootstrap`, `prepara-brand`).

**Isolamento fra studi a due strati**: ogni query passa da `withTenant`, che imposta le
GUC lette dalle policy RLS; e ogni `select` porta comunque il proprio filtro
`organization_id`. In produzione la connessione è `app_rls`, senza `BYPASSRLS`: se una
query dimentica `withTenant`, in sviluppo funziona e in produzione non vede niente.

## Dove sta il resto

- **[CLAUDE.md](CLAUDE.md)** — direttive operative, storia delle fasi e le regole nate
  dagli errori. È il documento più aggiornato del progetto.
- **[PRE-LAUNCH.md](PRE-LAUNCH.md)** — lista di controllo per il primo cliente pagante:
  ogni voce ha un **modo di verificarla**, e in testa c'è quale voce diventa urgente quando.
- **[DESIGN.md](DESIGN.md)** — token, palette, direzione visiva.
- **[docs/](docs/)** — politica di arrotondamento, formato d'export dei prototipi, note
  sui pattern e sul blog headless.

Repository privata. © Evalis Srl.
