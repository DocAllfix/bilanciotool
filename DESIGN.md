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

## Colori delle aree

> **Emendamento del 22 agosto 2026.** Questa sezione diceva **«un modulo, un colore, in
> tutto il prodotto»**, e ha retto finche' i moduli erano cinque. Il prodotto ne avra'
> undici, e **undici tinte distinguibili su due temi, tutte sopra AA, non esistono**: il
> cerchio e' gia' occupato a 190·155·68·300·250, e infilarne altre sei significherebbe
> mettere vicine coppie che nessuno separa a colpo d'occhio — cioe' perdere anche le
> cinque che oggi funzionano.
>
> La regola nuova e': **un'area un colore, un modulo un'icona.** La tinta dice la
> *materia*, l'icona dice il *percorso*. Non e' una rinuncia: un colore che distingue
> undici cose non distingue niente, mentre un colore che ne distingue cinque dice
> qualcosa ogni volta che si vede.
>
> **Le tinte non cambiano, cambia a chi appartengono.** Delle cinque, quattro restano
> dov'erano: petrolio al GHG, verde al Bilancio, violetto alla Filiera, blu ai Sistemi di
> gestione. **Un solo modulo dei cinque attuali cambia colore** — il Bilancio energetico,
> che passa dall'ambra al petrolio perche' e' della stessa materia dell'inventario GHG — e
> l'ambra resta libera per l'area della responsabilita' dell'ente (Modello 231, ISO 37001,
> Segnalazioni). Nessuna tinta nuova da inventare, nessun contrasto nuovo da verificare.

> **Aggiornamento del 25 agosto 2026 — da cinque aree a tre gruppi.** La tassonomia
> l'ha dettata il committente, e i due nomi che ha usato sono i suoi: *Ecosostenibilità*
> e *Compliance*. Il terzo raccoglie i moduli che non ha nominato e che hanno in comune
> una cosa sola ma decisiva, l'essere **certificabili da un ente terzo**.
>
> **Nessun valore cambia**: le tre tinte sono verde, ambra e blu, gli stessi `oklch` di
> prima, contrasto già verificato. Cambia solo a chi appartengono. **Petrolio e violetto
> si liberano**, e il petrolio è un guadagno vero: è l'accento del marchio, e smette di
> voler dire due cose.

Tre token, uno per **gruppo**, definiti in `globals.css` come `--area-*` ed esposti come utility Tailwind (`bg-area-ecosostenibilita`, `text-area-sistemi`, ...). Le classi pronte per i tre stati si **derivano dal gruppo** dentro il registro `src/features/companies/moduli.ts` e non si scrivono a mano nelle voci: due moduli della stessa materia non possono divergere per una svista di copia.

⚠️ **E non si scrivono a mano nemmeno nei componenti di modulo.** Quindici lo facevano, e alla rinomina dei gruppi quei riquadri sarebbero rimasti senza fondo: il compilatore non lo vede (una stringa è valida), Tailwind non protesta (per un token inesistente non genera niente), i collaudi funzionali non lo vedono (la pagina si apre). Lo vede il cliente. La guardia è `src/__tests__/classi-area-pure.test.ts`, che confronta le classi usate nel sorgente coi token definiti in `globals.css`.

| Gruppo | Moduli | Tinta | Chiaro | Scuro |
|---|---|---|---|---|
| Ecosostenibilità | Inventario GHG · Bilancio energetico · Bilancio ESG · Autovalutazione ESG | verde | `oklch(0.48 0.12 155)` | `oklch(0.74 0.12 155)` |
| Compliance | Modello 231 · ISO 37001 · Segnalazioni · Due diligence di filiera | ambra | `oklch(0.55 0.115 68)` | `oklch(0.78 0.11 72)` |
| Sistemi di gestione | SGI QAS · SA8000/2026 · Dichiarazione SoA | blu | `oklch(0.49 0.09 250)` | `oklch(0.72 0.095 250)` |

*(Le colonne «Moduli» elencano anche i sei in arrivo: l'area esiste gia', il modulo si aggiunge al registro.)*

**Perche token propri e non riuso di `--scope-*` / `--esg-*`**: quelli hanno gia un significato dentro i grafici (Scope 2, pilastro sociale). La stessa tinta non puo voler dire due cose diverse nello stesso prodotto. Stessa famiglia di tinte per coerenza visiva, valori separati per poter divergere senza rompere la dataviz.

**I tre stati** in cui il colore compare, sempre gli stessi:
- **pubblicato** — fondo pieno nel colore dell'area, icona in negativo (`colore.pieno`);
- **in corso** — contorno e fondo tenui, icona a colore (`colore.tenue`);
- **da avviare** — contorno tratteggiato grigio, icona spenta: **nessun colore di modulo**, perche il colore significa «questo percorso esiste».

**Contrasto verificato** su entrambi i temi: bianco su fondo pieno da 4,97 a 7,19 nel tema chiaro; colore su fondo scuro da 7,44 a 9,06. Tutti sopra AA.
