# DESIGN.md — registro di design vincolante ("Corporate Tech")

Fonte di verità visiva del prodotto. I token vivono in `src/app/globals.css` (variabili CSS + `@theme` Tailwind v4): **nessun colore, raggio o ombra hardcodato nei componenti** — solo token. Brief confermato dal committente (2026-07-30): sidebar scura + contenuto chiaro, Geist, tema chiaro di default, "sobrio con momenti firmati". Showcase di controllo: pagina interna `/design`.

## Direzione

Contabilità della sostenibilità, non marketing verde. L'app è uno **strumento professionale denso e silenzioso** (registro Linear/Stripe-Dashboard); il documento finale è **editoriale e ricco** (registro big-four). Il contrasto tra i due registri è il lusso. Anti-reference: famiglia calda "Ambra" di Evalis, verdi brillanti da greenwashing, template SaaS con gradient text e glassmorphism.

## Palette (token semantici, light / dark)

- **Base**: `background` near-white freddo `oklch(0.977 0.002 240)` / notte `oklch(0.175 0.018 230)`; superfici `card` bianche / `oklch(0.215 0.02 228)`.
- **Testo**: `foreground` blu-notte `oklch(0.24 0.028 240)` / `oklch(0.93 0.008 220)`; secondario `muted-foreground`.
- **Accento primario**: verde petrolio `primary oklch(0.42 0.068 185)` (dark: chiarito `0.68`). Strategia **Restrained**: azioni primarie, stati attivi, riempimenti progressi — copertura ≤10% della pagina.
- **Sidebar** (firma della shell): blu-petrolio notte `oklch(0.235 0.024 222)`, testo `oklch(0.83 0.012 220)`, voce attiva in `sidebar-primary` petrolio.
- **Stati**: `success` verde, `warning` ambra, `destructive` rosso — con varianti `-subtle` per gli sfondi.
- **Dati (grafici)** — palette dedicata, mai i colori semantici UI: `scope-1` petrolio, `scope-2` blu, `scope-3` ambra; pilastri `esg-e` verde, `esg-s` violetto, `esg-g` blu. Mappati su `chart-1..5` per Recharts. Stessa semantica in light e dark (varianti chiarite).

## Tipografia

- **Geist Sans** per tutta la UI (400/500/600); **Geist Mono** per codici (ATECO, chiavi fattori).
- **Numeri tabellari obbligatori** in tabelle e KPI: regola globale su `table` e `[data-slot="kpi"]` in globals.css.
- Scala: h1 24px semibold tracking-tight; sezioni 11px uppercase tracking-wide muted; body 14px; tabelle 13px; line-height ~1.5; testi lunghi max ~70ch.
- La **serif editoriale del documento** si sceglie in Fase 8 su prove di stampa reali (candidate: Source Serif 4, Lora).

## Spaziatura, forma, elevazione

- Scala 8pt (Tailwind standard). App **densa**: righe tabella compatte, card con padding contenuto.
- Radius: card `rounded-xl` (base `--radius` 0.625rem), controlli `rounded-md`.
- Ombre discrete e fredde: hover card `shadow-md`, mai glow colorati.
- Card solo dove sono l'affordance giusta (aziende del portafoglio, KPI, documenti). Mai card annidate.

## Motion

Sobrio: transizioni colore 150ms, hover shadow; progress animate; **niente** bounce/elastic/parallax. Rispetta sempre `prefers-reduced-motion` (i tour driver.js si auto-disattivano, Fase 9).

## Momenti firmati (dove esce la personalità)

1. **Matrice di materialità** (Fase 7): il pezzo visivo più riconoscibile del prodotto.
2. **KPI e risultati inventario** (Fase 5): grandi numeri tabellari, palette scope.
3. **Copertina e frontespizio del documento** (Fase 8).
4. **Empty state** dei percorsi: mai un vuoto grigio, sempre un invito con il passo successivo.

## Regole d'uso

- Tema: chiaro di default, dark con toggle (`next-themes`, `attribute="class"`, scelta memorizzata). Ogni componente nuovo si verifica in ENTRAMBI i temi prima del merge (checklist di fase).
- Contrasto AA minimo su testo e controlli in entrambi i temi.
- Stringhe UI in italiano; numeri/date formattati `it-IT` (centralizzare in `src/lib/format.ts` quando serve).
- Attributi `data-tour="…"` sugli elementi che i tour guidati indicheranno (Fase 9).
- Grafici: seguire la skill `dataviz` (etichette leggibili, niente legende ridondanti, dark mode verificata).
