# Politica di arrotondamento e precisione numerica

Decisioni vincolanti per il motore di calcolo (`src/lib/calc`) e per la persistenza.

## Regole

1. **Mai float nel dominio.** Le quantità, i fattori e ogni risultato viaggiano come stringhe decimali; l'aritmetica usa `decimal.js` (`src/lib/calc/shared/decimal.ts`). Le colonne DB sono `NUMERIC`.
2. **Precisione piena nei passaggi intermedi.** Il motore non arrotonda mai durante il calcolo: quadrature, medie ponderate e percentuali si calcolano sulla precisione completa.
3. **Si arrotonda solo in due punti:**
   - **presentazione** (UI/documento): tCO₂e con 1–3 decimali secondo la grandezza, percentuali con 1 decimale, formattazione `it-IT`;
   - **snapshot di pubblicazione** (Fase 8): i derivati si congelano con `toFixedStr` (max 10 decimali), che è anche l'unico punto in cui i derivati vengono scritti.
4. **Parsing input (contratto del prototipo, funzione `nz`)**: virgola → punto decimale; vuoto/non numerico/non finito → 0; il punto senza virgola è SEMPRE decimale (`"12.500"` = 12,5 — mai separatore delle migliaia); la forma italiana completa `"1.234,56"` è riconosciuta (miglioria rispetto al prototipo, che la leggeva male).
5. **Divisioni per zero**: mai eccezioni, mai NaN/Infinity. Motore GHG: intensità → `null` se il denominatore manca. Motore Bilancio: derivati → `0` (fedeltà al `derive()` del prototipo, che il documento finale mostra come "—").

## Tolleranze nei golden test

I prototipi calcolano in float IEEE-754; il motore in decimale. Per i valori derivati da moltiplicazioni/divisioni semplici i risultati coincidono esattamente (i golden usano uguaglianza di stringa). Per radici e quadrature (incertezza combinata) i golden usano `toBeCloseTo` con 1–2 decimali: la differenza float/decimale è ordini di grandezza sotto la significatività del dato (le incertezze sono stime al punto percentuale).

## Scostamenti documentati dal prototipo

| Caso | Prototipo | Motore | Motivo |
|---|---|---|---|
| `"1.234,56"` | 1,234 (bug parseFloat) | 1234,56 | forma italiana corretta |
| Intensità GHG senza denominatore | 0 | `null` | distinguere "zero" da "non calcolabile" nel documento |
| Totale avanzamento GHG | media di 7 contributi (a5 escluso) | identico | quirk conservato per fedeltà golden |

## Modulo energetico (Fase 12)

Golden di riferimento: dataset `demo()` del prototipo (`archivio/bilancio-energetico-v1.html`,
"Fonderia di esempio S.r.l."). I totali attesi sono verificabili sulla narrativa scritta dentro
il prototipo stesso: 4.531 MWh di energia finale, 642 tep, 553.640 € di spesa, 0,122 €/kWh di
costo medio, due terzi del consumo alle attività principali, consumo specifico da 2.644 a
2.449 kWh/t (miglioramento del 7,4%), programma di interventi da 656 MWh e 101 tep con
419.000 € di investimento e 93.870 €/anno di beneficio.

| Caso | Prototipo | Motore | Motivo |
|---|---|---|---|
| Teleriscaldamento e vapore acquistati | Scope 1 | **Scope 2** | Sono energia importata: categoria 2 della ISO 14064-1 e Scope 2 del GHG Protocol. Lasciarli in Scope 1 farebbe divergere il bilancio energetico dall'inventario GHG della stessa azienda, che è esattamente ciò che il collegamento fra i due percorsi deve impedire. Il golden non cambia: il dataset di riferimento non usa questi due vettori. |
| Indicatore senza denominatore | 0 | `null` | Uno zero si legge come "consumo specifico nullo", cioè un risultato eccellente, mentre il dato semplicemente manca. Il grafico di confronto con l'anno base salta l'indicatore invece di disegnarlo a fondo scala. |
| Tempo di ritorno senza risparmio economico | 0 | `null` | Uno zero si legge come "ritorno immediato", il contrario di ciò che significa. Il documento mostra "—". |
| Quadratura della ripartizione | su quantità | identico | Le celle restano nell'unità del vettore e non in kWh: la verifica confronta quantità entrate e attribuite, quindi correggere un potere calorifico non può invalidare la quadratura di un esercizio già chiuso. |
| Ricalcolo per intervento | `derive()` completo per ogni intervento | totali passati una volta | Solo prestazioni: i numeri sono identici. |

## ISO 37001 — prevenzione della corruzione (Fase D)

Due scostamenti dal prototipo `sgpc-iso37001-v1.html`, entrambi verificati leggendo il
sorgente e non ricordati, entrambi coperti da un test messo in rosso di proposito.

**1. «Non applicabile» sulle clausole contrattuali assolve l'obbligo.**
Nel prototipo l'obbligo accettava solo `"Sì"` (riga 286) mentre l'indicatore contava
`"Sì" || "Non applicabile"` (riga 1286): **lo stesso socio risultava inadempiente nella
propria scheda e adempiente nel cruscotto**. Ci si allinea all'assolvimento, che e' anche
il comportamento gia' adottato dagli altri due obblighi della stessa norma — impegni
(`"Non fattibile, motivato"`) e controlli (`"Non fattibile, valutato nel rischio"`).
«Non applicabile» e' una risposta, non un'omissione.
*Effetto sui numeri*: un socio con clausole non applicabili passa da 1 obbligo aperto a 0.

**2. La verifica di proporzionalita' del corrispettivo scatta anche dal campo strutturato.**
Il prototipo la faceva dipendere **solo** dal flag di rischio «remunerazione a provvigione
o a successo», ignorando il campo «Modalita' di remunerazione», che ha gia' le opzioni
`"A provvigione"` e `"A successo"`. Chi sceglieva la provvigione senza spuntare anche il
flag non aveva l'obbligo: **un obbligo che manca, non uno di troppo**. Ora basta uno dei
due segnali.
*Effetto sui numeri*: un socio a rischio Medio con remunerazione «A provvigione» passa da
5 obblighi applicabili a 6.

**Cio' che invece NON si tocca**, perche' sembra un difetto e non lo e':
- **La media si fa sulle sole dimensioni valutate**, non su quattro. Chi ha valutato una
  sola dimensione a 4 ottiene Critico; dividendo per quattro otterrebbe 1,0, cioe' Basso,
  e non gli si chiederebbe nemmeno la due diligence.
- **`MATRICE` a parte, un socio senza livello determinato non e' sopra soglia**: non gli si
  imputano obblighi che nessuno ha ancora stabilito.
- **`superiore()` nel prototipo restituisce la stringa vuota** quando il livello manca,
  invece di `false`. E' un artefatto di JavaScript, non una regola: normalizzato
  nell'estrazione del golden (`scripts/golden-anticorruzione.mjs`), dove si vede il perche'.
- **La verifica del corrispettivo non ammette «Non applicabile»**, a differenza delle
  clausole: l'obbligo esiste perche' il corrispettivo E' a provvigione, quindi dichiararlo
  non applicabile contraddice il proprio presupposto. Una clausola contrattuale puo'
  davvero non applicarsi; questa verifica no.
