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
