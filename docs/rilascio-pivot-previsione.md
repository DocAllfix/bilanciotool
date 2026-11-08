# Rilascio del pivot: la previsione, scritta prima

Una previsione scritta prima vale più di una verifica fatta dopo: guardare i numeri e trovarli
ragionevoli non è la stessa cosa che vederli coincidere con una lista scritta quando ancora non
si sapeva. Metodo in `docs/metodo-rilascio.md`.

## Lo stato della produzione, chiesto in sola lettura il 6 novembre 2026

- 72 migrazioni applicate (`0000`÷`0071`). Manca solo la `0072`.
- 16 organizzazioni. Attive: 1 `enterprise`, 1 `studio`, 1 `studio_plus`, 1 `singola`, 1 senza piano;
  11 in demo.
- **Un solo abbonamento Stripe vivo**: la fascia `singola`, con lo Schedule a due fasi. È il
  collaudo da 3,50 € del 22 settembre. Gli altri attivi sono attivazioni a mano, senza Stripe.

## Che cosa deve restare identico

- Le capacità di tutti e cinque i conti attivi: nessuna scende (`listino-storico-pure`).
- `capacitaDaAbbonamento` riconosce ancora `evalisdeck_singola_anno1_v1` e `_rinnovo_v1`.
- Lo Schedule già esistente non si tocca: Stripe lo porta a termine da solo.

## L'ordine, che non si inverte

1. **Prezzi vivi** su Stripe, verificando prima l'account (`acct_1U3GxS…`): 6 prezzi nuovi
   (`azienda`, `studio`, `studio_plus`, ciascuno annuale e mensile), IVA esclusa. Senza, `idPrezzo`
   non risolve e nessuno può comprare.
2. **Migrazione `0072`** sulla produzione, con la guardia vista rifiutarsi prima dell'override.
   Senza, `applicaAbbonamento` scrive colonne che non esistono e il webhook di chi ha appena pagato
   risponde 500.
3. **Fusione** su `main`, come un commit solo.

## La previsione, da confrontare dopo la migrazione

Letti come `app_rls`, in una transazione di sola lettura:

| Domanda | Atteso |
|---|---|
| Migrazioni registrate | 73 |
| Tabelle senza RLS | 0 |
| `org_entitlement.periodo` diverso da null, prima di qualunque nuovo evento | 0 righe |
| `org_entitlement.disdetta_a_fine_periodo = true` | 0 righe |
| Organizzazioni | 16, o più se nel frattempo qualcuno si è iscritto |
| Vincolo `org_entitlement_periodo_ck`, con `'trimestre'` in transazione annullata | respinto |

Su Stripe vivo, dopo il punto 1:

| Chiave | Importo | Intervallo |
|---|---|---|
| `evalisdeck_azienda_anno_v2` | 49900 | year |
| `evalisdeck_azienda_mese_v1` | 5900 | month |
| `evalisdeck_studio_anno_v3` | 129900 | year |
| `evalisdeck_studio_mese_v1` | 14900 | month |
| `evalisdeck_studio_plus_anno_v3` | 199000 | year |
| `evalisdeck_studio_plus_mese_v1` | 22900 | month |

Tutti `eur`, `tax_behavior: exclusive`, attivi.

## Dopo la fusione, in sola lettura sul sito vero

`tutto-pubblico`, `sitemap`, `legale`, `csp`, `consenso`, `pagine-percorso`.

## Prima di rilasciare, da decidere o rifare

- `AGGIORNATO_AL` in `src/lib/legale.ts` alla data del rilascio.
- Rileggere con un legale `docs/fonti-vetrina.md`, in particolare la voce sulla CSRD dopo l'Omnibus.
- Disdire l'abbonamento di collaudo da 3,50 €, che altrimenti si rinnova a 280 € il 22 settembre 2027.
