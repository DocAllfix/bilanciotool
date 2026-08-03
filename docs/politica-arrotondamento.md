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
